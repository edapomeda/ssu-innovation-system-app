import AppLink from '../components/AppLink'
import Brand from '../components/Brand'
import Icon from '../components/Icon'

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f6f8fb] px-[clamp(25px,8vw,120px)]">
      <div className="flex h-23 items-center justify-between max-sm:h-19.25 max-sm:gap-2">
        <Brand compact />
        <span className="rounded-full bg-[#eaf0f7] px-3 py-1.5 text-xs font-bold text-accent max-sm:px-2.5">
          Public prototype demo
        </span>
      </div>

      <section className="mx-auto grid w-full max-w-270 flex-1 grid-cols-2 items-center gap-10 py-8.75 pb-17.5 max-sm:grid-cols-1 max-sm:items-start max-sm:gap-0 max-sm:pb-5 max-sm:pt-16">
        <div className="pb-4.5 max-sm:relative max-sm:z-1 max-sm:pb-0">
          <p className="eyebrow">INDEPENDENT PROTOTYPE</p>
          <h1 className="my-4.5 max-w-[10ch] text-balance text-[clamp(52px,7vw,84px)] font-extrabold leading-[1.02] tracking-[-0.065em] text-ink max-sm:text-[clamp(52px,15vw,72px)]">
            Ideas start
            <br className="max-sm:hidden" />
            <span className="text-purple">here.</span>
          </h1>
          <p className="mb-6 max-w-[42ch] text-pretty text-base leading-relaxed text-muted max-sm:max-w-82.5 max-sm:text-sm">
            A home <span className="whitespace-nowrap">for the</span> people, projects, and possibilities shaping what comes next.
          </p>
          <AppLink
            className="inline-flex min-h-12 min-w-37.5 items-center justify-center gap-2 rounded-lg bg-accent px-4.25 text-sm font-bold text-white no-underline shadow-sm hover:-translate-y-px hover:bg-[#102d4f] hover:shadow-md"
            to="login"
          >
            Get started <Icon className="h-5 w-5" name="chevron" />
          </AppLink>
          <p className="mt-4.25 text-sm text-muted">
            Already have an account?{' '}
            <AppLink className="font-bold text-purple no-underline" to="login">
              Log in
            </AppLink>
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mx-auto grid h-[min(36vw,400px)] w-[min(36vw,400px)] min-h-70 min-w-70 place-items-center justify-self-center max-sm:absolute max-sm:bottom-22.5 max-sm:-right-17.5 max-sm:h-70 max-sm:w-70 max-sm:min-h-0 max-sm:min-w-0 max-sm:opacity-55"
        >
          <div className="absolute h-3/4 w-3/4 rounded-full bg-[radial-gradient(circle,rgb(23_59_101/18%),rgb(23_59_101/0%)_70%)] blur-1.75" />
          <div className="absolute h-[73%] w-[73%] rotate-[-31deg] scale-y-[0.65] rounded-full border border-[#173b653d]" />
          <div className="absolute h-[92%] w-[92%] rotate-38 scale-y-[0.68] rounded-full border border-[#173b6524]" />
          <div className="relative z-1 grid h-35 w-35 rotate-[-8deg] place-items-center rounded-9 border border-white/80 bg-linear-to-br from-white to-[#eaf0f7] text-accent shadow-[0_22px_65px_rgb(23_59_101/14%)] max-sm:h-25 max-sm:w-25 max-sm:rounded-7.25">
            <Icon className="h-16.5 w-16.5 stroke-[1.2] max-sm:h-12 max-sm:w-12" name="lightbulb" />
          </div>
          <span className="absolute right-[20%] top-[21%] text-6.25 text-[#f0ad51]">✦</span>
          <span className="absolute bottom-[24%] left-[17%] text-4.25 text-[#6478cc]">✦</span>
          <div className="absolute bottom-[14%] right-[6%] text-xs font-extrabold leading-[1.7] tracking-[0.17em] text-[#64748b]">
            CURIOSITY
            <br />
            IN MOTION
          </div>
        </div>
      </section>

      <footer className="relative z-1 flex min-h-14.5 items-center justify-between gap-4 border-t border-line text-xs text-muted max-sm:min-h-13.75 max-sm:text-[11px]">
        <span>INNOVATION WORKSPACE</span>
        <span className="max-sm:max-w-27.5 max-sm:text-right">Prototype demonstration</span>
      </footer>
    </main>
  )
}
