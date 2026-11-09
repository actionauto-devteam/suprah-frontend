import {
  NEW_TRIGGER_DEFAULTS,
  newStep,
  type AutomationDraft,
  type AutomationStep,
  type AutomationStepType,
  type AutomationTrigger,
  type StepTiming,
} from "@/lib/crmAutomations"

export interface AutomationTemplate {
  key: string
  name: string
  description: string
  trigger: string
  steps: string[]
  note?: string
  build: () => AutomationDraft
}

type Repeat = AutomationTrigger["repeat"]

const EVERY_TIME: Repeat = { mode: "every_time", days: null, per: [] }
const once = (days: number): Repeat => ({ mode: "once_per_days", days, per: ["customer_phone"] })
const after = (amount: number, unit: "minutes" | "hours" | "days"): StepTiming => ({ when: "after", amount, unit })
const before = (amount: number, unit: "minutes" | "hours" | "days"): StepTiming => ({ when: "before", amount, unit })

function trigger(source: string, event: string, repeat: Repeat): AutomationTrigger {
  return { ...NEW_TRIGGER_DEFAULTS, filters: [], source, event, repeat }
}

function step(type: AutomationStepType, config: Record<string, unknown> = {}): AutomationStep {
  const base = newStep(type)
  return { ...base, config: { ...base.config, ...config } }
}

function draft(name: string, automationTrigger: AutomationTrigger, steps: AutomationStep[]): AutomationDraft {
  return { name, locations: { mode: "all", ids: [] }, trigger: automationTrigger, steps }
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "auto-text-after-call",
    name: "Auto text after call",
    description: "Texts the caller a thank-you about 15 minutes after an answered call, so they can reply by text.",
    trigger: "Call ended",
    steps: ["Send a Message 15 minutes after the call"],
    build: () => draft("Auto text after call", trigger("suprah", "call_ended", once(7)), [
      step("send_message", { body: "Hi {first_name}, thanks for calling {dealership_name}! If anything else comes up, just reply to this text.", timing: after(15, "minutes") }),
    ]),
  },
  {
    key: "missed-call-follow-up",
    name: "Missed call follow-up",
    description: "Texts the caller right away when nobody answered, including callers who hung up before anyone answered.",
    trigger: "Missed call",
    steps: ["Send a Message right away"],
    note: "While it is on, the standard missed-call text is not sent, so the caller gets one text.",
    build: () => draft("Missed call follow-up", trigger("suprah", "call_missed", once(1)), [
      step("send_message", { body: "Hi {first_name}, sorry we missed your call at {dealership_name}. How can we help? Reply here and we will get right back to you." }),
    ]),
  },
  {
    key: "abandoned-call-follow-up",
    name: "Abandoned call follow-up",
    description: "Texts the caller right away when they hung up before anyone answered.",
    trigger: "Caller hung up before anyone answered",
    steps: ["Send a Message right away"],
    note: "These calls also count as missed calls. Use this or Missed call follow-up, not both.",
    build: () => draft("Abandoned call follow-up", trigger("suprah", "call_abandoned", once(1)), [
      step("send_message", { body: "Hi {first_name}, it looks like your call to {dealership_name} ended before we could answer. How can we help? Just reply to this text." }),
    ]),
  },
  {
    key: "ai-lead-follow-up-60-days",
    name: "60-day AI lead follow-up",
    description: "Keeps following up with new leads after the AI agent's first follow-ups end: an AI text at 15, 30, 45 and 60 days. It stops when the customer replies.",
    trigger: "New lead received",
    steps: ["Send AI Follow-up Message after 15 days", "Send AI Follow-up Message after 30 days", "Send AI Follow-up Message after 45 days", "Send AI Follow-up Message after 60 days"],
    note: "The AI agent must be Live for texts. Otherwise these steps are skipped.",
    build: () => draft("60-day AI lead follow-up", trigger("suprah_leads", "lead_created", once(60)), [15, 30, 45, 60].map((days) =>
      step("send_ai_follow_up", { instructions: "Check in about the vehicle they asked about and offer to set up a time to visit.", timing: after(days, "days") }),
    )),
  },
  {
    key: "appointment-confirmation",
    name: "Appointment confirmation",
    description: "Texts the customer their appointment right after it is booked and asks them to confirm.",
    trigger: "Appointment booked",
    steps: ["Send an Appointment Confirmation right away"],
    build: () => draft("Appointment confirmation", trigger("suprah", "appointment_booked", EVERY_TIME), [
      step("send_appointment_confirmation"),
    ]),
  },
  {
    key: "day-before-reminder",
    name: "Day-before reminder",
    description: "Texts the customer a reminder one day before their appointment.",
    trigger: "Appointment booked",
    steps: ["Send a Message 1 day before the appointment"],
    build: () => draft("Day-before reminder", trigger("suprah", "appointment_booked", EVERY_TIME), [
      step("send_message", { body: "Hi {first_name}, this is a reminder that your appointment at {location_name} is tomorrow. Reply here if you need to change the time.", timing: before(1, "days") }),
    ]),
  },
  {
    key: "price-drop-alert",
    name: "Price drop alert",
    description: "Texts leads who asked about a vehicle when its price goes down.",
    trigger: "Vehicle price dropped",
    steps: ["Send a Message right away"],
    build: () => draft("Price drop alert", trigger("inventory", "vehicle_price_dropped", once(7)), [
      step("send_message", { body: "Hi {first_name}, good news from {dealership_name}! The {vehicle} you asked about just dropped to {vehicle_price}. {vehicle_link}" }),
    ]),
  },
]

export function findAutomationTemplate(key: string | null | undefined): AutomationTemplate | null {
  return AUTOMATION_TEMPLATES.find((template) => template.key === key) || null
}
