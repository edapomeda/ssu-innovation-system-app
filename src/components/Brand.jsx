import ssuLogo from '../assets/ssu-logo.png'

export default function Brand({ compact = false, inverse = false }) {
  return (
    <div className="flex items-center gap-3">
      <img
        alt="Samar State University seal"
        className={compact ? 'h-11 w-11 object-contain' : 'h-12 w-12 object-contain'}
        src={ssuLogo}
      />
      <div>
        <p className={`text-xs font-extrabold tracking-[0.075em] ${inverse ? 'text-white' : 'text-ink'}`}>
          SSU INNOVATION OFFICE
        </p>
        <p className={`mt-0.5 text-xs ${inverse ? 'text-white/80' : 'text-muted'}`}>
          We Build, We Innovate, We Serve
        </p>
      </div>
    </div>
  )
}
