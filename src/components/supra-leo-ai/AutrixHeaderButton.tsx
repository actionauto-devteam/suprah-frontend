'use client'

import { Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const SUPRASPACE_SUBDOMAIN = 'space.suprah-app.com'

function getModule(pathname: string): string {
  if (pathname.includes('/appointments')) return 'appointments'
  if (pathname.includes('/timeproof')) return 'timeproof'
  if (pathname.includes('/supra-space') || pathname.includes('/conversations')) return 'supraspace'
  if (pathname.includes('/biometric')) return 'biometrics'
  if (pathname.includes('/feeds')) return 'feeds'
  return 'general'
}

type AutrixHeaderButtonProps = {
  className?: string
}

export function AutrixHeaderButton({ className }: AutrixHeaderButtonProps) {
  const pathname = usePathname() || '/crm/dashboard'

  if (pathname.startsWith('/crm/supra-leo')) return null

  const isSupraSpacePwa = typeof window !== 'undefined' && window.location.hostname === SUPRASPACE_SUBDOMAIN
  const featureModule = isSupraSpacePwa ? 'supraspace' : getModule(pathname)
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('suprah-autrix:open', { detail: { module: featureModule } }))}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-2 text-emerald-700 transition-colors hover:bg-emerald-500/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-emerald-300',
        className,
      )}
      aria-label="Open Suprah Autrix AI"
      title="Open Suprah Autrix AI"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      <span className="hidden text-[11px] font-bold sm:inline">Autrix</span>
    </button>
  )
}
