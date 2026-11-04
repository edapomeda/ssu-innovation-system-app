const iconPaths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  folder: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  folderAdd: 'M3 6a2 2 0 0 1 2-2h5l2 2h4v11H5a2 2 0 0 1-2-2zM19 14v7m-3.5-3.5h7',
  file: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4',
  user: 'M20 21a8 8 0 0 0-16 0m8-10a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
  users: 'M16 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M20 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 10v-2a7 7 0 0 0-14 0v2z',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 1 1 8 0v3m-4 5v2',
  chevron: 'm9 18 6-6-6-6',
  plus: 'M12 5v14m-7-7h14',
  edit: 'm16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z',
  trash: 'M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M4 17v4h16v-4',
  print: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-12-4h12v7H6zm12-3h.01',
  search: 'm20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0',
  lightbulb: 'M9 18h6m-5 4h4m-2-21a7 7 0 0 0-4 12.7c.8.6 1 1.4 1 2.3h6c0-.9.2-1.7 1-2.3A7 7 0 0 0 12 1z',
  logout: 'M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7',
}

export default function Icon({ name, className = 'h-5 w-5 shrink-0' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={name === 'more' ? '3.2' : '1.8'}
      viewBox="0 0 24 24"
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}
