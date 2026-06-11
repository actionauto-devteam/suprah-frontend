"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#09090b", color: "#fafafa" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0, maxWidth: 360 }}>
            The app hit an unexpected error. Your account is safe — reload the page or go back to the app.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={reset}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#fafafa",
                color: "#09090b",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#fafafa",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to App
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
