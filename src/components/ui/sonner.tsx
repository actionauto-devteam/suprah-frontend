"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // A toast pinned to the literal top of the viewport renders straight
      // under the Dynamic Island / notch on an installed iOS PWA (no browser
      // chrome there to naturally push it down) — max() keeps the same
      // default spacing on devices with no safe-area-inset-top at all.
      offset={{
        top: "max(env(safe-area-inset-top), 1rem)",
        bottom: "max(env(safe-area-inset-bottom), 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      mobileOffset={{
        top: "max(env(safe-area-inset-top), 1rem)",
        bottom: "max(env(safe-area-inset-bottom), 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-foreground",
          description:
            "group-[.toast]:text-foreground/90 group-[.toast]:opacity-100",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-foreground",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover, var(--background, #ffffff))",
          "--normal-text": "var(--popover-foreground, var(--foreground, #0f172a))",
          "--normal-border": "var(--border, rgba(15, 23, 42, 0.15))",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
