"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { yapline } from "@/lib/yapline-store";

const ini = (name?: string | null) =>
  (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

interface SummonableMember {
  _id: string;
  fullName?: string;
  avatar?: string | null;
}

interface YapLineSummonMenuProps {
  conversationId: string;
  members: SummonableMember[];
  /** userIds currently on the line — excluded, pinging them is a no-op */
  activeParticipantIds: string[];
  myUserId?: string | null;
  trigger: React.ReactNode;
}

/**
 * "Summon" trigger shared by the Dock, Dashboard widget, and full YapLine
 * page — lets a member either ping the whole channel or pick one specific
 * person ("hey, I need you here") instead of always broadcasting to everyone.
 */
export function YapLineSummonMenu({
  conversationId,
  members,
  activeParticipantIds,
  myUserId,
  trigger,
}: YapLineSummonMenuProps) {
  const activeSet = React.useMemo(() => new Set(activeParticipantIds), [activeParticipantIds]);
  const others = React.useMemo(
    () => members.filter((m) => m._id !== myUserId && !activeSet.has(m._id)),
    [members, myUserId, activeSet]
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => yapline.pingChannel(conversationId)} className="gap-2">
          <Users className="size-3.5 text-muted-foreground/60" />
          Summon everyone
        </DropdownMenuItem>
        {others.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {others.map((m) => (
              <DropdownMenuItem
                key={m._id}
                onClick={() => yapline.pingChannel(conversationId, m._id, m.fullName || "them")}
                className="gap-2"
              >
                <Avatar className="size-5">
                  <AvatarImage src={m.avatar ? resolveImageUrl(m.avatar) : undefined} />
                  <AvatarFallback className="text-[9px]">{ini(m.fullName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{m.fullName || "Unknown"}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
