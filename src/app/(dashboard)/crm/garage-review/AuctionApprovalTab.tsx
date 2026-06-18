"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CarFront,
  Gauge,
  Tag,
  Mail,
  Phone,
  User as UserIcon,
  Loader2,
  Check,
  X,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  fetchReviewListings,
  approveListing,
  rejectListing,
  ReviewListing,
} from "@/lib/api/auctionReview";
import {
  ListingStatus,
  STATUS_META,
  PHOTO_SLOT_META,
  NAMED_PHOTO_SLOTS,
  getListingTitle,
  formatPrice,
} from "@/lib/api/auctionListings";
import { ListingStatusBadge } from "@/components/customer/auction/ListingStatusBadge";
import { cn, resolveImageUrl } from "@/lib/utils";

const FILTERS: ListingStatus[] = ["UNDER_REVIEW", "APPROVED", "REJECTED", "DRAFT", "SOLD", "WITHDRAWN"];

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

function SpecGrid({ rows }: { rows: { label: string; value?: string }[] }) {
  const visible = rows.filter((r) => r.value);
  if (visible.length === 0) return <p className="text-xs text-muted-foreground">Not provided.</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
      {visible.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</dt>
          <dd className="truncate text-xs font-semibold text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function AuctionApprovalTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<ListingStatus>("UNDER_REVIEW");
  const [active, setActive] = React.useState<ReviewListing | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["auctionReview", status],
    queryFn: () => fetchReviewListings(token, status),
    enabled: !!token,
  });

  const listings = data?.listings ?? [];
  const counts = data?.counts;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((s) => {
          const meta = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                status === s
                  ? "bg-card dark:bg-zinc-800 text-foreground border-border/40 shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
              {meta.label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums">{counts?.[s] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <div className="p-10 text-center border border-dashed rounded-2xl bg-card dark:bg-zinc-900/40 border-border/40">
          <CarFront className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">No {STATUS_META[status].label.toLowerCase()} listings</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const front = listing.photos.find((p) => p.slot === "FRONT") || listing.photos[0];
            const price = formatPrice(listing.askingPrice);
            return (
              <button
                key={listing.id}
                onClick={() => setActive(listing)}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 text-left hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="h-14 w-20 shrink-0 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {front ? (
                    <img src={resolveImageUrl(front.url) || ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <CarFront className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground truncate">{getListingTitle(listing)}</p>
                    <ListingStatusBadge status={listing.status} className="shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {listing.vin || "No VIN"} {listing.mileage ? `· ${listing.mileage.toLocaleString()} mi` : ""}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground truncate">{listing.userId?.name || listing.userId?.email || "Unknown seller"}</p>
                    <span className="text-xs font-black text-foreground tabular-nums shrink-0">{price || "—"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {active && (
        <ListingDetailDialog
          listing={active}
          token={token}
          onClose={() => setActive(null)}
          onUpdated={(updated) => {
            setActive(updated);
            queryClient.invalidateQueries({ queryKey: ["auctionReview"] });
          }}
        />
      )}
    </div>
  );
}

function ListingDetailDialog({
  listing,
  token,
  onClose,
  onUpdated,
}: {
  listing: ReviewListing;
  token: string;
  onClose: () => void;
  onUpdated: (updated: ReviewListing) => void;
}) {
  const [notes, setNotes] = React.useState("");
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [confirmingApprove, setConfirmingApprove] = React.useState(false);

  const approveMutation = useMutation({
    mutationFn: () => approveListing(token, listing.id, notes || undefined),
    onSuccess: (updated) => {
      toast.success("Listing approved and added to inventory");
      setConfirmingApprove(false);
      onUpdated(updated);
    },
    onError: (error: any) => {
      setConfirmingApprove(false);
      toast.error(error?.response?.data?.message || "Failed to approve listing");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectListing(token, listing.id, reason, notes || undefined),
    onSuccess: (updated) => {
      toast.success("Listing rejected and returned to customer");
      onUpdated(updated);
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || "Failed to reject listing"),
  });

  const isBusy = approveMutation.isPending || rejectMutation.isPending;
  const price = formatPrice(listing.askingPrice);
  const photos = listing.photos;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 sm:max-w-3xl">
        <DialogHeader className="px-5 py-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base font-black truncate">{getListingTitle(listing)}</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{listing.vin || "No VIN provided"}</p>
            </div>
            <ListingStatusBadge status={listing.status} className="shrink-0" />
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <Section title="Seller">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {listing.userId?.name || "Unknown"}
              </span>
              {listing.userId?.email && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {listing.userId.email}
                </span>
              )}
              {listing.userId?.phone && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {listing.userId.phone}
                </span>
              )}
            </div>
          </Section>

          {photos.length > 0 && (
            <Section title="Photos">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {NAMED_PHOTO_SLOTS.map((slot) => {
                  const photo = photos.find((p) => p.slot === slot);
                  if (!photo) return null;
                  return (
                    <div key={slot} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={resolveImageUrl(photo.url) || ""} alt={PHOTO_SLOT_META[slot].label} className="h-full w-full object-cover" />
                      <span className="absolute bottom-1 left-1 rounded-full bg-background/80 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-foreground">
                        {PHOTO_SLOT_META[slot].label}
                      </span>
                    </div>
                  );
                })}
                {photos.filter((p) => p.slot === "EXTRA").map((photo, i) => (
                  <div key={`extra-${i}`} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    <img src={resolveImageUrl(photo.url) || ""} alt="Extra" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Camera className="h-3 w-3" /> {photos.length} photo{photos.length === 1 ? "" : "s"}
              </p>
            </Section>
          )}

          <Section title="Vehicle Details">
            <SpecGrid
              rows={[
                { label: "Year", value: listing.year },
                { label: "Make", value: listing.make },
                { label: "Model", value: listing.model },
                { label: "Trim", value: listing.trim },
                { label: "Body Style", value: listing.bodyStyle },
                { label: "Mileage", value: listing.mileage ? `${listing.mileage.toLocaleString()} mi` : undefined },
                { label: "Transmission", value: listing.transmission },
                { label: "Fuel Type", value: listing.fuelType },
                { label: "Drivetrain", value: listing.driveTrain },
                { label: "Engine", value: listing.engine },
                { label: "Exterior", value: listing.exteriorColor },
                { label: "Interior", value: listing.interiorColor },
                { label: "Doors", value: listing.doors ? String(listing.doors) : undefined },
                { label: "Seats", value: listing.seats ? String(listing.seats) : undefined },
              ]}
            />
          </Section>

          <Section title="Condition & History">
            <SpecGrid
              rows={[
                { label: "Condition", value: listing.condition ? listing.condition.charAt(0) + listing.condition.slice(1).toLowerCase() : undefined },
                { label: "Title Status", value: listing.titleStatus ? listing.titleStatus.charAt(0) + listing.titleStatus.slice(1).toLowerCase() : undefined },
                { label: "Owners", value: listing.ownersCount ? String(listing.ownersCount) : undefined },
                { label: "Keys", value: listing.keysCount ? String(listing.keysCount) : undefined },
                { label: "Accident History", value: listing.hasAccidentHistory ? "Yes" : "No" },
                { label: "Service Records", value: listing.hasServiceHistory ? "Yes" : "No" },
              ]}
            />
            {listing.accidentNotes && (
              <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accident Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{listing.accidentNotes}</p>
              </div>
            )}
            {listing.knownIssues && (
              <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Known Issues</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{listing.knownIssues}</p>
              </div>
            )}
            {listing.features?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {listing.features.map((f) => (
                  <span key={f} className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold text-foreground">{f}</span>
                ))}
              </div>
            )}
          </Section>

          {listing.description && (
            <Section title="Description">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{listing.description}</p>
            </Section>
          )}

          <Section title="Pricing">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Asking Price
              </span>
              <span className="text-sm font-black text-foreground tabular-nums">
                {price || "—"}
                {listing.isNegotiable && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Negotiable</span>}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" /> Mileage
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">{listing.mileage ? `${listing.mileage.toLocaleString()} mi` : "—"}</span>
            </div>
          </Section>

          {listing.status === "UNDER_REVIEW" ? (
            <Section title="Review Decision">
              <div className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reviewer notes (optional, visible internally)…"
                  className="bg-muted/40 border-border/40 text-xs"
                  rows={2}
                />
                {rejecting && (
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rejection (required, shown to customer)…"
                    className="bg-muted/40 text-xs border-red-500/30"
                    rows={2}
                  />
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  {!rejecting ? (
                    <>
                      <Button
                        variant="outline"
                        className="gap-1.5 rounded-xl text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                        disabled={isBusy}
                        onClick={() => setRejecting(true)}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 rounded-xl font-bold"
                        disabled={isBusy}
                        onClick={() => setConfirmingApprove(true)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve &amp; Add to Inventory
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="rounded-xl" disabled={isBusy} onClick={() => setRejecting(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white"
                        disabled={isBusy || !reason.trim()}
                        onClick={() => rejectMutation.mutate()}
                      >
                        {rejectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Confirm Rejection
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Review History">
              <div className="space-y-2">
                {(listing.statusHistory ?? []).map((event, i) => {
                  const meta = STATUS_META[event.status];
                  return (
                    <div key={`${event.status}-${i}`} className="flex items-start gap-2.5">
                      <div className={cn("flex h-5 w-5 mt-0.5 shrink-0 items-center justify-center rounded-full", meta.badgeClass)}>
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">{meta.label}</p>
                        {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                        <p className="text-[10px] text-muted-foreground/70 tabular-nums">{formatDate(event.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {listing.reviewerNotes && (
                <div className="mt-3 rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reviewer Notes</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{listing.reviewerNotes}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      </DialogContent>

      <ConfirmationModal
        isOpen={confirmingApprove}
        onClose={() => setConfirmingApprove(false)}
        onConfirm={() => approveMutation.mutate()}
        isLoading={approveMutation.isPending}
        variant="warning"
        title="Add this vehicle to inventory?"
        description={`This will create a new permanent inventory record for the ${getListingTitle(listing)} (VIN ${listing.vin || "—"}) and cannot be undone from here. Double-check the VIN, year, and mileage above before confirming.`}
        confirmText="Approve & Add"
        cancelText="Cancel"
      />
    </Dialog>
  );
}
