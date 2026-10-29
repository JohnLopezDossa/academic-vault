-- Private Storage access for Academic Vault.
-- Apply only after reviewing and testing in a disposable Supabase project.
-- This migration does not create or make the bucket public and does not grant
-- broad privileges on storage.objects.

begin;

do $preflight$
declare
  v_mime_types text[];
  v_operation_result text;
begin
  if not exists (
    select 1
    from storage.buckets b
    where b.id = 'academic-resources'
      and b.public is false
      and b.file_size_limit = 20971520
  ) then
    raise exception 'Expected private academic-resources bucket with a 20 MiB limit';
  end if;

  select b.allowed_mime_types into v_mime_types
  from storage.buckets b
  where b.id = 'academic-resources';

  if v_mime_types is null or not (v_mime_types @> array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]::text[]) then
    raise exception 'academic-resources is missing one or more required MIME types';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on storage.objects';
  end if;

  if to_regprocedure('storage.allow_only_operation(text)') is null then
    raise exception 'storage.allow_only_operation(text) is missing';
  end if;

  select pg_catalog.pg_get_function_result(
    to_regprocedure('storage.allow_only_operation(text)')
  ) into v_operation_result;

  if v_operation_result <> 'boolean' then
    raise exception 'storage.allow_only_operation(text) must return boolean; found %', v_operation_result;
  end if;

  if to_regprocedure('private.has_permission(text)') is null then
    raise exception 'private.has_permission(text) is missing';
  end if;

  if not has_table_privilege('anon', 'storage.objects', 'SELECT')
     or not has_table_privilege('authenticated', 'storage.objects', 'SELECT')
     or not has_table_privilege('authenticated', 'storage.objects', 'INSERT')
     or not has_table_privilege('authenticated', 'storage.objects', 'DELETE') then
    raise exception 'Required existing Storage SELECT/INSERT/DELETE grants are missing';
  end if;

  if not has_table_privilege('anon', 'public.resources', 'SELECT')
     or not has_table_privilege('authenticated', 'public.resources', 'SELECT')
     or not has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     or not has_table_privilege('authenticated', 'public.resource_batches', 'SELECT')
     or not has_table_privilege('authenticated', 'public.resource_batches', 'INSERT')
     or not has_table_privilege('authenticated', 'public.resources', 'INSERT')
     or not has_table_privilege('authenticated', 'public.resources', 'DELETE') then
    raise exception 'Required existing public table SELECT grants are missing';
  end if;

  if not has_function_privilege('authenticated', 'private.has_permission(text)', 'EXECUTE') then
    raise exception 'authenticated cannot execute private.has_permission(text)';
  end if;

  -- Compare the stored SQL source, not just SECURITY DEFINER/search_path. prosrc
  -- is PostgreSQL's stored body for this AS $$...$$ SQL function. Whitespace
  -- runs are normalized to tolerate line-ending/indent changes while retaining
  -- token boundaries. Language, return type, stability and definer settings are
  -- checked separately. Any semantic/body change fails closed.
  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_language l on l.oid = p.prolang
    where p.oid = to_regprocedure('private.has_permission(text)')
      and l.lanname = 'sql'
      and p.prokind = 'f'
      and p.prorettype = 'pg_catalog.bool'::pg_catalog.regtype
      and p.provolatile = 's'
      and p.prosecdef
      and coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
      and pg_catalog.btrim(pg_catalog.regexp_replace(p.prosrc, '[[:space:]]+', ' ', 'g')) =
          pg_catalog.btrim(pg_catalog.regexp_replace($expected_has_permission$
            select exists (
              select 1
              from public.profiles as profile
              where profile.id = auth.uid()
                and (
                  profile.role = 'admin'::public.profile_role
                  or (
                    profile.role = 'sub_admin'::public.profile_role
                    and case p_permission
                      when 'upload' then profile.can_upload
                      when 'review' then profile.can_review
                      when 'manage_resources' then profile.can_manage_resources
                      else false
                    end
                  )
                )
            );
          $expected_has_permission$, '[[:space:]]+', ' ', 'g'))
  ) then
    raise exception 'private.has_permission(text) does not match the expected core authorization implementation';
  end if;

  if to_regprocedure('public.review_resource(uuid,public.resource_status,text)') is null then
    raise exception 'Existing public.review_resource(uuid, resource_status, text) is missing';
  end if;

  if exists (
    select 1
    from (values
      ('public', 'resources'),
      ('public', 'profiles'),
      ('public', 'resource_batches')
    ) as required_table(schema_name, table_name)
    where not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = required_table.schema_name
        and c.relname = required_table.table_name
        and c.relrowsecurity
    )
  ) then
    raise exception 'RLS must remain enabled on resources, profiles and resource_batches';
  end if;

  if exists (
    select 1
    from (values
      ('public', 'resources', 'resources_read_approved_public'),
      ('public', 'resources', 'resources_read_authenticated'),
      ('public', 'resources', 'resources_insert_owner'),
      ('public', 'resources', 'resources_delete_owner_pending_or_manager'),
      ('public', 'profiles', 'profiles_select_self_or_admin'),
      ('public', 'resource_batches', 'batches_read_owner_or_staff'),
      ('public', 'resource_batches', 'batches_insert_self')
    ) as required_policy(schema_name, table_name, policy_name)
    where not exists (
      select 1 from pg_catalog.pg_policies p
      where p.schemaname = required_policy.schema_name
        and p.tablename = required_policy.table_name
        and p.policyname = required_policy.policy_name
    )
  ) then
    raise exception 'A required existing resources/profiles/batches RLS policy is missing';
  end if;

  -- Policies are permissive by default. Stop if an unknown policy might
  -- broaden access, including a policy created for another bucket.
  -- The check below allowlists policy names only. The four Academic Vault
  -- Storage policies are dropped and recreated with the definitions in this
  -- migration. Before applying in an environment where any of those names
  -- already exist, inspect their pg_policies qual/with_check definitions and
  -- compare them with this migration; this preflight does not fingerprint them.
  if exists (
    select 1 from pg_catalog.pg_policies p
    where p.schemaname = 'storage'
      and p.tablename = 'objects'
      and p.policyname not in (
        'academic_resources_sign_approved_anon',
        'academic_resources_sign_authorized_authenticated',
        'academic_resources_upload_owner_pending',
        'academic_resources_delete_pending_owner_or_manager'
      )
  ) then
    raise exception 'Unexpected storage.objects policy exists; review all policies before continuing';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'resource_batches'
      and p.cmd in ('DELETE', 'ALL')
      and p.policyname <> 'academic_resources_delete_empty_own_batch'
  ) then
    raise exception 'Unexpected resource_batches DELETE policy exists; review before enabling owner cleanup';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('resources', 'profiles', 'resource_batches')
      and p.policyname not in (
        'resources_read_approved_public',
        'resources_read_authenticated',
        'resources_insert_owner',
        'resources_update_owner_or_manager',
        'resources_delete_owner_pending_or_manager',
        'profiles_select_self_or_admin',
        'profiles_update_self_or_admin',
        'profiles_insert_self_student',
        'batches_read_owner_or_staff',
        'batches_insert_self',
        'academic_resources_delete_empty_own_batch'
      )
  ) then
    raise exception 'Unexpected resources/profiles/resource_batches policy exists; review before continuing';
  end if;
end
$preflight$;

-- Only authenticated owners may delete a batch after its pending resource rows
-- and objects have been cleaned up. This narrowly scoped grant supports the
-- upload UI's explicit incomplete-batch cleanup action.
grant delete on table public.resource_batches to authenticated;
drop policy if exists academic_resources_delete_empty_own_batch on public.resource_batches;
create policy academic_resources_delete_empty_own_batch
on public.resource_batches
for delete
to authenticated
using (
  uploaded_by = (select auth.uid())
  and not exists (
    select 1 from public.resources r where r.batch_id = resource_batches.id
  )
);

-- These exact, allowlisted names are replaced. Unknown policy names are never
-- dropped; the preflight above aborts if any are present.
drop policy if exists academic_resources_sign_approved_anon on storage.objects;
drop policy if exists academic_resources_sign_authorized_authenticated on storage.objects;
drop policy if exists academic_resources_upload_owner_pending on storage.objects;
drop policy if exists academic_resources_delete_pending_owner_or_manager on storage.objects;

-- Supabase signed-URL creation uses the storage.object.sign operation. The
-- operation-aware predicate prevents this SELECT policy from permitting list.
create policy academic_resources_sign_approved_anon
on storage.objects
for select
to anon
using (
  bucket_id = 'academic-resources'
  and storage.allow_only_operation('storage.object.sign')
  and exists (
    select 1 from public.resources r
    where r.storage_path = storage.objects.name
      and r.status = 'approved'::public.resource_status
  )
);

create policy academic_resources_sign_authorized_authenticated
on storage.objects
for select
to authenticated
using (
  bucket_id = 'academic-resources'
  and storage.allow_only_operation('storage.object.sign')
  and exists (
    select 1 from public.resources r
    where r.storage_path = storage.objects.name
      and (
        r.status = 'approved'::public.resource_status
        or r.uploader_id = (select auth.uid())
        or (select private.has_permission('review'))
        or (select private.has_permission('manage_resources'))
      )
  )
);

-- Exact storage key: <uploader UUID>/<resource UUID>/<resource UUID>.<extension>
-- The matching pending row must exist before a file can be uploaded.
create policy academic_resources_upload_owner_pending
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'academic-resources'
  and exists (
    select 1 from public.resources r
    where r.storage_path = storage.objects.name
      and r.uploader_id = (select auth.uid())
      and r.status = 'pending'::public.resource_status
      and storage.objects.name =
        r.uploader_id::text || '/' || r.id::text || '/' ||
        r.id::text || '.' || r.file_extension
      and (
        (select private.has_permission('upload'))
        or exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role = 'student'::public.profile_role
        )
      )
  )
);

-- A student's own pending objects are deletable for retry/cleanup. Review
-- capability alone does not authorize deletion; management capability does.
create policy academic_resources_delete_pending_owner_or_manager
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'academic-resources'
  and exists (
    select 1 from public.resources r
    where r.storage_path = storage.objects.name
      and storage.objects.name =
        r.uploader_id::text || '/' || r.id::text || '/' ||
        r.id::text || '.' || r.file_extension
      and (
        (
          r.uploader_id = (select auth.uid())
          and r.status = 'pending'::public.resource_status
        )
        or (select private.has_permission('manage_resources'))
      )
  )
);

commit;
