"use client"

import { useRouter } from "next/navigation"
import { Info, LayoutGrid, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AUTOMATION_TEMPLATES } from "@/lib/crmAutomationTemplates"

const BUILDER_PATH = "/crm/settings/ai-agent/automations"

export function AutomationBrowse({ canEdit }: { canEdit: boolean }) {
  const router = useRouter()

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {canEdit
          ? "Ready-made automations. Use one to open it in the builder. You can change anything before you save, and it stays a Draft until you turn it on."
          : "Ready-made automations your admins can add."}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Ready-made automations">
        {AUTOMATION_TEMPLATES.map((template) => (
          <li key={template.key} className="flex flex-col rounded-xl border border-border/40 bg-background p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{template.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div>
                <dt className="inline font-semibold">Trigger: </dt>
                <dd className="inline text-muted-foreground">{template.trigger}</dd>
              </div>
              <div>
                <dt className="font-semibold">Steps:</dt>
                <dd>
                  <ol className="mt-0.5 space-y-0.5 text-muted-foreground">
                    {template.steps.map((step, index) => (
                      <li key={`${template.key}-${index}`} className="flex gap-1.5">
                        <Zap className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            </dl>
            {template.note && (
              <p className="mt-2 flex gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{template.note}</span>
              </p>
            )}
            {canEdit && (
              <div className="mt-auto pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => router.push(`${BUILDER_PATH}/new?template=${encodeURIComponent(template.key)}`)}
                  aria-label={`Use the ${template.name} template`}
                >
                  Use template
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
