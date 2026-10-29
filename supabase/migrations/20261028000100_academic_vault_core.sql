-- Academic Vault core schema and authorization policies.
-- This migration is reviewed source only. Apply it manually after review.
-- No storage bucket is created by this migration.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.academic_level as enum ('level_100', 'level_200', 'level_300', 'level_400');
create type public.academic_semester as enum ('semester_1', 'semester_2');
create type public.profile_role as enum ('student', 'sub_admin', 'admin');
create type public.resource_status as enum ('pending', 'approved', 'rejected');
create type public.resource_category as enum ('lecture_notes', 'past_questions', 'assignments', 'slides', 'textbooks', 'other');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  role public.profile_role not null default 'student',
  can_upload boolean not null default false,
  can_review boolean not null default false,
  can_manage_resources boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_privileges_require_sub_admin check (
    role in ('admin', 'sub_admin') or not (can_upload or can_review or can_manage_resources)
  ),
  constraint profiles_admin_uses_role_not_grants check (
    role <> 'admin' or not (can_upload or can_review or can_manage_resources)
  )
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null check (char_length(btrim(course_code)) between 1 and 40),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  academic_level public.academic_level not null,
  semester public.academic_semester not null,
  description text check (description is null or char_length(description) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_identity_unique unique (course_code, academic_level, semester)
);

create table public.resource_batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint resource_batches_identity_unique unique (id, course_id, uploaded_by)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  course_id uuid not null references public.courses (id) on delete restrict,
  uploader_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  category public.resource_category not null,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  file_extension text not null check (file_extension in ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt')),
  mime_type text check (mime_type is null or char_length(mime_type) <= 150),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 20971520),
  storage_path text not null unique check (char_length(btrim(storage_path)) between 1 and 1024),
  status public.resource_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint resources_batch_matches_course_and_uploader
    foreign key (batch_id, course_id, uploader_id)
    references public.resource_batches (id, course_id, uploaded_by)
    on delete restrict,
  constraint resources_published_timestamp_matches_status check (
    (status = 'approved' and published_at is not null)
    or (status <> 'approved' and published_at is null)
  )
);

create table public.submission_reviews (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete restrict,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision public.resource_status not null check (decision in ('approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz not null default now(),
  constraint submission_reviews_reason_matches_decision check (
    (decision = 'rejected' and char_length(btrim(coalesce(rejection_reason, ''))) between 1 and 2000)
    or (decision = 'approved' and rejection_reason is null)
  )
);

create index courses_level_semester_idx on public.courses (academic_level, semester);
create index resource_batches_course_created_idx on public.resource_batches (course_id, created_at desc);
create index resource_batches_uploader_created_idx on public.resource_batches (uploaded_by, created_at desc);
create index resources_course_status_created_idx on public.resources (course_id, status, created_at desc);
create index resources_uploader_status_created_idx on public.resources (uploader_id, status, created_at desc);
create index resources_batch_idx on public.resources (batch_id, created_at);
create index submission_reviews_resource_reviewed_idx on public.submission_reviews (resource_id, reviewed_at desc);
create index submission_reviews_reviewer_reviewed_idx on public.submission_reviews (reviewer_id, reviewed_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger courses_set_updated_at
before update on public.courses
for each row execute function private.set_updated_at();
create trigger resources_set_updated_at
before update on public.resources
for each row execute function private.set_updated_at();

-- SECURITY DEFINER avoids recursive profiles RLS checks. The function has a
-- fixed empty search_path and only reads the requested user's role/grants.
create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.has_permission(text) from public, anon;
grant execute on function private.has_permission(text) to authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- A signed-in user can edit their display name but cannot elevate their role
-- or grants. Only an existing admin, or trusted SQL maintenance with no user
-- JWT, may change role/capability columns. RLS still blocks anon/auth users
-- whose policies do not allow those operations.
create or replace function private.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role, new.can_upload, new.can_review, new.can_manage_resources)
       is distinct from
     (old.role, old.can_upload, old.can_review, old.can_manage_resources)
     and auth.uid() is not null
     and not private.has_permission('manage_members') then
    raise exception 'Only an administrator can change profile roles or permissions.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- manage_members is deliberately admin-only; sub-admin capability grants do
-- not include it, so the helper always returns false for sub-admins here.
create trigger profiles_guard_privileges
before update on public.profiles
for each row execute function private.guard_profile_privileges();
revoke all on function private.guard_profile_privileges() from public, anon, authenticated;

-- Auth signup creates a student profile. User metadata can set only display
-- name; the role and all elevated grants are set explicitly in this function.
create or replace function private.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', ''),
    'student'::public.profile_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_student_profile() from public, anon, authenticated;
create trigger on_auth_user_created_create_student_profile
after insert on auth.users
for each row execute function private.create_student_profile();

-- Resource status may change only when a review-capable user appends a matching
-- audit event through the atomic review_resource RPC below. The trigger runs as
-- its owner only to inspect the protected audit row; it exposes no callable API.
-- Authenticated clients receive column-level metadata updates, never status.
create or replace function private.guard_resource_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status not in ('approved'::public.resource_status, 'rejected'::public.resource_status)
       or auth.uid() is null
       or not private.has_permission('review')
       or (new.status = 'rejected'::public.resource_status and not exists (
         select 1
         from public.submission_reviews as review_event
         where review_event.resource_id = old.id
           and review_event.reviewer_id = auth.uid()
           and review_event.decision = new.status
           and review_event.rejection_reason is not null
       ))
       or (new.status = 'approved'::public.resource_status and not exists (
         select 1
         from public.submission_reviews as review_event
         where review_event.resource_id = old.id
           and review_event.reviewer_id = auth.uid()
           and review_event.decision = new.status
           and review_event.rejection_reason is null
       )) then
      raise exception 'A matching review event and review permission are required to change status.'
        using errcode = '42501';
    end if;
  end if;
  if new.status is not distinct from old.status and new.published_at is distinct from old.published_at then
    raise exception 'Publication timestamps are managed with review decisions.' using errcode = '42501';
  end if;
  if new.status = 'approved'::public.resource_status and new.status is distinct from old.status then
    new.published_at := pg_catalog.now();
  elsif new.status <> 'approved'::public.resource_status then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger resources_guard_status
before update of status, published_at on public.resources
for each row execute function private.guard_resource_status();
revoke all on function private.guard_resource_status() from public, anon, authenticated;

-- One atomic review operation updates exactly one resource and appends its
-- immutable review event. Batch siblings are deliberately untouched.
create or replace function public.review_resource(
  p_resource_id uuid,
  p_decision public.resource_status,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid := auth.uid();
begin
  if v_reviewer_id is null or not private.has_permission('review') then
    raise exception 'Review permission is required.' using errcode = '42501';
  end if;
  if p_decision not in ('approved'::public.resource_status, 'rejected'::public.resource_status) then
    raise exception 'Decision must be approved or rejected.' using errcode = '22023';
  end if;
  if p_decision = 'rejected'::public.resource_status
     and char_length(btrim(coalesce(p_rejection_reason, ''))) not between 1 and 2000 then
    raise exception 'A rejection reason between 1 and 2000 characters is required.' using errcode = '22023';
  end if;
  if p_decision = 'approved'::public.resource_status and p_rejection_reason is not null then
    raise exception 'An approval cannot include a rejection reason.' using errcode = '22023';
  end if;

  perform 1 from public.resources where id = p_resource_id for update;
  if not found then
    raise exception 'Resource not found.' using errcode = 'P0002';
  end if;

  insert into public.submission_reviews (resource_id, reviewer_id, decision, rejection_reason)
  values (p_resource_id, v_reviewer_id, p_decision, case when p_decision = 'rejected'::public.resource_status then btrim(p_rejection_reason) else null end);

  update public.resources as resource
    set status = p_decision,
        published_at = case
          when p_decision = 'approved'::public.resource_status
            then coalesce(resource.published_at, pg_catalog.now())
          else null
        end
    where resource.id = p_resource_id;

end;
$$;

revoke all on function public.review_resource(uuid, public.resource_status, text) from public, anon;
grant execute on function public.review_resource(uuid, public.resource_status, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.resource_batches enable row level security;
alter table public.resources enable row level security;
alter table public.submission_reviews enable row level security;

revoke all on table public.profiles, public.courses, public.resource_batches, public.resources, public.submission_reviews from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant update (role, can_upload, can_review, can_manage_resources) on table public.profiles to authenticated;
grant insert (id, display_name) on table public.profiles to authenticated;
grant select on table public.courses to anon, authenticated;
grant insert, update, delete on table public.courses to authenticated;
grant select, insert on table public.resource_batches to authenticated;
grant select, insert, delete on table public.resources to authenticated;
grant update (title, category, file_name, file_extension, mime_type, file_size_bytes, storage_path)
  on table public.resources to authenticated;
grant select on table public.resources to anon;
grant select on table public.submission_reviews to authenticated;

-- Profiles: a user reads/edits their own profile; admins manage all profiles.
create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.has_permission('manage_members')));

create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (id = (select auth.uid()) or (select private.has_permission('manage_members')))
with check (id = (select auth.uid()) or (select private.has_permission('manage_members')));
create policy profiles_insert_self_student on public.profiles
for insert to authenticated
with check (
  id = (select auth.uid())
  and role = 'student'::public.profile_role
  and not (can_upload or can_review or can_manage_resources)
);

-- Course catalog is readable, but only admins or explicitly resource-managing
-- sub-admins can create/update/delete courses.
create policy courses_read_public on public.courses
for select to anon, authenticated using (true);
create policy courses_insert_managers on public.courses
for insert to authenticated
with check ((select private.has_permission('manage_resources')));
create policy courses_update_managers on public.courses
for update to authenticated
using ((select private.has_permission('manage_resources')))
with check ((select private.has_permission('manage_resources')));
create policy courses_delete_managers on public.courses
for delete to authenticated
using ((select private.has_permission('manage_resources')));

-- A student may create/read their own batches. Reviewers and resource managers
-- may read batches for moderation/management; batch ownership cannot be edited.
create policy batches_read_owner_or_staff on public.resource_batches
for select to authenticated
using (
  uploaded_by = (select auth.uid())
  or (select private.has_permission('review'))
  or (select private.has_permission('manage_resources'))
);
create policy batches_insert_self on public.resource_batches
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    (select private.has_permission('upload'))
    or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'sub_admin'::public.profile_role)
  )
);

-- Public/anonymous reads can see only approved resources. Authenticated owners
-- can see their own submissions; reviewers/managers can see the moderation set.
create policy resources_read_approved_public on public.resources
for select to anon
using (status = 'approved'::public.resource_status);

create policy resources_read_authenticated on public.resources
for select to authenticated
using (
  status = 'approved'::public.resource_status
  or uploader_id = (select auth.uid())
  or (select private.has_permission('review'))
  or (select private.has_permission('manage_resources'))
);

create policy resources_insert_owner on public.resources
for insert to authenticated
with check (
  uploader_id = (select auth.uid())
  and status = 'pending'::public.resource_status
  and published_at is null
  and (
    (select private.has_permission('upload'))
    or not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'sub_admin'::public.profile_role)
  )
);

-- If a batch is visible, only its uploader or explicitly authorized staff may
-- use it for a resource. This prevents students attaching a document to a
-- guessed or stolen batch UUID.

-- Owners can edit metadata only while pending, never uploader/course/batch or
-- status. Admins and explicitly granted resource managers can manage metadata;
-- status changes remain locked to the review RPC trigger.
create policy resources_update_owner_or_manager on public.resources
for update to authenticated
using (
  (uploader_id = (select auth.uid()) and status = 'pending'::public.resource_status)
  or (select private.has_permission('manage_resources'))
)
with check (
  (uploader_id = (select auth.uid()) and status = 'pending'::public.resource_status)
  or (select private.has_permission('manage_resources'))
);

create policy resources_delete_owner_pending_or_manager on public.resources
for delete to authenticated
using (
  (uploader_id = (select auth.uid()) and status = 'pending'::public.resource_status)
  or (select private.has_permission('manage_resources'))
);

-- Review history is readable to the uploader and staff, and appendable only by
-- the review RPC. UPDATE and DELETE are not granted to client roles.
create policy reviews_read_uploader_or_staff on public.submission_reviews
for select to authenticated
using (
  exists (select 1 from public.resources where resources.id = submission_reviews.resource_id and resources.uploader_id = (select auth.uid()))
  or reviewer_id = (select auth.uid())
  or (select private.has_permission('review'))
  or (select private.has_permission('manage_resources'))
);

-- Manual first-admin bootstrap (run in Supabase SQL Editor only after the
-- trusted user has authenticated once and the auth trigger created a profile):
--   update public.profiles as p
--   set role = 'admin', can_upload = false, can_review = false,
--       can_manage_resources = false
--   from auth.users as u
--   where p.id = u.id and u.email = 'TRUSTED_USER_EMAIL_HERE';
-- Verify the target auth.users email and UUID before running. This migration
-- never promotes a user automatically. SQL Editor maintenance has auth.uid()
-- NULL; authenticated clients cannot use this path, and the table remains
-- protected by RLS.

commit;
