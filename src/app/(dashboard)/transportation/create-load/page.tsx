"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Globe, UserCheck, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadFormLayout } from "@/components/create-load/LoadFormLayout"
import { PostType } from "@/components/create-load/types"
import { cn } from "@/lib/utils"

// ─── Create Load page ─────────────────────────────────────────────────────────
// Hosts the two workflows on one route:
//   /transportation/create-load                 → chooser
//   /transportation/create-load?type=load-board → straight into that workflow
//   /transportation/create-load?type=assign-carrier

const WORKFLOWS: Array<{
  key: PostType
  title: string
  description: string
  icon: React.ElementType
}> = [
  {
    key: "load-board",
    title: "Post to Load Board",
    description:
      "Publish the load publicly. Any carrier browsing the board can see it.",
    icon: Globe,
  },
  {
    key: "assign-carrier",
    title: "Assign Carrier",
    description:
      "Assign one of your organization's drivers directly — or publish it as an Available Load and let drivers request it.",
    icon: UserCheck,
  },
]

function CreateLoadPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const typeParam = searchParams.get("type")
  const initialType: PostType | null =
    typeParam === "load-board" || typeParam === "assign-carrier"
      ? typeParam
      : null

  const [postType, setPostType] = React.useState<PostType | null>(initialType)

  return (
    <div className="min-h-dvh p-4 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() =>
              postType ? setPostType(null) : router.push("/transportation")
            }
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Truck className="size-5 text-emerald-500" />
              Create Load
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-0.5">
              {postType
                ? WORKFLOWS.find((w) => w.key === postType)?.title
                : "Choose a workflow"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Chooser or form ── */}
      {!postType ? (
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WORKFLOWS.map(({ key, title, description, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPostType(key)}
              className={cn(
                "text-left rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5 relative overflow-hidden",
                "transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
              )}
            >
              <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3">
                <Icon className="size-5 text-emerald-500" />
              </div>
              <p className="text-base font-black tracking-tight text-foreground">
                {title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <LoadFormLayout postType={postType} />
      )}
    </div>
  )
}

// Next.js App Router requires useSearchParams inside a Suspense boundary
// during prerender — without this, `next build` fails on this page.
export default function CreateLoadPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <Truck className="size-5 text-emerald-500 motion-safe:animate-pulse" />
        </div>
      }
    >
      <CreateLoadPageInner />
    </React.Suspense>
  )
}