"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Car, ExternalLink, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateMDT } from "@/lib/timezone";
import { useUser } from "@/providers/AuthProvider";
import {
  fetchLeadVehiclePreview,
  type InventoryVehicleSummary,
  type VehicleAvailability,
  type VehiclePreviewEntry,
} from "@/lib/api/leadVehiclePreview";

const INVENTORY_ROLES = new Set(["super_admin", "admin", "employee"]);

export interface VehicleLeadRef {
  _id?: string;
  vehicleId?: string | null;
  vehicle?: { vin?: string; stock?: string; year?: string; make?: string; model?: string } | null;
}

const AVAILABILITY_TONE: Record<VehicleAvailability, string> = {
  listed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  recon: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  in_transit: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  sold: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  archived: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  unknown: "border-slate-400/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const MATCH_LABEL: Record<string, string> = {
  linked: "Linked to this inquiry",
  vin: "Matched by VIN",
  stock: "Matched by stock number",
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const miles = new Intl.NumberFormat("en-US");

function availabilityLabel(vehicle: InventoryVehicleSummary): string {
  if (vehicle.availability === "archived") return "No longer in inventory";
  return vehicle.status || "Status unknown";
}

function vehicleTitle(vehicle: InventoryVehicleSummary): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
}

function entryTitle(entry: VehiclePreviewEntry): string {
  if (entry.vehicle) return vehicleTitle(entry.vehicle);
  if (entry.label) return entry.label;
  if (entry.requested.vin) return `VIN ${entry.requested.vin}`;
  if (entry.requested.stock) return `Stock # ${entry.requested.stock}`;
  return "Vehicle";
}

function similarText(count: number | null): string | null {
  if (count === null) return null;
  if (count === 0) return "No similar vehicles in current inventory.";
  if (count === 1) return "1 similar vehicle in inventory. Not confirmed.";
  return `${count} similar vehicles in inventory. Not confirmed.`;
}

function statusText(entry: VehiclePreviewEntry): string {
  if (entry.state === "not_found") {
    if (entry.reason === "vin") return `No vehicle with VIN ${entry.requested.vin} in your inventory.`;
    if (entry.reason === "stock") return `No vehicle with stock # ${entry.requested.stock} in your inventory.`;
    return "The linked vehicle is no longer in your inventory.";
  }
  if (entry.reason === "duplicate_stock") return `More than one inventory vehicle uses stock # ${entry.requested.stock}, so it can't be confirmed.`;
  if (entry.reason === "not_verified") return "The inventory link for this lead can't be confirmed.";
  return "Not linked to an inventory vehicle.";
}

function VehiclePhoto({ vehicle }: { vehicle: InventoryVehicleSummary }) {
  const [failed, setFailed] = React.useState(false);
  const showPhoto = Boolean(vehicle.photoUrl) && !failed;
  return (
    <div
      className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--border-1)", background: "var(--surface-2)" }}
    >
      {showPhoto ? (
        <img
          src={vehicle.photoUrl as string}
          alt={vehicleTitle(vehicle)}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Car className="h-6 w-6" style={{ color: "var(--text-tertiary)" }} aria-label="No photo available" />
      )}
    </div>
  );
}

function InventoryLink({ href, label, icon }: { href: string; label: string; icon: "open" | "search" }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
    >
      {icon === "open" ? <ExternalLink className="h-3 w-3" /> : <Search className="h-3 w-3" />}
      {label}
    </Link>
  );
}

function MatchedVehicle({ entry, canOpenInventory }: { entry: VehiclePreviewEntry; canOpenInventory: boolean }) {
  const vehicle = entry.vehicle as InventoryVehicleSummary;
  const facts: Array<{ label: string; value: string; wide?: boolean; mono?: boolean }> = [];
  if (vehicle.stockNumber) facts.push({ label: "Stock #", value: vehicle.stockNumber });
  if (vehicle.mileage !== null) facts.push({ label: "Mileage", value: `${miles.format(vehicle.mileage)} mi` });
  if (vehicle.exteriorColor) facts.push({ label: "Exterior", value: vehicle.exteriorColor });
  if (vehicle.vin) facts.push({ label: "VIN", value: vehicle.vin, wide: true, mono: true });

  return (
    <>
      <div className="mt-2 flex min-w-0 gap-3">
        <VehiclePhoto vehicle={vehicle} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug [overflow-wrap:anywhere]">{vehicleTitle(vehicle)}</p>
          {vehicle.trim && (
            <p className="text-[11px] leading-snug [overflow-wrap:anywhere]" style={{ color: "var(--text-secondary)" }}>{vehicle.trim}</p>
          )}
          {vehicle.price !== null && (
            <p className="mt-0.5 text-[13px] font-bold">
              {money.format(vehicle.price)}
              <span className="ml-1 text-[10px] font-normal" style={{ color: "var(--text-tertiary)" }}>listed price</span>
            </p>
          )}
          <span
            className={cn("mt-1 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", AVAILABILITY_TONE[vehicle.availability])}
          >
            <span className="truncate">
              {availabilityLabel(vehicle)}
              {vehicle.archivedAt ? ` · since ${fmtDateMDT(vehicle.archivedAt, { month: "short", day: "numeric" })}` : ""}
            </span>
          </span>
        </div>
      </div>
      {facts.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {facts.map((fact) => (
            <div key={fact.label} className={cn("min-w-0", fact.wide && "col-span-2")}>
              <dt className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{fact.label}</dt>
              <dd className={cn("break-words [overflow-wrap:anywhere]", fact.mono && "font-mono text-[10.5px]")}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{MATCH_LABEL[entry.match || ""] || ""}</span>
        {canOpenInventory && <InventoryLink href={vehicle.inventoryPath} label="Open in inventory" icon="open" />}
      </div>
    </>
  );
}

function UnmatchedVehicle({ entry, canOpenInventory }: { entry: VehiclePreviewEntry; canOpenInventory: boolean }) {
  const similar = entry.state === "unconfirmed" ? similarText(entry.similarCount) : null;
  return (
    <div className="mt-2 flex min-w-0 gap-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border"
        style={{ borderColor: "var(--border-1)", background: "var(--surface-2)" }}
      >
        <Car className="h-5 w-5" style={{ color: "var(--text-tertiary)" }} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug [overflow-wrap:anywhere]">{entryTitle(entry)}</p>
        <p className="mt-0.5 text-[11px] leading-snug [overflow-wrap:anywhere]" style={{ color: "var(--text-secondary)" }}>{statusText(entry)}</p>
        {similar && <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--text-tertiary)" }}>{similar}</p>}
        {canOpenInventory && entry.searchPath && (
          <div className="mt-1">
            <InventoryLink href={entry.searchPath} label="Search inventory" icon="search" />
          </div>
        )}
      </div>
    </div>
  );
}

function OtherVehicles({ entries, canOpenInventory }: { entries: VehiclePreviewEntry[]; canOpenInventory: boolean }) {
  return (
    <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--border-1)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--text-tertiary)" }}>Also asked about</p>
      <ul className="mt-1 space-y-1.5">
        {entries.map((entry) => {
          const tag = entry.vehicle
            ? availabilityLabel(entry.vehicle)
            : entry.state === "not_found"
              ? "Not in inventory"
              : "Not confirmed";
          const href = entry.vehicle?.inventoryPath || entry.searchPath;
          return (
            <li key={entry.key} className="flex min-w-0 items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <p className="font-medium leading-snug [overflow-wrap:anywhere]">{entryTitle(entry)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {tag}
                  {entry.receivedAt ? ` · ${fmtDateMDT(entry.receivedAt, { month: "short", day: "numeric" })}` : ""}
                </p>
              </div>
              {canOpenInventory && href && (
                <Link
                  href={href}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                  aria-label={entry.vehicle ? `Open ${entryTitle(entry)} in inventory` : `Search inventory for ${entryTitle(entry)}`}
                  title={entry.vehicle ? "Open in inventory" : "Search inventory"}
                >
                  {entry.vehicle ? <ExternalLink className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VehicleOfInterestCard({ lead }: { lead: VehicleLeadRef }) {
  const { user } = useUser();
  const canOpenInventory = INVENTORY_ROLES.has(String(user?.role || ""));
  const leadId = lead?._id ? String(lead._id) : "";
  const signature = [
    lead?.vehicleId,
    lead?.vehicle?.vin,
    lead?.vehicle?.stock,
    lead?.vehicle?.year,
    lead?.vehicle?.make,
    lead?.vehicle?.model,
  ].map((part) => String(part || "")).join("|");

  const query = useQuery({
    queryKey: ["lead-vehicle-preview", leadId, signature],
    queryFn: () => fetchLeadVehiclePreview(leadId),
    enabled: Boolean(leadId),
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data && query.data.leadId === leadId ? query.data : null;

  return (
    <section
      aria-labelledby={`vehicle-of-interest-${leadId}`}
      aria-busy={query.isLoading || undefined}
      data-testid="vehicle-of-interest"
      className="min-w-0 rounded-xl border p-3"
      style={{ borderColor: "var(--border-1)", background: "var(--bg-subtle)" }}
    >
      <h3
        id={`vehicle-of-interest-${leadId}`}
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Vehicle of interest
      </h3>

      {query.isLoading || (!data && query.isFetching) ? (
        <div className="mt-2 flex gap-3" aria-hidden="true">
          <div className="h-16 w-20 shrink-0 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-3 w-3/4 animate-pulse rounded" style={{ background: "var(--surface-2)" }} />
            <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: "var(--surface-2)" }} />
          </div>
        </div>
      ) : query.isError || !data ? (
        <div role="alert" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          <span>Couldn&apos;t load the vehicle details.</span>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex min-h-8 items-center gap-1 rounded-md border px-2 font-semibold"
            style={{ borderColor: "var(--border-1)" }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      ) : !data.primary && data.others.length === 0 ? (
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>No vehicle on this lead yet.</p>
      ) : (
        <>
          {data.primary && (data.primary.vehicle ? (
            <MatchedVehicle entry={data.primary} canOpenInventory={canOpenInventory} />
          ) : (
            <UnmatchedVehicle entry={data.primary} canOpenInventory={canOpenInventory} />
          ))}
          {data.others.length > 0 && <OtherVehicles entries={data.others} canOpenInventory={canOpenInventory} />}
        </>
      )}
    </section>
  );
}
