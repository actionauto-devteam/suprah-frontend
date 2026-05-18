import * as React from "react"
import { getInitials } from "@/lib/lead-utils"

interface AvatarProps {
  first?: string
  last?: string
  size?: "sm" | "md" | "lg"
}

// Palette pairs that look good in both light and dark mode
const PALETTES = [
  "bg-emerald-100 text-emerald-700 ring-emerald-200/80 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-700/50",
  "bg-blue-100 text-blue-700 ring-blue-200/80 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-700/50",
  "bg-violet-100 text-violet-700 ring-violet-200/80 dark:bg-violet-900/50 dark:text-violet-300 dark:ring-violet-700/50",
  "bg-amber-100 text-amber-700 ring-amber-200/80 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-700/50",
  "bg-rose-100 text-rose-700 ring-rose-200/80 dark:bg-rose-900/50 dark:text-rose-300 dark:ring-rose-700/50",
  "bg-teal-100 text-teal-700 ring-teal-200/80 dark:bg-teal-900/50 dark:text-teal-300 dark:ring-teal-700/50",
  "bg-orange-100 text-orange-700 ring-orange-200/80 dark:bg-orange-900/50 dark:text-orange-300 dark:ring-orange-700/50",
  "bg-sky-100 text-sky-700 ring-sky-200/80 dark:bg-sky-900/50 dark:text-sky-300 dark:ring-sky-700/50",
]

const SIZE_CLASS = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
}

export const Avatar = React.memo(({ first, last, size = "md" }: AvatarProps) => {
  const initials = getInitials(first, last)
  const palette  = PALETTES[(initials.charCodeAt(0) || 0) % PALETTES.length]

  return (
    <div
      className={`${SIZE_CLASS[size]} ${palette} rounded-full flex items-center justify-center font-semibold ring-1 shrink-0 select-none`}
    >
      {initials}
    </div>
  )
})

Avatar.displayName = "Avatar"
