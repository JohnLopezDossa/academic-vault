-- Safe resource deletion with retryable private Storage cleanup.
-- Requires the core and Storage migrations to be applied first.
-- This migration does not execute Storage HTTP operations or use a service key.

begin;

create table public.resource_storage_deletions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null unique,
  storage_path text not null unique,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint resource_storage_deletions_completion_matches_status
    check (completed_at is null or completed_at >= requested_at)
);

alter table public.resource_storage_deletions enable row level security;
revoke all on table public.resource_storage_deletions from anon, authenticated;
grant select on table public.resource_storage_deletions to authenticated;

create policy resource_storage_deletions_read_managers
on public.resource_storage_deletions
for select to authenticated
using ((select private.has_permission('manage_resources')));

create or replace function public.request_resource_deletion(p_resource_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_uploader uuid;
  v_resource_id uuid;
  v_extension text;
begin
  if auth.uid() is null or not private.has_permission('manage_resources') then
    raise exception 'Resource-management permission is required.' using errcode = '42501';
  end if;

  select r.id, r.storage_path, r.uploader_id, r.file_extension
    into v_resource_id, v_path, v_uploader, v_extension
  from public.resources as r
  where r.id = p_resource_id
  for update;

  if not found then
    raise exception 'Resource not found.' using errcode = 'P0002';
  end if;

  -- Preserve review history; its FK deliberately restricts deleting reviewed rows.
  if exists (
    select 1 from public.submission_reviews as review
    where review.resource_id = v_resource_id
  ) then
    raise exception 'This resource has review history and cannot be hard-deleted.' using errcode = '23503';
  end if;

  if v_path is distinct from (
       v_uploader::text || '/' || v_resource_id::text || '/' ||
       v_resource_id::text || '.' || v_extension
     ) then
    raise exception 'Resource storage path is not canonical; refusing deletion.' using errcode = '22023';
  end if;

  insert into public.resource_storage_deletions (resource_id, storage_path, requested_by)
  values (v_resource_id, v_path, auth.uid());

  delete from public.resources as r where r.id = v_resource_id;
  return v_path;
end;
$$;

create or replace function public.complete_resource_storage_deletion(p_storage_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission('manage_resources') then
    raise exception 'Resource-management permission is required.' using errcode = '42501';
  end if;

  update public.resource_storage_deletions
     set completed_at = coalesce(completed_at, now())
   where storage_path = p_storage_path;

  if not found then
    raise exception 'Storage deletion request not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.request_resource_deletion(uuid) from public, anon;
grant execute on function public.request_resource_deletion(uuid) to authenticated;
revoke all on function public.complete_resource_storage_deletion(text) from public, anon;
grant execute on function public.complete_resource_storage_deletion(text) to authenticated;

-- Existing unknown Storage policies must be reviewed rather than silently removed.
do $preflight$
begin
  if not exists (
    select 1 from storage.buckets b
    where b.id = 'academic-resources' and b.public is false
  ) then
    raise exception 'Expected private academic-resources bucket';
  end if;

  if exists (
    select 1 from pg_catalog.pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects'
      and p.policyname not in (
        'academic_resources_sign_approved_anon',
        'academic_resources_sign_authorized_authenticated',
        'academic_resources_upload_owner_pending',
        'academic_resources_delete_pending_owner_or_manager',
        'academic_resources_delete_queued_managed'
      )
  ) then
    raise exception 'Unexpected storage.objects policy exists; review all policies before continuing';
  end if;
end
$preflight$;

drop policy if exists academic_resources_delete_queued_managed on storage.objects;
create policy academic_resources_delete_queued_managed
on storage.objects
for delete to authenticated
using (
  bucket_id = 'academic-resources'
  and (select private.has_permission('manage_resources'))
  and exists (
    select 1 from public.resource_storage_deletions as deletion
    where deletion.storage_path = storage.objects.name
      and deletion.completed_at is null
  )
);

commit;
