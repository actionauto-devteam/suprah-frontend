import * as React from "react";
import { cn } from "@/lib/utils";

/** The first letter or number of a channel's name ("#" when it has none). */
export function channelInitial(name: string) {
  const first = Array.from(name.trim()).find((character) => /[\p{L}\p{N}]/u.test(character));
  return (first ?? "#").toLocaleUpperCase();
}

/**
 * A channel's picture, like Suprah Space's: the first letter of its name on
 * a purple circle (gray once the channel is closed). Size it with className.
 */
export function ChannelLetterAvatar({
  name,
  closed = false,
  className,
}: {
  name: string;
  closed?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none",
        closed ? "bg-muted text-muted-foreground" : "text-white",
        className,
      )}
      style={closed ? undefined : { background: "linear-gradient(140deg, #7038c0, #9b6fd6)" }}
    >
      {channelInitial(name)}
    </span>
  );
}
