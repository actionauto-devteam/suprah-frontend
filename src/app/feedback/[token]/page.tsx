"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackView = {
  dealershipName: string;
  firstName: string;
  reviewLink: string | null;
  rating: number | null;
  comment: string;
  answeredAt: string | null;
  expired: boolean;
};

type Step = "loading" | "invalid" | "form" | "thanks";

const RATING_WORDS = ["", "Very bad", "Bad", "Okay", "Good", "Great"];
const MAX_COMMENT = 2000;

function safeExternalLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ReviewLink({ href, dealershipName }: { href: string | null; dealershipName: string }) {
  if (!href) return null;
  return (
    <div className="rounded-xl border bg-muted/40 p-4 text-center">
      <p className="text-sm text-muted-foreground">Want to share your experience with others too?</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-semibold hover:bg-muted sm:w-auto"
      >
        Leave a public review for {dealershipName}
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function CustomerFeedbackPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const [step, setStep] = React.useState<Step>("loading");
  const [view, setView] = React.useState<FeedbackView | null>(null);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    let cancelled = false;
    fetch(`/api/feedback/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !body?.data) {
          setStep("invalid");
          return;
        }
        const data = body.data as FeedbackView;
        setView(data);
        setRating(data.rating || 0);
        setComment(data.comment || "");
        setStep(data.answeredAt ? "thanks" : "form");
      })
      .catch(() => {
        if (!cancelled) setStep("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !rating) {
      setError("Please pick from 1 to 5 stars.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/feedback/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.data) {
        setError(typeof body?.message === "string" ? body.message : "We couldn't save your answer. Please try again.");
        return;
      }
      setView(body.data as FeedbackView);
      setStep("thanks");
    } catch {
      setError("We couldn't save your answer. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const reviewHref = safeExternalLink(view?.reviewLink || null);
  const shown = hover || rating;

  return (
    <div className="flex h-dvh overflow-y-auto bg-zinc-100 px-4 py-8 dark:bg-zinc-950">
      <div className="m-auto w-full max-w-md space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading…
          </div>
        )}

        {step === "invalid" && (
          <div className="space-y-2 py-6 text-center">
            <h1 className="text-lg font-semibold">This link isn&apos;t working</h1>
            <p className="text-sm text-muted-foreground">Please check that you opened the full link from the text or email we sent you.</p>
          </div>
        )}

        {view && step === "form" && view.expired && (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{view.dealershipName}</p>
              <h1 className="text-lg font-semibold">This link has expired</h1>
              <p className="text-sm text-muted-foreground">Thanks for thinking of us. You can still reach us by replying to our last message.</p>
            </div>
            <ReviewLink href={reviewHref} dealershipName={view.dealershipName} />
          </div>
        )}

        {view && step === "form" && !view.expired && (
          <form onSubmit={submit} className="space-y-5" aria-label="Rate your visit">
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{view.dealershipName}</p>
              <h1 className="text-xl font-semibold">How did we do{view.firstName ? `, ${view.firstName}` : ""}?</h1>
              <p className="text-sm text-muted-foreground">Your answer goes straight to our team.</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="sr-only">Your rating</legend>
              <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value === 1 ? "" : "s"}, ${RATING_WORDS[value]}`}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHover(value)}
                    onFocus={() => setHover(value)}
                    onBlur={() => setHover(0)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                  >
                    <Star className={cn("h-9 w-9 transition", value <= shown ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600")} />
                  </button>
                ))}
              </div>
              <p className="h-5 text-center text-sm font-medium text-muted-foreground" aria-live="polite">
                {shown ? RATING_WORDS[shown] : "Tap a star"}
              </p>
            </fieldset>

            <label className="block space-y-1.5 text-sm font-medium">
              Anything you want to tell us? (optional)
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT))}
                rows={4}
                className="w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base font-normal outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Send my answer
            </button>

            <ReviewLink href={reviewHref} dealershipName={view.dealershipName} />
          </form>
        )}

        {view && step === "thanks" && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h1 className="text-xl font-semibold">Thank you{view.firstName ? `, ${view.firstName}` : ""}!</h1>
              <p className="text-sm text-muted-foreground">
                We got your answer{view.rating ? ` (${view.rating} star${view.rating === 1 ? "" : "s"})` : ""}. Our team at {view.dealershipName} will see it.
              </p>
              {!view.expired && (
                <button type="button" onClick={() => setStep("form")} className="inline-flex min-h-10 items-center text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                  Change my answer
                </button>
              )}
            </div>
            <ReviewLink href={reviewHref} dealershipName={view.dealershipName} />
          </div>
        )}
      </div>
    </div>
  );
}
