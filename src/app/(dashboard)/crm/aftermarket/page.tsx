"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  ImageIcon,
  FileText,
  RefreshCw,
  MessageSquare,
  LayoutGrid,
  List as ListIcon,
  Eye,
  EyeOff,
  UploadCloud,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn, resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";


interface ProductMedia {
  url: string;
  mediaType?: "image" | "video";
  mimeType?: string;
}
interface AftermarketProduct {
  _id: string;
  name: string;
  price?: number | null;
  description: string;
  media?: ProductMedia;
  file?: { url: string; fileName?: string };
  isActive: boolean;
  createdAt: string;
}

type ViewMode = "grid" | "list";
type CatalogFilter = "all" | "live" | "hidden";


function money(n?: number | null) {
  if (n == null) return null;
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isVideoMedia(m?: ProductMedia) {
  return m?.mediaType === "video" || m?.mimeType?.startsWith("video/");
}

// ─── Small building blocks ──────────────────────────────────────────────────

function StatDot({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", tone)} />
      <span className="text-[11px] text-muted-foreground">
        <span className="font-bold text-foreground tabular-nums">{value}</span> {label}
      </span>
    </div>
  );
}

function PriceTag({ price }: { price?: number | null }) {
  const quote = price == null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold tabular-nums font-mono backdrop-blur-sm",
        quote
          ? "bg-background/85 text-muted-foreground border border-border"
          : "bg-primary text-primary-foreground"
      )}
    >
      {quote ? <Tag className="h-3 w-3" /> : null}
      {quote ? "Quote" : money(price)}
    </span>
  );
}

function MediaThumb({ product, className }: { product: AftermarketProduct; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const src = resolveImageUrl(product.media?.url);

  if (src && !failed) {
    return isVideoMedia(product.media) ? (
      <video
        src={src}
        className={cn("h-full w-full object-cover", className)}
        muted
        onError={() => setFailed(true)}
      />
    ) : (
      <img
        src={src}
        alt={product.name}
        className={cn("h-full w-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-muted", className)}>
      <Package className="h-7 w-7 text-muted-foreground/30" />
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  deleting,
  onEdit,
  onDelete,
}: {
  product: AftermarketProduct;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[14px] border border-border bg-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        !product.isActive && "opacity-75"
      )}
    >
      {/* Media */}
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <MediaThumb product={product} className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />

        {/* status + price overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide font-mono backdrop-blur-sm",
              product.isActive ? "bg-chart-2/90 text-white" : "bg-background/85 text-muted-foreground border border-border"
            )}
          >
            {product.isActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {product.isActive ? "live" : "hidden"}
          </span>
          <PriceTag price={product.price} />
        </div>

        {/* actions — always visible on touch, hover-reveal on desktop */}
        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 p-2.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 motion-reduce:opacity-100">
          <button
            onClick={onEdit}
            aria-label="Edit product"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete product"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/90 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="font-bold text-sm leading-snug tracking-tight line-clamp-1">{product.name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{product.description}</p>
        {product.file?.url && (
          <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
            <FileText className="h-3 w-3" />
            <span className="truncate">{product.file.fileName || "attachment"}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function ProductRow({
  product,
  deleting,
  onEdit,
  onDelete,
}: {
  product: AftermarketProduct;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[10px]">
        <MediaThumb product={product} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide font-mono",
              product.isActive ? "text-chart-2" : "text-muted-foreground/60"
            )}
          >
            {product.isActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
            {product.isActive ? "live" : "hidden"}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{product.description}</p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums font-mono",
          product.price != null ? "text-primary" : "text-muted-foreground"
        )}
      >
        {product.price != null ? money(product.price) : "Quote"}
      </span>
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100">
        <button
          onClick={onEdit}
          aria-label="Edit product"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete product"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Product editor sheet ─────────────────────────────────────────────────────

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: AftermarketProduct | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;

  const [name, setName] = React.useState(product?.name || "");
  const [price, setPrice] = React.useState<string>(product?.price != null ? String(product.price) : "");
  const [description, setDescription] = React.useState(product?.description || "");
  const [isActive, setIsActive] = React.useState(product?.isActive ?? true);
  const [media, setMedia] = React.useState<File | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [removeMedia, setRemoveMedia] = React.useState(false);
  const [removeFile, setRemoveFile] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mediaPreview = React.useMemo(() => (media ? URL.createObjectURL(media) : null), [media]);
  React.useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); }, [mediaPreview]);

  const shownImage = mediaPreview || (product?.media?.url && !removeMedia ? resolveImageUrl(product.media.url) : null);

  const acceptMedia = (f?: File | null) => {
    if (!f) return;
    setMedia(f);
    setRemoveMedia(false);
  };

  const submit = async () => {
    if (!name.trim() || !description.trim()) return setError("Add a name and description.");
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      return setError("Price must be a non-negative number, or blank for quote-based.");
    }

    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description.trim());
      fd.append("price", price); // empty string clears price (quote-based)
      fd.append("isActive", String(isActive));
      if (media) fd.append("media", media);
      if (file) fd.append("file", file);
      if (isEdit && removeMedia) fd.append("removeMedia", "true");
      if (isEdit && removeFile) fd.append("removeFile", "true");

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (isEdit) {
        await apiClient.patch(`/api/crm/aftermarket/${product!._id}`, fd, config);
      } else {
        await apiClient.post(`/api/crm/aftermarket`, fd, config);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">{isEdit ? "Edit product" : "New product"}</p>
              <p className="text-[11px] text-muted-foreground">Appears in the customer storefront</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — two columns on sm+ */}
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[200px_1fr]">
            {/* Left: media + attachment + visibility */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Photo / video</label>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); acceptMedia(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "relative flex aspect-4/3 cursor-pointer items-center justify-center overflow-hidden rounded-[12px] border-2 border-dashed transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40"
                )}
              >
                {shownImage ? (
                  <>
                    <img src={shownImage} alt="" className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2">
                      <PriceTag price={price === "" ? null : Number(price)} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 px-3 text-center">
                    <UploadCloud className="h-6 w-6 text-muted-foreground/50" />
                    <span className="text-[11px] font-medium text-muted-foreground">Drop or click to upload</span>
                    <span className="text-[10px] text-muted-foreground/60">Image or video</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(e) => acceptMedia(e.target.files?.[0])}
                />
              </label>
              {isEdit && product?.media?.url && !media && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input type="checkbox" checked={removeMedia} onChange={(e) => setRemoveMedia(e.target.checked)} />
                  Remove current photo
                </label>
              )}

              {/* Visibility toggle */}
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left transition-colors",
                  isActive ? "border-chart-2/40 bg-chart-2/10" : "border-border bg-muted/30"
                )}
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  {isActive ? <Eye className="h-3.5 w-3.5 text-chart-2" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  {isActive ? "Live to customers" : "Hidden"}
                </span>
                <span
                  className={cn(
                    "relative h-4 w-7 rounded-full transition-colors",
                    isActive ? "bg-chart-2" : "bg-muted-foreground/30"
                  )}
                >
                  <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all", isActive ? "left-3.5" : "left-0.5")} />
                </span>
              </button>
            </div>

            {/* Right: fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 rounded-lg" placeholder="e.g. Performance cold-air intake" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">
                  Price <span className="text-muted-foreground/40">— blank = quote-based</span>
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="h-9 rounded-lg pl-7 tabular-nums"
                    placeholder="499.00"
                  />
                </div>
                {price === "" && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Customers will send an inquiry for pricing instead of buying directly.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm focus:border-primary/50 focus:outline-none placeholder:text-muted-foreground/50"
                  placeholder="What it is, what it fits, what's included…"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Attachment <span className="text-muted-foreground/40">— spec sheet, optional</span></label>
                <div className="mt-1 flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {file?.name || (product?.file?.fileName && !removeFile ? product.file.fileName : "No file attached")}
                  </span>
                  <label className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
                    {file || (product?.file?.fileName && !removeFile) ? "Change" : "Upload"}
                    <input type="file" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveFile(false); }} />
                  </label>
                  {isEdit && product?.file?.url && !file && (
                    <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
                      <input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />
                      Remove
                    </label>
                  )}
                </div>
              </div>

              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmAftermarketPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debSearch, setDebSearch] = React.useState("");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [filter, setFilter] = React.useState<CatalogFilter>("all");
  const [editing, setEditing] = React.useState<AftermarketProduct | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AftermarketProduct | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["crm-aftermarket-products", debSearch],
    queryFn: async () => {
      const r = await apiClient.get("/api/crm/aftermarket", {
        params: { search: debSearch || undefined, limit: 100 },
      });
      return r.data?.data as { products: AftermarketProduct[] };
    },
    staleTime: 10_000,
  });

  const allProducts = data?.products || [];
  const stats = {
    total: allProducts.length,
    live: allProducts.filter((p) => p.isActive).length,
    quote: allProducts.filter((p) => p.price == null).length,
  };

  const products = allProducts.filter((p) =>
    filter === "live" ? p.isActive : filter === "hidden" ? !p.isActive : true
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/crm/aftermarket/${id}`);
      queryClient.invalidateQueries({ queryKey: ["crm-aftermarket-products"] });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const onSaved = () => {
    setCreating(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["crm-aftermarket-products"] });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-mono">aftermarket</p>
            <h1 className="text-xl font-bold leading-tight tracking-tight">Catalog</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* stat strip */}
          <div className="hidden items-center gap-4 font-mono sm:flex">
            <StatDot label="products" value={stats.total} tone="bg-foreground/70" />
            <StatDot label="live" value={stats.live} tone="bg-chart-2" />
            <StatDot label="quote-based" value={stats.quote} tone="bg-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/crm/support-center?tab=aftermarket">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Inquiries
              </Button>
            </Link>
            <Button size="sm" onClick={() => setCreating(true)} className="rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New product
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* filters — underline tabs */}
        <div className="flex gap-4 border-b border-border">
          {(["all", "live", "hidden"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "-mb-px border-b-2 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search catalog…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl pl-9"
            />
          </div>
          {/* view toggle */}
          <div className="flex items-center rounded-xl border border-border p-0.5">
            {([["grid", LayoutGrid], ["list", ListIcon]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                aria-label={`${mode} view`}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-9 w-9 rounded-xl p-0 hover:bg-primary/10 hover:text-primary">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-muted">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {search ? "Nothing matches that search" : filter !== "all" ? `No ${filter} products` : "Your catalog is empty"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search ? "Try a different term." : "Add a product and it shows up in the customer storefront."}
            </p>
          </div>
          {!search && filter === "all" && (
            <Button size="sm" onClick={() => setCreating(true)} className="mt-1 rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add your first product
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              deleting={deletingId === p._id}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border divide-y divide-border/60">
          {products.map((p) => (
            <ProductRow
              key={p._id}
              product={p}
              deleting={deletingId === p._id}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ProductEditor
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.name}" will be removed from the customer storefront. This can't be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId === deleteTarget?._id}
              onClick={() => deleteTarget && handleDelete(deleteTarget._id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}