"use client";

/**
 * SuprahPay's own notice (2026-11-23): the app's usual toast card, in the
 * SuprahPay look (wordmark, green rail, light and dark themes), for money
 * actions such as sending an invoice. It goes through sonner like every other
 * toast, so it joins the app's one-card toast deck and its screen-reader
 * announcements.
 */
import * as React from "react";
import { toast } from "sonner";
import { CircleCheck, OctagonX, X } from "lucide-react";
import { FONT, T, Wordmark } from "@/components/billing/ui";

type Tone = "success" | "error";

function SuprahPayToastCard({
  id,
  tone,
  title,
  description,
}: {
  id: string | number;
  tone: Tone;
  title: string;
  description?: string;
}) {
  const success = tone === "success";
  const Icon = success ? CircleCheck : OctagonX;
  return (
    <div
      style={{
        fontFamily: FONT,
        borderRadius: 14,
        border: `1px solid ${success ? T.brandBorder : "rgba(248,113,113,0.40)"}`,
        background: T.surface,
        color: T.text,
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          height: 3,
          background: success
            ? `linear-gradient(90deg, ${T.mint}, ${T.brand} 45%, transparent)`
            : `linear-gradient(90deg, ${T.danger}, transparent)`,
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 10px 12px 14px" }}>
        <span
          aria-hidden
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            width: 32, height: 32, borderRadius: 10, background: success ? T.brandSoft : T.dangerBg,
          }}
        >
          <Icon style={{ width: 16, height: 16, color: success ? T.brand : T.danger }} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Wordmark size={12} />
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>{title}</p>
          {description && (
            <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.45, color: T.textSub, overflowWrap: "anywhere" }}>
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label="Dismiss notification"
          className="transition-colors hover:bg-muted"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", color: T.textMute, cursor: "pointer",
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

/** SuprahPay notices: suprahPayToast.success("Invoice sent", "…") / .error(…). */
export const suprahPayToast = {
  success: (title: string, description?: string) =>
    toast.custom((id) => <SuprahPayToastCard id={id} tone="success" title={title} description={description} />),
  // Problems stay on screen longer, so there's time to read what to fix.
  error: (title: string, description?: string) =>
    toast.custom((id) => <SuprahPayToastCard id={id} tone="error" title={title} description={description} />, { duration: 8000 }),
};
