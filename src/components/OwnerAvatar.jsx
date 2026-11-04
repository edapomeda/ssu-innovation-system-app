const avatarColors = [
  'bg-[#e4edf7] text-[#173b65]',
  'bg-[#e8f0e9] text-[#315b3c]',
  'bg-[#f3e9df] text-[#704b2d]',
  'bg-[#ece8f5] text-[#4c3b75]',
  'bg-[#f5e7ec] text-[#743c52]',
  'bg-[#e3efef] text-[#28565a]',
]

function colorForOwner(ownerId) {
  let hash = 0
  for (const character of ownerId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return avatarColors[hash % avatarColors.length]
}

export default function OwnerAvatar({ owner, size = 'h-9 w-9 text-xs' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold ${size} ${colorForOwner(owner.id)}`}
    >
      {owner.initials}
    </span>
  )
}
