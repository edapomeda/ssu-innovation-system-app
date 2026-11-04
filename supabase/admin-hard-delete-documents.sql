create or replace function public.hard_delete_document(p_document_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  affected_rows integer;
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not exists (
    select 1
    from public.profiles as p
    where p.id = caller_id
      and p.is_active
      and p.role::text = 'admin'
  ) then
    return false;
  end if;

  delete from public.documents as d
  where d.id = p_document_id
    and d.deleted_at is null;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

alter function public.hard_delete_document(uuid) owner to postgres;
revoke all on function public.hard_delete_document(uuid) from public, anon;
grant execute on function public.hard_delete_document(uuid) to authenticated;

drop policy if exists "Admins can permanently remove document objects" on storage.objects;
create policy "Admins can permanently remove document objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'innovation-documents'
    and exists (
      select 1
      from public.profiles as p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role::text = 'admin'
    )
  );
