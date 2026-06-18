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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

function money(n?: number | null) {
  if (n == null) return null;
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Product editor modal ───────────────────────────────────────────────────

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
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const mediaPreview = React.useMemo(() => (media ? URL.createObjectURL(media) : null), [media]);
  React.useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); }, [mediaPreview]);

  const submit = async () => {
    if (!name.trim() || !description.trim()) return setError("Name and description are required.");
    if (price !== "" && (Number.isNaN(Number(price)) || Number(price) < 0)) return setError("Price must be a non-negative number.");

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
      setError(e?.response?.data?.message || "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-[14px] border border-border bg-background shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="font-bold text-sm tracking-tight">{isEdit ? "Edit product" : "New product"}</p>
          <button onClick={onClose} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg mt-1" placeholder="Product name" />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">
              Price <span className="text-muted-foreground/40">(leave blank for quote-based)</span>
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-9 rounded-lg mt-1"
              placeholder="e.g. 499.00"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full mt-1 resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
              placeholder="What is it, what fits, what's included…"
            />
          </div>

          {/* Media */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Photo / video</label>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {mediaPreview ? (
                  <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                ) : product?.media?.url && !removeMedia ? (
                  <img src={product.media.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                    <Plus className="h-3 w-3" /> {media ? "Change file" : "Upload"}
                  </span>
                  <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => { setMedia(e.target.files?.[0] || null); setRemoveMedia(false); }} />
                </label>
                {isEdit && product?.media?.url && !media && (
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={removeMedia} onChange={(e) => setRemoveMedia(e.target.checked)} />
                    Remove current
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* File */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Attachment (spec sheet, etc.)</label>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs truncate">
                  {file?.name || (product?.file?.fileName && !removeFile ? product.file.fileName : "No file")}
                </span>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer text-[11px] font-semibold text-primary hover:underline">
                    {file ? "Change" : "Upload"}
                    <input type="file" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveFile(false); }} />
                  </label>
                  {isEdit && product?.file?.url && !file && (
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} />
                      Remove
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Visible to customers
          </label>

          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
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
  const [editing, setEditing] = React.useState<AftermarketProduct | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

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

  const products = data?.products || [];

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/crm/aftermarket/${id}`);
      queryClient.invalidateQueries({ queryKey: ["crm-aftermarket-products"] });
    } finally {
      setDeletingId(null);
    }
  };

  const onSaved = () => {
    setCreating(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["crm-aftermarket-products"] });
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Aftermarket products</h1>
            <p className="text-xs text-muted-foreground">Manage your storefront catalog</p>
          </div>
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

      {/* Search */}
      <div className="flex items-center gap-2 mb-5 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table / list */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">{search ? "No products match." : "No products yet."}</p>
          {!search && (
            <Button size="sm" onClick={() => setCreating(true)} className="rounded-xl gap-1.5 mt-1">
              <Plus className="h-3.5 w-3.5" /> Add your first product
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[14px] border border-border divide-y divide-border/60 overflow-hidden">
          {products.map((p) => (
            <div key={p._id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {p.media?.url ? (
                  <img src={p.media.url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {!p.isActive && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground font-mono">hidden</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{p.description}</p>
              </div>
              <p className={cn("text-sm font-bold tabular-nums font-mono shrink-0", p.price != null ? "text-primary" : "text-muted-foreground")}>
                {p.price != null ? money(p.price) : "Quote"}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(p)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  disabled={deletingId === p._id}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {deletingId === p._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
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
    </div>
  );
}