import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'

export default function ProfilePage({ onSubmit, onLogout, logoutError, profile }) {
  const fullName = profile?.full_name || 'Innovation Office User'
  const email = profile?.email || ''

  return (
    <>
      <PageHeading
        description="Manage your personal information and account preferences."
        eyebrow="ACCOUNT"
        title="My profile"
      />
      <section className="flex items-center gap-4.25 rounded-2xl border border-line bg-linear-to-r from-white to-[#f7f9fc] p-5.25 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:flex-wrap max-sm:gap-3 max-sm:p-4.25">
        <span className="grid h-14.25 w-14.25 shrink-0 place-items-center rounded-full bg-[#eaf0f7] text-accent ring-4 ring-white shadow-sm">
          <Icon className="h-6 w-6" name="user" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h2 className="mb-0.75 mt-1 break-words text-base font-bold text-ink">{fullName}</h2>
          <p className="break-all text-sm text-muted">{email}</p>
        </div>
        <span className="ml-auto rounded-full border border-[#dce8f5] bg-white px-3 py-1.5 text-xs font-bold text-accent max-sm:ml-17.25 max-sm:-mt-2">
          {profile?.role === 'admin' ? 'Administrator' : 'Staff'}
        </span>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
        <section className="rounded-3.5 border border-line bg-white p-5.25 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
          <p className="eyebrow">PERSONAL INFORMATION</p>
          <h2 className="mb-5 mt-2 text-lg font-bold text-ink">Profile details</h2>
          <form className="grid gap-4.25" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Full name
              <input className="form-input" defaultValue={fullName} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Email address
              <input className="form-input" defaultValue={email} readOnly type="email" />
            </label>
            <button className="flex min-h-11 w-fit items-center justify-center rounded-lg bg-accent px-4.25 text-sm font-bold text-white hover:bg-[#102d4f]" type="submit">
              Save changes
            </button>
            <p aria-live="polite" className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-muted">
              Profile updates are not connected yet.
            </p>
          </form>
          <div className="mt-5 grid gap-2 border-t border-line pt-4 text-sm text-ink">
            <p>
              Role: <strong className="capitalize">{profile?.role}</strong>
            </p>
            <p>
              Account status:{' '}
              <strong>{profile?.is_active ? 'Active' : 'Inactive'}</strong>
            </p>
          </div>
        </section>

        <section className="self-start rounded-3.5 border border-line bg-white p-5.25 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
          <p className="eyebrow">ACCOUNT &amp; SECURITY</p>
          <h2 className="mb-5 mt-2 text-lg font-bold text-ink">Account settings</h2>
          <div className="flex min-h-16.75 items-center justify-between gap-3 border-t border-line">
            <span className="grid gap-1">
              <strong className="text-sm text-ink">Change password</strong>
              <small className="text-xs leading-relaxed text-muted">Password management will be available later.</small>
            </span>
            <span className="shrink-0 rounded-full bg-[#eaf0f7] px-2.5 py-1.5 text-xs font-bold text-accent">
              Soon
            </span>
          </div>
          <div className="flex min-h-16.75 items-center justify-between gap-3 border-t border-line">
            <span className="grid gap-1">
              <strong className="text-sm text-ink">Log out</strong>
              <small className="text-xs leading-relaxed text-muted">Return to the welcome screen.</small>
            </span>
            <button
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink hover:bg-slate-50"
              onClick={onLogout}
              type="button"
            >
              <Icon className="h-3.75 w-3.75" name="logout" /> Log out
            </button>
          </div>
          {logoutError && (
            <p className="border-t border-line pt-3 text-sm text-[#a23e3e]" role="alert">
              {logoutError}
            </p>
          )}
        </section>
      </div>
    </>
  )
}
