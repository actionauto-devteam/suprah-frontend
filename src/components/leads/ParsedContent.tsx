import * as React from "react"
import { cleanHTML } from "@/lib/lead-utils"
import { isAdfBody, parseAdf, ParsedAdfLead } from "@/lib/adf-parser"
import { AdfContent } from "./AdfContent"

interface ParsedContentProps {
  content?: string
  rawBody?: string
}

export const ParsedContent = React.memo(({ content, rawBody }: ParsedContentProps) => {
  const raw = rawBody || ''
  const [parsedAdf, setParsedAdf] = React.useState<ParsedAdfLead | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (isAdfBody(raw)) {
      setLoading(true)
      parseAdf(raw).then(data => {
        setParsedAdf(data)
        setLoading(false)
      })
    } else {
      setParsedAdf(null)
    }
  }, [raw])

  if (loading) {
    return <div className="h-20 w-full animate-pulse bg-muted/20 rounded-xl" />
  }

  if (parsedAdf) {
    return <AdfContent parsed={parsedAdf} />
  }

  const text = content || cleanHTML(raw)
  if (!text) return <p className="text-[15px] text-muted-foreground/80 italic">No content available.</p>

  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        if (line.match(/^—\s.+\s—$/)) {
          return (
            <div key={i} className="flex items-center gap-3 mt-4 mb-1 first:mt-0">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500">{line.replace(/—/g, '').trim()}</span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
          )
        }
        const kv = line.match(/^(.+?):\s(.+)$/)
        if (kv) return (
          <div key={i} className="flex gap-3 text-[13px] leading-relaxed items-baseline py-2 border-b border-border/40 last:border-0">
            <span className="text-muted-foreground font-medium shrink-0 w-28 text-right">{kv[1]}</span>
            <span className="text-foreground font-semibold min-w-0 break-all">{kv[2]}</span>
          </div>
        )
        if (i === 0) return <p key={i} className="text-[15px] font-bold text-foreground leading-snug wrap-break-word">{line}</p>
        return <p key={i} className="text-[14px] text-foreground leading-[1.7] wrap-break-word">{line}</p>
      })}
    </div>
  )
})

ParsedContent.displayName = "ParsedContent"
