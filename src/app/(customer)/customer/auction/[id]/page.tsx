"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  CarFront,
  Pencil,
  Trash2,
  Undo2,
  Send,
  Loader2,
  AlertTriangle,
  Gauge,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchListing,
  withdrawListing,
  deleteListing,
  submitListing,
  getListingTitle,
  formatPrice,
  PHOTO_SLOT_META,
  AuctionListing,
} from "@/lib/api/auctionListings";
import { ListingStatusBadge } from "@/components/customer/auction/ListingStatusBadge";
import { ListingStatusTimeline } from "@/components/customer/auction/ListingStatusTimeline";
import { resolveImageUrl, cn } from "@/lib/utils";

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
    <div className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 p-4 sm:p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activePhoto, setActivePhoto] = React.useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["auctionListing", id],
    queryFn: () => fetchListing(id),
    enabled: !!id,
  });

  const refresh = (updated: AuctionListing) => {
    queryClient.setQueryData(["auctionListing", id], updated);
    queryClient.invalidateQueries({ queryKey: ["auctionListings"] });
  };

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawListing(id),
    onSuccess: (updated) => {
      refresh(updated);
      toast.success("Listing withdrawn");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to withdraw listing"),
  });

  const resubmitMutation = useMutation({
    mutationFn: () => submitListing(id),
    onSuccess: (updated) => {
      refresh(updated);
      toast.success("Listing resubmitted for review!");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to resubmit listing"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auctionListings"] });
      toast.success("Listing deleted");
      router.push("/customer?tab=sell");
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || "Failed to delete listing"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">This listing could not be found.</p>
        <Link href="/customer?tab=sell">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Listings
          </Button>
        </Link>
      </div>
    );
  }

  const photos = listing.photos;
  const mainPhoto = photos[Math.min(activePhoto, Math.max(photos.length - 1, 0))];
  const price = formatPrice(listing.askingPrice);
  const canEdit = listing.status === "DRAFT" || listing.status === "REJECTED";
  const canDelete = ["DRAFT", "REJECTED", "WITHDRAWN"].includes(listing.status);
  const isBusy = withdrawMutation.isPending || resubmitMutation.isPending || deleteMutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/customer?tab=sell"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to listings"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-foreground sm:text-xl">
              {getListingTitle(listing)}
            </h1>
            <div className="flex items-center gap-2">
              <ListingStatusBadge status={listing.status} />
              {price && (
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {price}
                  {listing.isNegotiable && (
                    <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">· Negotiable</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Link href={`/customer/auction/${listing.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" disabled={isBusy}>
                <Pencil className="h-3.5 w-3.5" />
                {listing.status === "REJECTED" ? "Edit & Resubmit" : "Continue Editing"}
              </Button>
            </Link>
          )}

          {listing.status === "WITHDRAWN" && (
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs"
              disabled={isBusy}
              onClick={() => resubmitMutation.mutate()}
            >
              {resubmitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Resubmit
            </Button>
          )}

          {listing.status === "UNDER_REVIEW" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs" disabled={isBusy}>
                  {withdrawMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                  Withdraw
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw this listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your car will be pulled from review. You can resubmit it anytime.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => withdrawMutation.mutate()}>Withdraw</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl text-xs text-red-600 dark:text-red-400 hover:text-red-700"
                  disabled={isBusy}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the listing and all its photos. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => deleteMutation.mutate()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {listing.status === "REJECTED" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/8 p-3.5 dark:bg-red-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-red-700 dark:text-red-400">This listing was rejected</p>
            <p className="text-xs text-red-700/80 dark:text-red-400/80">
              {listing.rejectionReason || "No reason was provided. You can edit the listing and resubmit it."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
            <div className="relative aspect-video bg-muted">
              {mainPhoto ? (
                <img
                  src={resolveImageUrl(mainPhoto.url) || ""}
                  alt={PHOTO_SLOT_META[mainPhoto.slot].label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <CarFront className="h-10 w-10" />
                  <span className="text-xs font-semibold">No photos uploaded</span>
                </div>
              )}
              {mainPhoto && (
                <span className="absolute left-3 bottom-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold text-foreground">
                  {PHOTO_SLOT_META[mainPhoto.slot].label}
                </span>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {photos.map((photo, i) => (
                  <button
                    key={`${photo.slot}-${photo.url}`}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition-all",
                      i === activePhoto ? "border-primary ring-1 ring-primary/40" : "border-border/50 opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={resolveImageUrl(photo.url) || ""} alt={PHOTO_SLOT_META[photo.slot].label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Section title="Vehicle Details">
            <SpecGrid
              rows={[
                { label: "VIN", value: listing.vin },
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
            {listing.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {listing.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold text-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </Section>

          {listing.description && (
            <Section title="Description">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground sm:text-sm">{listing.description}</p>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Quick Facts">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Asking Price
                </span>
                <span className="text-sm font-black text-foreground tabular-nums">{price || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  Mileage
                </span>
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {listing.mileage ? `${listing.mileage.toLocaleString()} mi` : "—"}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Status Timeline">
            <ListingStatusTimeline listing={listing} />
          </Section>
        </div>
      </div>
    </div>
  );
}
