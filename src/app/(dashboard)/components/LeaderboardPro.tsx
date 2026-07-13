"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Medal, ChevronRight, Loader2 } from "lucide-react"
import { useInfiniteLeaderboard, LeaderboardUser } from "@/hooks/useInfiniteLeaderboard"
import { UserDetailSheet } from "./UserDetailSheet"

const RANK_ICONS = [
  <Trophy key="1" className="h-5 w-5 text-amber-500" />,
  <Medal key="2" className="h-5 w-5 text-slate-400" />,
  <Medal key="3" className="h-5 w-5 text-amber-700" />,
]

export function LeaderboardPro() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteLeaderboard(10)

  const [selectedUser, setSelectedUser] = React.useState<LeaderboardUser | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const observerTarget = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        threshold: 0.1,
        root: scrollContainerRef.current
      }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleUserClick = (user: LeaderboardUser) => {
    setSelectedUser(user)
    setSheetOpen(true)
  }

  const allUsers = data?.pages.flat() || []

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-72 sm:h-full font-sans p-0 overflow-hidden">
        <CardHeader className="h-14! sm:h-24! py-2.5! sm:py-5! px-4! sm:px-6! border-b! border-border/10! flex! flex-col! justify-center! gap-0.5! sm:gap-1!">
          <CardTitle className="text-base sm:text-xl font-black">Standings</CardTitle>
          <CardDescription className="hidden sm:block text-xs">Loading roster...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 sm:space-y-3 px-2.5 sm:px-4 py-2.5 sm:py-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 sm:h-16 w-full rounded-xl sm:rounded-2xl bg-muted/20 animate-pulse border border-border/10" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm h-72 sm:h-128 lg:h-137.5 overflow-hidden flex flex-col font-sans p-0">
        <CardHeader className="h-14! sm:h-24! py-2.5! sm:py-5! px-4! sm:px-6! border-b! border-border/10! flex! flex-col! justify-center! gap-0.5! sm:gap-1!">
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-xl font-black tracking-tight">Standings</CardTitle>
              <CardDescription className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Rep Rankings · This Period
              </CardDescription>
            </div>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/5 text-primary border border-primary/10">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto touch-pan-y overscroll-contain px-2.5 sm:px-4 py-2.5 sm:py-4 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent transition-all"
        >
          <div className="hidden sm:block px-1 pb-2.5 border-b border-border/20">
            <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 rounded-xl px-3 py-2">
              <div className="w-6 sm:w-8 shrink-0" aria-hidden="true" />
              <div className="w-9 sm:w-11 shrink-0" aria-hidden="true" />

              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground/55">
                  Rep
                </p>
              </div>

              <div className="flex items-center gap-3 sm:gap-6 text-right shrink-0">
                <p className="hidden sm:block text-[10px] font-black uppercase tracking-wider text-foreground/55">
                  Leads
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-foreground/55">
                  Appts
                </p>
              </div>

              <div className="w-4 shrink-0" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-3 pt-1.5 sm:pt-3">
            {allUsers.map((user, i) => {
              const rank = i + 1
              const isTop3 = rank <= 3
              const initials = (user.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)

              return (
                <button
                  key={user.id || i}
                  onClick={() => handleUserClick(user)}
                  className={`w-full group flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border px-2.5 sm:px-4 py-1.5 sm:py-3 text-left transition-all duration-300 hover:ring-2 hover:ring-primary/20 hover:scale-[1.01] active:scale-[0.99] ${isTop3 ? "border-primary/20 bg-card/80 shadow-md ring-1 ring-primary/5" : "border-border/20 bg-transparent hover:bg-card/40"
                    }`}
                >
                  {/* Rank Icon or Number */}
                  <div className="w-6 sm:w-8 flex flex-col items-center shrink-0">
                    {isTop3 ? (
                      <span className="[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{RANK_ICONS[rank - 1]}</span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground/30 tabular-nums">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className={`h-8 w-8 sm:h-11 sm:w-11 ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-offset-background transition-all group-hover:ring-primary/40 ${isTop3 ? "ring-primary/30" : "ring-border/20"}`}>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-black">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isTop3 && (
                      <div className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-black truncate leading-tight group-hover:text-primary transition-colors">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 rounded-md uppercase tracking-[0.05em]
                        ${user.role.toLowerCase().includes('admin') ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground/60"}`}
                      >
                        {user.role}
                      </span>
                      <span className="hidden sm:inline text-[9px] font-bold text-muted-foreground/40 tabular-nums">· {user.calls || 0} calls</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-3 sm:gap-6 text-right shrink-0">
                    <div className="hidden sm:block">
                      <p className="text-sm font-black tabular-nums">{user.convs || 0}</p>
                      <p className="text-[8px] font-bold text-muted-foreground/55 uppercase tracking-widest leading-none mt-1">Leads</p>
                    </div>
                    <div>
                      <p className="text-base sm:text-lg font-black tabular-nums text-primary">{user.appts || 0}</p>
                      <p className="text-[8px] font-bold text-muted-foreground/55 uppercase tracking-widest leading-none mt-1">Appts</p>
                    </div>
                  </div>

                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1 shrink-0" />
                </button>
              )
            })}

            {/* Observer Target & Loading State */}
            <div ref={observerTarget} className="py-4 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </div>
              ) : hasNextPage ? (
                <div className="h-4" />
              ) : (
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 italic">
                  All reps loaded.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Performance Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
