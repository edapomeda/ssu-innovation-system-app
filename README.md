# SSU Innovation Office

A React and Tailwind CSS app for the Samar State University Innovation Office. The pages are separated into `src/pages` with shared UI components in `src/components`. Email/password authentication, staff-owned folders, and document uploads use Supabase; innovation-record management and profile updates are not implemented yet.

## Pages

- Welcome
- Log in and sign up
- Home dashboard
- Admin dashboard (admin accounts only)
- Records and folders
- Uploads
- Profile

The Records page supports creating, listing, renaming, and soft-deleting the signed-in user's folders. Open a folder to upload, list, download, rename, recategorize, and soft-delete files. Files are stored in a private Supabase Storage bucket and categorized as Innovator, Project, IP, or Event/Activity. New file uploads do not currently link to innovation records; existing links are retained when file details are edited. Staff file deletion soft-deletes the metadata and keeps the Storage object. Admins can use File management to browse all active folders and documents, see their owners, rename or soft-delete folders, permanently delete documents and their Storage objects, and download documents.

Staff can browse folders and documents shared by other active staff members in the read-only **Shared Records** view after running [`supabase/record-sharing.sql`](./supabase/record-sharing.sql) and [`supabase/staff-records.sql`](./supabase/staff-records.sql). New folders are shared by default; existing folders remain shared when the sharing migration is applied. Documents inherit their folder's sharing setting unless an owner overrides it in **My Records**. Sharing is limited to authenticated active staff, and changes remain restricted to the owner.

Pages use React Router and can be opened directly at `/`, `/login`, `/signup`, `/home`, `/records`, `/records/my`, `/records/shared/:folderId`, `/records/:folderId`, `/uploads`, `/admin`, `/admin/files`, or `/profile`.

The Vercel deployment uses [`vercel.json`](./vercel.json) to rewrite direct route requests to the app entry point, so refreshing or opening a nested URL works.

## Connect Supabase authentication

1. Create a Supabase project, enable Email authentication under **Authentication → Providers**, and turn off **Confirm email** in the Email provider settings so new users can sign in immediately.
2. Copy the project URL and anon/publishable key from **Project Settings → API**.
3. Copy `.env.example` to `.env.local` and replace its placeholder values:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
   ```

4. In **Authentication → URL Configuration**, add `http://localhost:5173` as a site URL and redirect URL.

The anon/publishable key is intended for browser use. Never put a Supabase service-role key in a `VITE_` variable. Restart Vite after changing `.env.local`.

## Set up the database

The existing `profiles` and `folders` tables should be in place first. Run these scripts in the Supabase SQL Editor, in order:

1. [`supabase/profiles-rls.sql`](./supabase/profiles-rls.sql), if you have not enabled own-profile reads yet.
2. [`supabase/innovation-records.sql`](./supabase/innovation-records.sql) to create the shared Innovator, Project, IP, and Event record table with staff/admin assignment policies.
3. [`supabase/documents.sql`](./supabase/documents.sql) to create the private document metadata table, Storage bucket, and owner-only policies.
4. [`supabase/admin-dashboard.sql`](./supabase/admin-dashboard.sql) to allow admins to view cross-user profile, folder, and document summaries, manage folders/documents, and download private documents.
5. [`supabase/admin-hard-delete-documents.sql`](./supabase/admin-hard-delete-documents.sql) to allow admins to permanently remove document files and metadata.
6. [`supabase/record-sharing.sql`](./supabase/record-sharing.sql) to add folder sharing and inheritable per-document sharing. Existing folders remain shared; new folders default to shared.
7. [`supabase/staff-records.sql`](./supabase/staff-records.sql) to enforce sharing settings when staff browse other active staff members' folders, documents, and file objects read-only.

The SQL scripts are migrations intended to run once on a project where the named objects do not already exist. The records schema follows the current `staff`/`admin` roles; it does not add a Viewer role.

For a project that already has documents and staff browsing enabled, run `record-sharing.sql` and then rerun `staff-records.sql`; do not rerun the table-creation scripts. Existing folders are preserved as shared, and new folders default to shared.

The admin dashboard is an overview of active users, folders, uploaded documents, registered innovation records, and uploaded files by category, with recent users and uploads. Admin file management permissions are enforced by `admin-dashboard.sql`; administrators can rename or soft-delete active folders, permanently delete documents and their stored files (using `admin-hard-delete-documents.sql`), and read private document objects.

If you already ran an earlier version of `documents.sql` and Storage uploads fail with an RLS error, run [`supabase/fix-document-upload-policy.sql`](./supabase/fix-document-upload-policy.sql) by itself. It only replaces the Storage upload policy; do not rerun the table-creation scripts.

Document soft deletion uses a narrowly scoped `SECURITY DEFINER` database function, owned by `postgres`, that checks the caller's active profile and role. Staff can delete from their own active folders; admins can delete from any active folder. If this function is not present or deletes fail with an RLS error, run [`supabase/fix-document-delete-policy.sql`](./supabase/fix-document-delete-policy.sql) in the Supabase SQL Editor.

For existing projects, run [`supabase/admin-hard-delete-documents.sql`](./supabase/admin-hard-delete-documents.sql) in the Supabase SQL Editor before using permanent document deletion in Admin File Management. The migration limits metadata deletion and Storage object removal to active admins.

## Profiles and access

The sign-up trigger creates `public.profiles` rows using `full_name` from sign-up metadata and assigns the default `staff` role. The app reads profile data from this table; it does not trust a role from client-supplied user metadata. The workspace is unavailable if the profile is inactive or cannot be loaded.

The anon/publishable key is used by browser code; all record, document, and Storage permissions are enforced by RLS. Never put a Supabase service-role key in a `VITE_` variable.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```
