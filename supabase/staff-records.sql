-- Allow staff to browse active staff folders and documents without granting
-- permission to create, update, or delete another user's records.
-- Run supabase/record-sharing.sql before this script.

create or replace function public.list_record_owners()
returns table (owner_id uuid, owner_name text, has_documents boolean)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not exists (
    select 1
    from public.profiles caller
    where caller.id = (select auth.uid())
      and caller.is_active
      and caller.role::text in ('staff', 'admin')
  ) then
    raise exception 'An active staff or admin profile is required'
      using errcode = '42501';
  end if;

  return query
    select p.id,
           coalesce(nullif(btrim(p.full_name), ''), 'Staff member'),
           bool_or(exists (
             select 1
             from public.documents d
             where d.folder_id = f.id
               and d.deleted_at is null
               and coalesce(d.is_shared, f.is_shared)
           ))
    from public.profiles p
    join public.folders f on f.owner_id = p.id
    where p.is_active
      and p.role::text = 'staff'
      and f.deleted_at is null
      and (
        f.is_shared
        or exists (
          select 1
          from public.documents d
          where d.folder_id = f.id
            and d.deleted_at is null
            and d.is_shared
        )
      )
    group by p.id, p.full_name;
end;
$$;

alter function public.list_record_owners() owner to postgres;
revoke all on function public.list_record_owners() from public, anon;
grant execute on function public.list_record_owners() to authenticated;

create or replace function public.folder_has_shared_records(p_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select (select public.current_app_role()) = 'staff'
    and exists (
      select 1
      from public.folders f
      where f.id = p_folder_id
        and f.deleted_at is null
        and (
          f.is_shared
          or exists (
            select 1
            from public.documents d
            where d.folder_id = f.id
              and d.deleted_at is null
              and d.is_shared
          )
        )
    );
$$;

alter function public.folder_has_shared_records(uuid) owner to postgres;
revoke all on function public.folder_has_shared_records(uuid) from public, anon;
grant execute on function public.folder_has_shared_records(uuid) to authenticated;

drop policy if exists "Staff can read active staff folders" on public.folders;
create policy "Staff can read active staff folders"
  on public.folders
  for select
  to authenticated
  using (
    (select public.current_app_role()) = 'staff'
    and deleted_at is null
    and owner_id in (select owners.owner_id from public.list_record_owners() owners)
    and public.folder_has_shared_records(folders.id)
  );

drop policy if exists "Staff can read active staff documents" on public.documents;
create policy "Staff can read active staff documents"
  on public.documents
  for select
  to authenticated
  using (
    (select public.current_app_role()) = 'staff'
    and deleted_at is null
    and exists (
      select 1
      from public.folders f
      where f.id = documents.folder_id
        and f.deleted_at is null
        and coalesce(documents.is_shared, f.is_shared)
        and f.owner_id in (select owners.owner_id from public.list_record_owners() owners)
    )
  );

drop policy if exists "Staff can read active staff document objects" on storage.objects;
create policy "Staff can read active staff document objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'innovation-documents'
    and (select public.current_app_role()) = 'staff'
    and exists (
      select 1
      from public.documents d
      join public.folders f on f.id = d.folder_id
      where d.storage_path = storage.objects.name
        and d.deleted_at is null
        and f.deleted_at is null
        and coalesce(d.is_shared, f.is_shared)
        and f.owner_id in (select owners.owner_id from public.list_record_owners() owners)
    )
  );
