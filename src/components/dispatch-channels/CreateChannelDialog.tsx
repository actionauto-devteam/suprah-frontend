"use client";

import * as React from "react";
import { Hash, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { userErrorMessage } from "@/lib/user-error";
import { dispatchChannelsApi, type ChannelDetail, type ChannelPerson } from "@/lib/api/dispatch-channels";
import { ChannelPeoplePicker, PersonAvatar, personLabel } from "@/components/dispatch-channels/channel-people";

/** Staff create a channel and add drivers and staff from any organization. */
export function CreateChannelDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channel: ChannelDetail) => void;
}) {
  const { getToken } = useAuth();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [people, setPeople] = React.useState<ChannelPerson[]>([]);
  const [saving, setSaving] = React.useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setPeople([]);
  };

  const create = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Give the channel a name of at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const channel = await dispatchChannelsApi.create(getToken, {
        name: trimmed,
        description: description.trim(),
        memberIds: people.map((person) => person.id),
      });
      toast.success(`Channel "${channel.name}" created`);
      reset();
      onOpenChange(false);
      onCreated(channel);
    } catch (error) {
      toast.error(userErrorMessage(error, "create the channel"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0 text-left">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Suprah AI · Dispatch Channel
              </p>
              <DialogTitle className="text-base font-black tracking-tight">New channel</DialogTitle>
            </div>
          </div>
          <DialogDescription>
            A group chat for drivers and staff from any organization. You&apos;ll be its administrator, and the people you
            add join right away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="channel-name" className="text-xs font-semibold">Name</label>
            <Input
              id="channel-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="For example: Denver weekend runs"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="channel-description" className="text-xs font-semibold">Description (optional)</label>
            <Textarea
              id="channel-description"
              value={description}
              maxLength={500}
              rows={2}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this channel is for"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold">People</p>
            {people.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {people.map((person) => (
                  <li key={person.id} className="flex items-center gap-1.5 rounded-full border border-border/60 py-0.5 pl-0.5 pr-2 text-xs">
                    <PersonAvatar person={person} className="size-5" />
                    <span className="max-w-40 truncate">{person.name}</span>
                    <span className="text-muted-foreground">· {personLabel(person)}</span>
                    <button
                      type="button"
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${person.name}`}
                      onClick={() => setPeople((current) => current.filter((item) => item.id !== person.id))}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ChannelPeoplePicker
              actionLabel="Add"
              excludeIds={people.map((person) => person.id)}
              disabled={saving}
              onPick={(person) => setPeople((current) => [...current, person])}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void create()} disabled={saving || name.trim().length < 2}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Create channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
