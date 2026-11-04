-- Preserve the current staff-wide visibility of existing folders and share new
-- folders by default. File NULL values inherit the folder.

alter table public.folders
  add column if not exists is_shared boolean not null default true;

alter table public.folders
  alter column is_shared set default true;

alter table public.documents
  add column if not exists is_shared boolean;

grant update (is_shared) on public.folders to authenticated;
grant insert (is_shared) on public.folders to authenticated;
grant insert (is_shared) on public.documents to authenticated;
grant update (is_shared) on public.documents to authenticated;
