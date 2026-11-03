"use client"

import * as React from "react"
import { GitBranch, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  MAX_BRANCH_DEPTH,
  MAX_BRANCH_PATHS,
  MAX_STEPS,
  STEP_HELP,
  branchConfig,
  newBranchPath,
  newStep,
  type AutomationOptions,
  type AutomationStep,
  type BranchConfig,
  type BranchPath,
} from "@/lib/crmAutomations"
import { AudienceEditor } from "./AutomationAudienceEditor"
import { RepeatEditor } from "./AutomationRepeatEditor"
import { StepCard, StepPicker } from "./AutomationStepNode"
import { TimingEditor } from "./AutomationStepTiming"

export function cardWidth(depth: number): string {
  return depth === 0 ? "w-full lg:w-[28rem]" : "w-full lg:w-[22rem]"
}
const CARD_CLASS = "rounded-2xl border border-border/60 bg-card shadow-sm"

export function Connector() {
  return <div className="mx-auto h-8 w-px shrink-0 bg-border" aria-hidden="true" />
}

type ListProps = {
  steps: AutomationStep[]
  depth: number
  room: number
  name?: string
  options: AutomationOptions
  readOnly: boolean
  allowBefore: boolean
  onChange: (steps: AutomationStep[]) => void
}

export function StepList({ steps, depth, room, name, options, readOnly, allowBefore, onChange }: ListProps) {
  const endsInBranch = steps[steps.length - 1]?.type === "branch"
  const movable = endsInBranch ? steps.length - 1 : steps.length
  const replace = (id: string, config: Record<string, unknown>) => onChange(steps.map((step) => (step.id === id ? { ...step, config } : step)))
  const remove = (id: string) => onChange(steps.filter((step) => step.id !== id))
  const move = (index: number, direction: -1 | 1) => {
    const next = [...steps]
    const [step] = next.splice(index, 1)
    next.splice(index + direction, 0, step)
    onChange(next)
  }

  return (
    <>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <Connector />
          {step.type === "branch" ? (
            <BranchNode
              step={step}
              index={index}
              depth={depth}
              room={room}
              name={name}
              options={options}
              readOnly={readOnly}
              allowBefore={allowBefore}
              onChange={(config) => replace(step.id, config)}
              onRemove={() => remove(step.id)}
            />
          ) : (
            <div className={cardWidth(depth)}>
              <StepCard
                step={step}
                index={index}
                total={movable}
                options={options}
                readOnly={readOnly}
                allowBefore={allowBefore}
                onChange={(config) => replace(step.id, config)}
                onMove={(direction) => move(index, direction)}
                onRemove={() => remove(step.id)}
              />
            </div>
          )}
        </React.Fragment>
      ))}
      {!readOnly && !endsInBranch && steps.length < MAX_STEPS && room > 0 && (
        <>
          <Connector />
          <div className={cardWidth(depth)}>
            <StepPicker
              options={options}
              hide={depth >= MAX_BRANCH_DEPTH ? ["branch"] : []}
              label={name ? `Add a step to ${name}` : "Add a step"}
              onPick={(type) => onChange([...steps, newStep(type)])}
            />
          </div>
        </>
      )}
    </>
  )
}

function PathColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="relative flex flex-col rounded-2xl border border-dashed border-border/70 p-2 lg:items-center lg:rounded-none lg:border-0 lg:px-3 lg:pb-0 lg:pt-8 lg:before:absolute lg:before:left-0 lg:before:right-0 lg:before:top-0 lg:before:h-px lg:before:bg-border lg:first:before:left-1/2 lg:last:before:right-1/2 lg:after:absolute lg:after:left-1/2 lg:after:top-0 lg:after:h-8 lg:after:w-px lg:after:bg-border"
    >
      {children}
    </div>
  )
}

function PathBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary" aria-hidden="true">
      {children}
    </span>
  )
}

function BranchNode({ step, index, depth, room, name, options, readOnly, allowBefore, onChange, onRemove }: {
  step: AutomationStep
  index: number
  depth: number
  room: number
  name?: string
  options: AutomationOptions
  readOnly: boolean
  allowBefore: boolean
  onChange: (config: Record<string, unknown>) => void
  onRemove: () => void
}) {
  const branch = branchConfig(step.config)
  const save = (next: Partial<BranchConfig>) => onChange({ ...step.config, ...branch, ...next })
  const setPath = (id: string, patch: Partial<BranchPath>) => save({ paths: branch.paths.map((path) => (path.id === id ? { ...path, ...patch } : path)) })
  const pathName = (label: string) => (name ? `${name}, ${label}` : label)
  const elseName = pathName("Else")

  return (
    <div className="flex flex-col lg:items-center">
      <div className={cn(cardWidth(depth), CARD_CLASS)}>
        <div className="flex items-start gap-3 border-b border-border/40 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
            <GitBranch className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold"><span className="text-muted-foreground">{index + 1}.</span> Branch</p>
            <p className="text-[11px] text-muted-foreground">{STEP_HELP.branch}</p>
          </div>
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={onRemove} aria-label={`Remove step ${index + 1}`}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <TimingEditor stepId={step.id} index={index} timing={branch.timing} allowBefore={allowBefore} readOnly={readOnly} onChange={(timing) => save({ timing })} />
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={branch.paths.length >= MAX_BRANCH_PATHS}
              onClick={() => save({ paths: [...branch.paths, newBranchPath()] })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add condition
            </Button>
          )}
        </div>
        {branch.paths.length === 0 && (
          <p className="border-t border-border/40 px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300">Add at least one condition before you turn this automation on.</p>
        )}
        {branch.paths.length >= MAX_BRANCH_PATHS && !readOnly && (
          <p className="border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground">A Branch can have up to {MAX_BRANCH_PATHS} conditions.</p>
        )}
      </div>

      <Connector />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-0">
        {branch.paths.map((path, pathIndex) => {
          const label = `If ${pathIndex + 1}`
          return (
            <PathColumn key={path.id} label={pathName(label)}>
              <div className={cn(cardWidth(depth + 1), CARD_CLASS)}>
                <div className="flex items-start gap-3 px-4 py-3">
                  <PathBadge>If</PathBadge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[11px] text-muted-foreground">Follows this path when the contact matches the audience below.</p>
                  </div>
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={() => save({ paths: branch.paths.filter((item) => item.id !== path.id) })} aria-label={`Remove ${pathName(label)}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <AudienceEditor filters={path.filters} options={options} readOnly={readOnly} onChange={(filters) => setPath(path.id, { filters })} />
                <RepeatEditor repeat={path.repeat} fields={options.audienceFields} readOnly={readOnly} onChange={(repeat) => setPath(path.id, { repeat })} />
              </div>
              <StepList
                steps={path.steps}
                depth={depth + 1}
                room={room}
                name={pathName(label)}
                options={options}
                readOnly={readOnly}
                allowBefore={allowBefore}
                onChange={(steps) => setPath(path.id, { steps })}
              />
            </PathColumn>
          )
        })}
        <PathColumn label={elseName}>
          <div className={cn(cardWidth(depth + 1), CARD_CLASS)}>
            <div className="flex items-start gap-3 px-4 py-3">
              <PathBadge>Else</PathBadge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Else</p>
                <p className="text-[11px] text-muted-foreground">This branch will be followed if no other conditions match.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-3">
              <label htmlFor={`branch-${step.id}-nothing`} className="text-xs font-semibold">Do nothing</label>
              <Switch
                id={`branch-${step.id}-nothing`}
                checked={branch.else.doNothing}
                disabled={readOnly}
                onCheckedChange={(checked) => save({ else: { ...branch.else, doNothing: Boolean(checked) } })}
              />
            </div>
          </div>
          {!branch.else.doNothing && (
            <StepList
              steps={branch.else.steps}
              depth={depth + 1}
              room={room}
              name={elseName}
              options={options}
              readOnly={readOnly}
              allowBefore={allowBefore}
              onChange={(steps) => save({ else: { ...branch.else, steps } })}
            />
          )}
        </PathColumn>
      </div>
    </div>
  )
}
