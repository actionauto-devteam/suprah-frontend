"use client";

/**
 * ShopAssistant.tsx
 *
 * Suprah Autrix — AI vehicle recommendation assistant, embedded in the
 * Customer Shop Vehicle module.
 *
 * Renders as either a floating launcher (`mode="float"`) or an inline panel
 * (`mode="inline"`). It pairs a conversational chat with structured, in-stock
 * recommendation cards (real prices/specs/match scores from the inventory),
 * quick-action chips, and a live preference summary.
 */

import * as React from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  ChevronDown,
  RotateCcw,
  Gauge,
  Fuel,
  Settings2,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { SupraLeoAvatar } from "@/components/supra-leo-ai/SupraLeoAvatar";
import {
  useShopAssistant,
  Recommendation,
  ShopMessage,
  ShopPreferences,
} from "@/hooks/useShopAssistant";
import { cn } from "@/lib/utils";

type Mode = "inline" | "float";

interface ShopAssistantProps {
  mode?: Mode;
  /** Base path for a vehicle detail page; the card links to `${base}/${id}`. */
  vehicleHrefBase?: string;
  /** Optional: intercept a card tap instead of navigating. */
  onViewVehicle?: (rec: Recommendation) => void;
  /** Extra mobile clearance (px) above the bottom nav, e.g. when a comparison tray is also floating. */
  mobileBottomOffset?: number;
}

// ─── Tiny markdown (bold / code / line breaks only) ─────────────────────────

function renderInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

// ─── Match score badge ──────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-emerald-600 text-white"
      : score >= 60
        ? "bg-amber-500 text-white"
        : "bg-muted text-muted-foreground border border-border/50";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
        tone
      )}
    >
      <Sparkles className="h-3 w-3" />
      {score}% match
    </span>
  );
}

// ─── Recommendation card ────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  hrefBase,
  onView,
}: {
  rec: Recommendation;
  hrefBase: string;
  onView?: (rec: Recommendation) => void;
}) {
  const inner = (
    <>
      <div className="relative h-32 w-full overflow-hidden bg-muted">
        <img
          src={rec.image}
          alt={rec.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-2 top-2">
          <MatchBadge score={rec.matchScore} />
        </div>
        {rec.bodyStyle && (
          <span className="absolute right-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
            {rec.bodyStyle}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{rec.name}</p>
          <p className="shrink-0 text-sm font-bold text-emerald-600">
            {rec.priceLabel}
          </p>
        </div>

        {rec.specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {rec.mileage ? (
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {rec.mileage.toLocaleString()} mi
              </span>
            ) : null}
            {rec.fuelType ? (
              <span className="inline-flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                {rec.fuelType}
              </span>
            ) : null}
            {rec.transmission ? (
              <span className="inline-flex items-center gap-1">
                <Settings2 className="h-3 w-3" />
                {rec.transmission}
              </span>
            ) : null}
            {rec.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {rec.location}
              </span>
            ) : null}
          </div>
        )}

        {rec.matchReasons.length > 0 && (
          <ul className="space-y-0.5">
            {rec.matchReasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-foreground/80"
              >
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                {r}
              </li>
            ))}
          </ul>
        )}

        {rec.tradeoffs.length > 0 && (
          <p className="text-[10.5px] italic text-amber-600/90">
            {rec.tradeoffs.join(" · ")}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] font-medium text-emerald-600 group-hover:gap-2 transition-all">
          View details <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </>
  );

  const className =
    "group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card text-left transition-all hover:border-emerald-500/40 hover:shadow-md";

  if (onView) {
    return (
      <button type="button" onClick={() => onView(rec)} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <a href={`${hrefBase}/${rec.id}`} className={className}>
      {inner}
    </a>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  hrefBase,
  onView,
}: {
  msg: ShopMessage;
  hrefBase: string;
  onView?: (rec: Recommendation) => void;
}) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1">
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm leading-relaxed text-white">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 px-4 py-1">
      <div className="mt-0.5 shrink-0">
        <SupraLeoAvatar state={msg.pending ? "thinking" : "idle"} size={28} animate={!!msg.pending} />
      </div>
      <div className="flex max-w-[85%] flex-col gap-2">
        {msg.pending && !msg.content ? (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/40 bg-muted px-3.5 py-2.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl rounded-tl-sm border border-border/40 bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:text-[12px] [&_strong]:font-semibold [&_strong]:text-emerald-700 dark:[&_strong]:text-emerald-400"
            dangerouslySetInnerHTML={{ __html: renderInline(msg.content) }}
          />
        )}

        {msg.recommendations && msg.recommendations.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {msg.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                hrefBase={hrefBase}
                onView={onView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Active preference summary ──────────────────────────────────────────────

function prefChips(p: ShopPreferences): string[] {
  const chips: string[] = [];
  p.vehicleTypes.forEach((t) => chips.push(t));
  if (p.budgetMax != null)
    chips.push(
      p.budgetMin != null
        ? `$${(p.budgetMin / 1000).toFixed(0)}k–$${(p.budgetMax / 1000).toFixed(0)}k`
        : `≤ $${(p.budgetMax / 1000).toFixed(0)}k`
    );
  p.brands.forEach((b) => chips.push(b));
  p.fuelTypes.forEach((f) => chips.push(f));
  if (p.passengers != null) chips.push(`${p.passengers} seats`);
  p.usage.forEach((u) => chips.push(u));
  return chips;
}

function PreferenceBar({ preferences }: { preferences: ShopPreferences }) {
  const chips = prefChips(preferences);
  if (!chips.length) return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-card/60 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        Looking for
      </span>
      {chips.map((c, i) => (
        <span
          key={i}
          className="shrink-0 rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({
  onClose,
  onReset,
  hasMessages,
}: {
  onClose?: () => void;
  onReset: () => void;
  hasMessages: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-card px-4 py-3">
      <SupraLeoAvatar state="idle" size={34} animate />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold leading-none">
          Suprah Autrix
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Your personal vehicle consultant
        </p>
      </div>
      {hasMessages && (
        <button
          onClick={onReset}
          title="Start over"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Starter prompts (empty state) ──────────────────────────────────────────

const STARTERS = [
  "I need a family SUV under $40,000",
  "Show me fuel-efficient cars for commuting",
  "I want an electric vehicle",
  "Help me find a reliable first car",
];

// ─── Conversation surface (shared by both modes) ────────────────────────────

function Conversation({
  mode,
  hrefBase,
  onView,
  onClose,
}: {
  mode: Mode;
  hrefBase: string;
  onView?: (rec: Recommendation) => void;
  onClose?: () => void;
}) {
  const {
    messages,
    preferences,
    suggestions,
    sending,
    loadingSession,
    error,
    sendMessage,
    resetSession,
  } = useShopAssistant();

  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 112) + "px";
  }, [input]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || sending) return;
    setInput("");
    sendMessage(t);
  };

  const showEmpty = !loadingSession && messages.length === 0;

  return (
    <>
      <Header
        onClose={onClose}
        onReset={resetSession}
        hasMessages={messages.length > 0}
      />
      <PreferenceBar preferences={preferences} />

      {/* Messages */}
      <div className="flex-1 space-y-1 overflow-y-auto py-3 [scrollbar-width:thin]">
        {loadingSession ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : showEmpty ? (
          <div className="flex flex-col items-center gap-5 px-6 py-8 text-center">
            <SupraLeoAvatar state="idle" size={64} animate />
            <div>
              <p className="text-base font-semibold">
                Let's find your perfect vehicle
              </p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Tell me what you're after — type, budget, how you'll use it — and
                I'll match it against our live inventory.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-card px-3.5 py-2.5 text-left text-sm text-foreground/80 transition-all hover:border-emerald-500/40 hover:bg-emerald-600/5 hover:text-foreground"
                >
                  {s}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              hrefBase={hrefBase}
              onView={onView}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {!showEmpty && suggestions.length > 0 && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1.5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              disabled={sending}
              className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[12px] text-foreground/80 transition-colors hover:border-emerald-500/40 hover:bg-emerald-600/10 hover:text-emerald-700 disabled:opacity-50 dark:hover:text-emerald-400"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="px-4 pb-1 text-[11px] text-destructive">{error}</p>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 px-3 pb-3 pt-2">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Describe what you're looking for…"
            rows={1}
            className="max-h-28 min-h-7 flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || sending}
            title="Send"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
              input.trim() && !sending
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                : "cursor-not-allowed bg-muted text-muted-foreground/40"
            )}
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Public component ───────────────────────────────────────────────────────

export default function ShopAssistant({
  mode = "inline",
  vehicleHrefBase = "/shop",
  onViewVehicle,
  mobileBottomOffset = 0,
}: ShopAssistantProps) {
  const [open, setOpen] = React.useState(false);

  if (mode === "float") {
    const mobileBottom = `calc(env(safe-area-inset-bottom) + ${76 + mobileBottomOffset}px)`;
    return (
      <>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open vehicle assistant"
            style={{ "--tw-mobile-bottom": mobileBottom } as React.CSSProperties}
            className="fixed bottom-(--tw-mobile-bottom) md:bottom-6 right-4 sm:right-6 z-45 flex h-12 sm:h-14 items-center gap-2 sm:gap-2.5 rounded-full bg-emerald-600 px-4 sm:px-5 text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl"
          >
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm font-semibold">Find my car</span>
          </button>
        )}
        {open && (
          <div
            style={{ "--tw-mobile-bottom": mobileBottom } as React.CSSProperties}
            className="fixed inset-x-3 bottom-(--tw-mobile-bottom) sm:inset-x-auto sm:right-6 md:bottom-6 z-45 flex h-[min(600px,75dvh)] sm:h-150 sm:max-h-[85dvh] w-auto sm:w-100 sm:max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl">
            <Conversation
              mode="float"
              hrefBase={vehicleHrefBase}
              onView={onViewVehicle}
              onClose={() => setOpen(false)}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-130 flex-col overflow-hidden rounded-2xl border border-border/50 bg-background">
      <Conversation
        mode="inline"
        hrefBase={vehicleHrefBase}
        onView={onViewVehicle}
      />
    </div>
  );
}