import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';

const BUCKET = 'academic-resources';
const MIME = 'text/plain';
const EXTENSION = 'txt';
const CONFIRMATION = 'DISPOSABLE_TEST_PROJECT_ONLY';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const testUrl = required('SUPABASE_TEST_URL');
const publishableKey = required('SUPABASE_TEST_PUBLISHABLE_KEY');
const serviceRoleKey = required('SUPABASE_TEST_SERVICE_ROLE_KEY');
const testProjectRef = required('SUPABASE_TEST_PROJECT_REF');
const productionProjectRef = required('SUPABASE_PRODUCTION_PROJECT_REF');
if (required('SUPABASE_TEST_CONFIRM') !== CONFIRMATION) {
  throw new Error(`Set SUPABASE_TEST_CONFIRM=${CONFIRMATION} to proceed.`);
}
if (testProjectRef === productionProjectRef) {
  throw new Error('Test and production project references must be different.');
}
const hostname = new URL(testUrl).hostname;
if (hostname !== `${testProjectRef}.supabase.co`) {
  throw new Error('SUPABASE_TEST_URL does not match SUPABASE_TEST_PROJECT_REF.');
}

const publicClient = createClient(testUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
// This client is used only by this Node.js fixture/cleanup script. Never import
// this file into browser code or commit a key value.
const admin = createClient(testUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const runId = randomUUID();
const password = `${randomBytes(32).toString('base64url')}Aa1!`;
const users = {};
const resources = [];
const batchIds = [];
const objectPaths = new Set();
const results = [];
let courseId;

function report(name, passed, detail = '') {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function test(name, fn) {
  try {
    await fn();
    report(name, true);
  } catch (error) {
    report(name, false, error instanceof Error ? error.message : String(error));
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function must(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

async function makeUser(label, profile) {
  const email = `storage-${label}-${runId}@example.com`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `Storage test ${label}` },
  });
  const user = await must(created, `Create ${label} test user`);
  users[label] = { id: user.user.id, email };

  const profileRow = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.user.id)
    .maybeSingle();
  await must(profileRow, `Read ${label} profile`);
  assert(profileRow.data, `Profile trigger did not create ${label} profile`);

  if (profile.role !== 'student') {
    await must(
      await admin.from('profiles').update(profile).eq('id', user.user.id),
      `Set ${label} test permissions`,
    );
  }

  const client = createClient(testUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  await must(signedIn, `Sign in ${label} test user`);
  return { ...users[label], client };
}

async function makeBatch(uploaderId) {
  const row = await admin
    .from('resource_batches')
    .insert({ course_id: courseId, uploaded_by: uploaderId })
    .select('id')
    .single();
  const data = await must(row, 'Create resource batch fixture');
  batchIds.push(data.id);
  return data.id;
}

async function makeResource(owner, batchId, label, status = 'pending') {
  const id = randomUUID();
  const path = `${owner.id}/${id}/${id}.${EXTENSION}`;
  const row = {
    id,
    batch_id: batchId,
    course_id: courseId,
    uploader_id: owner.id,
    title: `Storage test ${label}`,
    category: 'lecture_notes',
    file_name: `${label}.txt`,
    file_extension: EXTENSION,
    mime_type: MIME,
    file_size_bytes: Buffer.byteLength(`fixture:${label}`),
    storage_path: path,
    status,
    published_at: status === 'approved' ? new Date().toISOString() : null,
  };
  await must(await admin.from('resources').insert(row), `Create ${label} resource`);
  resources.push(id);
  return { id, path, ownerId: owner.id, label, status };
}

async function seedObject(resource) {
  const body = Buffer.from(`Academic Vault disposable Storage fixture: ${resource.label}`);
  await must(
    await admin.storage.from(BUCKET).upload(resource.path, body, {
      contentType: MIME,
      upsert: false,
    }),
    `Seed ${resource.label} object`,
  );
  objectPaths.add(resource.path);
}

async function objectExists(path) {
  const split = path.lastIndexOf('/');
  const folder = path.slice(0, split);
  const filename = path.slice(split + 1);
  const listed = await admin.storage.from(BUCKET).list(folder, {
    limit: 100,
    search: filename,
  });
  if (listed.error) throw new Error(`Verify object state: ${listed.error.message}`);
  return (listed.data ?? []).some((item) => item.name === filename);
}

async function expectStorageDenied(operation, name) {
  const result = await operation();
  assert(result.error, `${name} unexpectedly returned success`);
}

async function cleanup() {
  const failures = [];
  const paths = [...objectPaths];
  if (paths.length) {
    const removed = await admin.storage.from(BUCKET).remove(paths);
    if (removed.error) failures.push(`remove objects: ${removed.error.message}`);
  }

  if (resources.length) {
    const deleted = await admin.from('resources').delete().in('id', resources);
    if (deleted.error) failures.push(`delete resources: ${deleted.error.message}`);
  }
  if (batchIds.length) {
    const deleted = await admin.from('resource_batches').delete().in('id', batchIds);
    if (deleted.error) failures.push(`delete batches: ${deleted.error.message}`);
  }
  if (courseId) {
    const deleted = await admin.from('courses').delete().eq('id', courseId);
    if (deleted.error) failures.push(`delete course: ${deleted.error.message}`);
  }
  for (const user of Object.values(users)) {
    const deleted = await admin.auth.admin.deleteUser(user.id);
    if (deleted.error) failures.push(`delete test user ${user.id}: ${deleted.error.message}`);
  }

  if (failures.length) {
    report('Fixture cleanup', false, failures.join('; '));
  } else {
    report('Fixture cleanup', true);
  }
}

async function main() {
  const bucketResult = await admin.storage.getBucket(BUCKET);
  const bucket = await must(bucketResult, `Read ${BUCKET} bucket settings`);
  assert(bucket.public === false, `${BUCKET} must remain private`);
  assert(Number(bucket.file_size_limit) === 20971520, 'Bucket must have a 20 MiB file limit');
  const requiredMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];
  assert(
    requiredMimes.every((mime) => (bucket.allowed_mime_types ?? []).includes(mime)),
    'Bucket is missing one or more of the six required MIME types',
  );
  report('Test project bucket preflight (private, 20 MiB, six MIME types)', true);

  const student = await makeUser('student', { role: 'student' });
  const uploadSubadmin = await makeUser('upload-subadmin', {
    role: 'sub_admin', can_upload: true, can_review: false, can_manage_resources: false,
  });
  const reviewSubadmin = await makeUser('review-subadmin', {
    role: 'sub_admin', can_upload: false, can_review: true, can_manage_resources: false,
  });
  const managerSubadmin = await makeUser('manager-subadmin', {
    role: 'sub_admin', can_upload: false, can_review: false, can_manage_resources: true,
  });

  const course = await admin.from('courses').insert({
    course_code: `STG-${runId.slice(0, 8)}`,
    title: 'Disposable Storage Integration Test',
    academic_level: 'level_100',
    semester: 'semester_1',
    created_by: student.id,
  }).select('id').single();
  courseId = (await must(course, 'Create test course')).id;

  const studentBatch = await makeBatch(student.id);
  const approved = await makeResource(student, studentBatch, 'approved', 'approved');
  const pending = await makeResource(student, studentBatch, 'pending', 'pending');
  const rejected = await makeResource(student, studentBatch, 'rejected', 'rejected');
  const studentUpload = await makeResource(student, studentBatch, 'student-upload', 'pending');
  await seedObject(approved);
  await seedObject(pending);
  await seedObject(rejected);

  const uploadBatch = await makeBatch(uploadSubadmin.id);
  const uploadPending = await makeResource(uploadSubadmin, uploadBatch, 'upload-subadmin-upload');
  const reviewBatch = await makeBatch(reviewSubadmin.id);
  const reviewPending = await makeResource(reviewSubadmin, reviewBatch, 'review-subadmin-pending');
  await seedObject(reviewPending);
  const managerBatch = await makeBatch(managerSubadmin.id);
  const managerPending = await makeResource(managerSubadmin, managerBatch, 'manager-subadmin-pending');
  const managerDeleteResource = await makeResource(student, studentBatch, 'manager-delete-student-pending');
  await seedObject(managerDeleteResource);

  await test('Anonymous resource catalogue exposes only approved fixture rows', async () => {
    const result = await publicClient.from('resources').select('id, status').in('id', [approved.id, pending.id, rejected.id]);
    const rows = await must(result, 'Read public resource catalogue');
    assert(rows.length === 1 && rows[0].id === approved.id && rows[0].status === 'approved', 'Catalogue returned pending/rejected rows or omitted the approved row');
  });

  await test('Anonymous signed URL: approved object is allowed and fetchable', async () => {
    const signed = await publicClient.storage.from(BUCKET).createSignedUrl(approved.path, 60);
    const data = await must(signed, 'Sign approved object anonymously');
    assert(data.signedUrl, 'No signed URL returned');
    const response = await fetch(data.signedUrl);
    assert(response.ok, `Signed URL fetch returned HTTP ${response.status}`);
    const text = await response.text();
    assert(text.includes('approved'), 'Signed URL returned unexpected fixture contents');
  });

  await test('Anonymous signed URLs: pending and rejected objects are denied', async () => {
    await expectStorageDenied(
      () => publicClient.storage.from(BUCKET).createSignedUrl(pending.path, 60),
      'Pending signing',
    );
    await expectStorageDenied(
      () => publicClient.storage.from(BUCKET).createSignedUrl(rejected.path, 60),
      'Rejected signing',
    );
  });

  await test('Anonymous direct downloads: approved, pending and rejected are denied', async () => {
    for (const resource of [approved, pending, rejected]) {
      await expectStorageDenied(
        () => publicClient.storage.from(BUCKET).download(resource.path),
        `Anonymous direct download of ${resource.status}`,
      );
    }
  });

  await test('Anonymous listing cannot reveal resource object names', async () => {
    const checks = [
      publicClient.storage.from(BUCKET).list(''),
      publicClient.storage.from(BUCKET).list(`${student.id}/${approved.id}`),
    ];
    for (const result of await Promise.all(checks)) {
      if (result.error) continue;
      const names = (result.data ?? []).map((item) => item.name);
      assert(!names.some((name) => name.endsWith('.txt')), `Listing exposed file names: ${names.join(', ')}`);
    }
  });

  await test('Student can upload to their own canonical pending path', async () => {
    const result = await student.client.storage.from(BUCKET).upload(
      studentUpload.path,
      Buffer.from('student upload fixture'),
      { contentType: MIME, upsert: false },
    );
    await must(result, 'Student upload');
    objectPaths.add(studentUpload.path);
    assert(await objectExists(studentUpload.path), 'Uploaded student object not found');
  });

  await test('Student cannot upload to another user or a noncanonical path', async () => {
    await expectStorageDenied(
      () => student.client.storage.from(BUCKET).upload(
        uploadPending.path,
        Buffer.from('another user path must fail'),
        { contentType: MIME, upsert: false },
      ),
      'Student upload to another user path',
    );
    assert(!(await objectExists(uploadPending.path)), 'Student wrote to another user path');

    const wrongPath = `${student.id}/${randomUUID()}/${randomUUID()}.txt`;
    await expectStorageDenied(
      () => student.client.storage.from(BUCKET).upload(wrongPath, Buffer.from('wrong path'), {
        contentType: MIME, upsert: false,
      }),
      'Student wrong-path upload',
    );
    assert(!(await objectExists(wrongPath)), 'Wrong-path object was created');
  });

  await test('Student can delete own pending object but cannot delete approved object', async () => {
    const removed = await student.client.storage.from(BUCKET).remove([studentUpload.path]);
    await must(removed, 'Delete own pending object');
    assert(!(await objectExists(studentUpload.path)), 'Student pending object still exists');
    objectPaths.delete(studentUpload.path);

    const denied = await student.client.storage.from(BUCKET).remove([approved.path]);
    if (denied.error) {
      assert(await objectExists(approved.path), 'Approved object unexpectedly disappeared');
      return;
    }
    assert(await objectExists(approved.path), 'Student deleted an approved object');
  });

  await test('Student cannot delete another uploader pending object', async () => {
    const denied = await student.client.storage.from(BUCKET).remove([reviewPending.path]);
    if (denied.error) {
      assert(await objectExists(reviewPending.path), 'Another uploader object unexpectedly disappeared');
      return;
    }
    assert(await objectExists(reviewPending.path), 'Student deleted another uploader pending object');
  });

  await test('Upload-enabled sub-admin can upload their own pending resource', async () => {
    const result = await uploadSubadmin.client.storage.from(BUCKET).upload(
      uploadPending.path,
      Buffer.from('upload-enabled sub-admin fixture'),
      { contentType: MIME, upsert: false },
    );
    await must(result, 'Upload-enabled sub-admin upload');
    objectPaths.add(uploadPending.path);
    assert(await objectExists(uploadPending.path), 'Sub-admin object not found');
  });

  await test('Review-only sub-admin can review-sign another uploader pending file, but cannot upload', async () => {
    const signed = await reviewSubadmin.client.storage.from(BUCKET).createSignedUrl(pending.path, 60);
    const signedData = await must(signed, 'Review-only signed URL for pending file');
    assert(signedData.signedUrl, 'Review-only sub-admin received no signed URL');

    await expectStorageDenied(
      () => reviewSubadmin.client.storage.from(BUCKET).upload(
        reviewPending.path,
        Buffer.from('review-only upload must fail'),
        { contentType: MIME, upsert: false },
      ),
      'Review-only sub-admin upload',
    );
    assert(!(await objectExists(reviewPending.path)), 'Review-only sub-admin created an object');
  });

  await test('Review-only sub-admin cannot delete; resource manager can delete', async () => {
    const reviewDelete = await reviewSubadmin.client.storage.from(BUCKET).remove([pending.path]);
    if (!reviewDelete.error) {
      assert(await objectExists(pending.path), 'Review-only sub-admin deleted a pending object');
    } else {
      assert(await objectExists(pending.path), 'Student pending object unexpectedly disappeared');
    }

    const managerDelete = await managerSubadmin.client.storage.from(BUCKET).remove([managerDeleteResource.path]);
    if (managerDelete.error) throw new Error(`Manager delete denied: ${managerDelete.error.message}`);
    assert(!(await objectExists(managerDeleteResource.path)), 'Resource manager did not delete the object');
    objectPaths.delete(managerDeleteResource.path);
  });

  await test('Resource-manager sub-admin does not gain upload permission implicitly', async () => {
    await expectStorageDenied(
      () => managerSubadmin.client.storage.from(BUCKET).upload(
        managerPending.path,
        Buffer.from('manager upload must fail without can_upload'),
        { contentType: MIME, upsert: false },
      ),
      'Resource-manager sub-admin upload without can_upload',
    );
    assert(!(await objectExists(managerPending.path)), 'Manager uploaded without upload permission');
  });

  await test('Upload-only sub-admin cannot sign another uploader pending file', async () => {
    await expectStorageDenied(
      () => uploadSubadmin.client.storage.from(BUCKET).createSignedUrl(pending.path, 60),
      'Upload-only sub-admin signing another user pending file',
    );
  });
}

try {
  await main();
} catch (error) {
  report('Test setup/execution', false, error instanceof Error ? error.message : String(error));
} finally {
  await cleanup();
}

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length} passed; ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
