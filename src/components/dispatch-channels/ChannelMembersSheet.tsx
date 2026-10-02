"use client";

import * as React from "react";
import { Check, Crown, Loader2, LogOut, MoreHorizontal, Pencil, ShieldCheck, Lock, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { userErrorMessage } from "@/lib/user-error";
import { dispatchChannelsApi, type ChannelDetail, type ChannelMember } from "@/lib/api/dispatch-channels";
import { ChannelPeoplePicker, PersonAvatar, personLabel } from "@/components/dispatch-channels/channel-people";
import { ChatDetailsMemberRow } from "@/components/dispatch-chat/ChatDetailsPanel";

type Confirm =
  | { kind: "remove"; member: ChannelMember }
  | { kind: "leave" }
  | { kind: "close" };

/**
 * People and settings for a channel, in a side panel (Suprah Mail and the
 * classic channel view). The rules live in ChannelPeopleManager.
 */
export function ChannelMembersSheet({
  open,
  onOpenChange,
  channel,
  viewerId,
  onChanged,
  onGone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelDetail;
  viewerId: string;
  onChanged: (channel: ChannelDetail) => void;
  onGone: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b border-border/60 bg-gradient-to-r from-emerald-500/[0.07] via-background to-background">
          <div className="flex min-w-0 items-center gap-2.5 pr-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Suprah AI · Channel people
              </p>
              <SheetTitle className="truncate text-base font-black tracking-tight">{channel.name}</SheetTitle>
            </div>
          </div>
          <SheetDescription>
            {channel.status === "closed"
              ? "This channel is closed. Its history stays readable, but nothing new can be added."
              : channel.description || "Group chat for drivers and staff."}
          </SheetDescription>
        </SheetHeader>

        <ChannelPeopleManager
          channel={channel}
          viewerId={viewerId}
          onChanged={onChanged}
          onLeft={() => {
            onOpenChange(false);
            onGone();
          }}
          className="px-4 pb-6 pt-4"
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * People and settings for a channel. Administrators (including the creator)
 * add or remove people and change roles, never for the creator; members
 * suggest people; anyone but the creator can leave; the creator can close it.
 * layout "details": the Members tab of the driver's Dispatch Chat Details,
 * with the people first in Suprah Space–style rows.
 */
export function ChannelPeopleManager({
  channel,
  viewerId,
  onChanged,
  onLeft,
  layout = "sheet",
  className,
}: {
  channel: ChannelDetail;
  viewerId: string;
  onChanged: (channel: ChannelDetail) => void;
  /** The viewer left the channel. */
  onLeft: () => void;
  layout?: "sheet" | "details";
  className?: string;
}) {
  const { getToken } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(channel.name);
  const [description, setDescription] = React.useState(channel.description);

  const isAdmin = channel.myRole === "admin";
  const isOpen = channel.status === "open";
  const memberIds = channel.members.map((member) => member.id);
  const pendingIds = channel.suggestions.map((item) => item.person.id);

  const run = async (action: () => Promise<ChannelDetail | null | void>, success?: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result) onChanged(result);
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(userErrorMessage(error, "update the channel"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEditing = () => {
    setName(channel.name);
    setDescription(channel.description);
    setEditing(true);
  };

  const saveDetails = async () => {
    const saved = await run(
      () => dispatchChannelsApi.update(getToken, channel.id, { name: name.trim(), description: description.trim() }),
      "Channel updated",
    );
    if (saved) setEditing(false);
  };

  const confirmAction = async () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;
    if (current.kind === "remove") {
      await run(() => dispatchChannelsApi.removeMember(getToken, channel.id, current.member.id), `${current.member.name} was removed`);
    } else if (current.kind === "leave") {
      const left = await run(() => dispatchChannelsApi.leave(getToken, channel.id), "You left the channel");
      if (left) onLeft();
    } else {
      await run(() => dispatchChannelsApi.close(getToken, channel.id), "Channel closed");
    }
  };

  const manageMenu = (member: ChannelMember) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="size-7" aria-label={`Manage ${member.name}`} disabled={busy}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            void run(
              () => dispatchChannelsApi.changeRole(getToken, channel.id, member.id, member.role === "admin" ? "member" : "admin"),
              member.role === "admin" ? `${member.name} is now a member` : `${member.name} is now an administrator`,
            )
          }
        >
          {member.role === "admin" ? "Make member" : "Make administrator"}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm({ kind: "remove", member })}>
          Remove from channel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renameSection = isAdmin && isOpen && (
    <section className="space-y-2">
      {layout === "details" && (
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Channel name and description</h3>
      )}
      {editing ? (
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} aria-label="Channel name" />
          <Textarea
            value={description}
            maxLength={500}
            rows={2}
            onChange={(event) => setDescription(event.target.value)}
            aria-label="Channel description"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void saveDetails()} disabled={busy || name.trim().length < 2}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={startEditing}>
          <Pencil className="mr-1.5 size-3.5" /> Rename or describe
        </Button>
      )}
    </section>
  );

  const approvalsSection = isAdmin && isOpen && channel.suggestions.length > 0 && (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Waiting for approval</h3>
      <ul className="space-y-1.5">
        {channel.suggestions.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
            <PersonAvatar person={item.person} className="size-7" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.person.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {personLabel(item.person)} · suggested by {item.suggestedBy.name}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              aria-label={`Approve ${item.person.name}`}
              disabled={busy}
              onClick={() => void run(() => dispatchChannelsApi.decideSuggestion(getToken, channel.id, item.id, true), `${item.person.name} was added`)}
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              aria-label={`Decline ${item.person.name}`}
              disabled={busy}
              onClick={() => void run(() => dispatchChannelsApi.decideSuggestion(getToken, channel.id, item.id, false), "Suggestion declined")}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );

  const peopleSection =
    layout === "details" ? (
      <section className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {channel.members.length} {channel.members.length === 1 ? "member" : "members"}
        </h3>
        <ul className="space-y-0.5">
          {channel.members.map((member) => {
            const canManage = isAdmin && isOpen && !member.isCreator && member.id !== viewerId;
            const role = member.isCreator ? "Creator" : member.role === "admin" ? "Admin" : null;
            return (
              <ChatDetailsMemberRow
                key={member.id}
                avatar={<PersonAvatar person={member} className="size-10" />}
                name={
                  <>
                    {member.name}
                    {member.id === viewerId && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                  </>
                }
                note={role ? `${role} · ${personLabel(member)}` : personLabel(member)}
                noteTone={role ? "accent" : "muted"}
                trailing={canManage ? manageMenu(member) : undefined}
              />
            );
          })}
        </ul>
      </section>
    ) : (
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          People ({channel.members.length})
        </h3>
        <ul className="space-y-1">
          {channel.members.map((member) => {
            const canManage = isAdmin && isOpen && !member.isCreator && member.id !== viewerId;
            return (
              <li key={member.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                <PersonAvatar person={member} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {member.name}
                    {member.id === viewerId && <span className="text-[11px] font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{personLabel(member)}</p>
                </div>
                {member.isCreator ? (
                  <Badge variant="outline" className="gap-1 text-[10px]"><Crown className="size-3" /> Creator</Badge>
                ) : member.role === "admin" ? (
                  <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="size-3" /> Admin</Badge>
                ) : null}
                {canManage && manageMenu(member)}
              </li>
            );
          })}
        </ul>
      </section>
    );

  const addSection = isOpen && isAdmin && (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Add people</h3>
      <p className="text-[11px] text-muted-foreground">They join right away and are notified.</p>
      <ChannelPeoplePicker
        actionLabel="Add"
        excludeIds={memberIds}
        disabled={busy}
        onPick={(person) => void run(() => dispatchChannelsApi.addMembers(getToken, channel.id, [person.id]), `${person.name} was added`)}
      />
    </section>
  );

  const suggestSection = isOpen && !isAdmin && (
    <section className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Suggest someone</h3>
      <p className="text-[11px] text-muted-foreground">An administrator approves before they join.</p>
      {channel.suggestions.length > 0 && (
        <ul className="space-y-1">
          {channel.suggestions.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <PersonAvatar person={item.person} className="size-6" />
              <span className="truncate">{item.person.name}</span>
              <span>· waiting for approval</span>
            </li>
          ))}
        </ul>
      )}
      <ChannelPeoplePicker
        actionLabel="Suggest"
        excludeIds={[...memberIds, ...pendingIds]}
        disabled={busy}
        onPick={(person) => void run(() => dispatchChannelsApi.suggest(getToken, channel.id, person.id), `You suggested ${person.name}`)}
      />
    </section>
  );

  const leaveSection = (
    <section className="space-y-2 border-t border-border/60 pt-4">
      {!channel.isCreator && (
        <Button type="button" variant="outline" className="w-full justify-start text-destructive" disabled={busy} onClick={() => setConfirm({ kind: "leave" })}>
          <LogOut className="mr-2 size-4" /> Leave channel
        </Button>
      )}
      {channel.isCreator && isOpen && (
        <Button type="button" variant="outline" className="w-full justify-start" disabled={busy} onClick={() => setConfirm({ kind: "close" })}>
          <Lock className="mr-2 size-4" /> Close channel
        </Button>
      )}
      {busy && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      )}
    </section>
  );

  return (
    <>
      {layout === "details" ? (
        <div className={["space-y-5", className].filter(Boolean).join(" ")}>
          {approvalsSection}
          {peopleSection}
          {addSection}
          {suggestSection}
          {renameSection}
          {leaveSection}
        </div>
      ) : (
        <div className={["space-y-5", className].filter(Boolean).join(" ")}>
          {renameSection}
          {approvalsSection}
          {peopleSection}
          {addSection}
          {suggestSection}
          {leaveSection}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(next) => !next && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "remove" ? `Remove ${confirm.member.name}?` : confirm?.kind === "leave" ? "Leave this channel?" : "Close this channel?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "remove"
                ? "They lose access to the channel, including its history. You can add them again later."
                : confirm?.kind === "leave"
                  ? "You lose access to the channel, including its history. An administrator can add you again."
                  : "Nobody can post, add people or change roles after it's closed. Its history stays readable to everyone in it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmAction()}>
              {confirm?.kind === "remove" ? "Remove" : confirm?.kind === "leave" ? "Leave" : "Close channel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
