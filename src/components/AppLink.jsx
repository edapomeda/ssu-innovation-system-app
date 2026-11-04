import { Link } from 'react-router-dom'

export default function AppLink({ to, children, className = '', ...props }) {
  return (
    <Link className={className} to={to === 'welcome' ? '/' : `/${to}`} {...props}>
      {children}
    </Link>
  )
}
