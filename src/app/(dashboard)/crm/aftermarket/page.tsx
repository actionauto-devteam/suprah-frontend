"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  PackageSearch,
  ArrowLeft,
  X,
  UploadCloud,
  FileText,
  ImageIcon,
  Film,
  DollarSign,
  Tag,
  Eye,
  EyeOff,
  Download,
  PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { cn, resolveImageUrl } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Attachment {
  url: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: "image" | "video";
}
interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  file?: Attachment;
  media?: Attachment;
  isActive: boolean;
  createdAt: string;
}
type ApiError = { response?: { data?: { message?: string } } };

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// ─── Product Detail Modal ─────────────────────────────────────────────────────
function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: {
  product: Product | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-h-[90vh] flex flex-col">
        {/* Media */}
        <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-900 shrink-0">
          {product.media?.url ? (
            product.media.mediaType === "video" ? (
              <video
                src={resolveImageUrl(product.media.url)}
                className="h-full w-full object-cover"
                controls
                autoPlay={false}
              />
            ) : (
              <img
                src={resolveImageUrl(product.media.url)}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <PackageOpen className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            </div>
          )}
          {product.media?.mediaType === "video" && (
            <Badge className="absolute top-3 left-3 bg-black/70 text-white border-0 text-[10px] gap-1">
              <Film className="h-2.5 w-2.5" /> Video
            </Badge>
          )}
          <Badge
            className={cn(
              "absolute top-3 right-12 text-[9px] h-5 px-2 rounded-full font-bold border-0",
              product.isActive ? "bg-emerald-500/90 text-white" : "bg-zinc-500/90 text-white"
            )}
          >
            {product.isActive ? (
              <><Eye className="h-2.5 w-2.5 mr-1" /> Live</>
            ) : (
              <><EyeOff className="h-2.5 w-2.5 mr-1" /> Hidden</>
            )}
          </Badge>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-6 gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                {product.name}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Created {new Date(product.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 shrink-0">
              {currency(product.price)}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Description</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {product.file?.url && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Attachment</p>
              <a
                href={resolveImageUrl(product.file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
              >
                <Download className="h-4 w-4" />
                {product.file.fileName || "Download attachment"}
              </a>
            </div>
          )}

          <Button
            onClick={() => { onEdit(product); onClose(); }}
            className="w-full h-11 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold gap-2 mt-auto"
          >
            <Pencil className="h-4 w-4" /> Edit Product
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductFormModal({
  open,
  onOpenChange,
  token,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  token: string;
  editing: Product | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fileObj, setFileObj] = React.useState<File | null>(null);
  const [mediaObj, setMediaObj] = React.useState<File | null>(null);
  const [removeFile, setRemoveFile] = React.useState(false);
  const [removeMedia, setRemoveMedia] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setPrice(editing ? String(editing.price) : "");
      setDescription(editing?.description ?? "");
      setFileObj(null);
      setMediaObj(null);
      setRemoveFile(false);
      setRemoveMedia(false);
      setError("");
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || !description.trim() || price === "") {
      setError("Name, price, and description are required.");
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("price", String(priceNum));
      fd.append("description", description.trim());
      if (fileObj) fd.append("file", fileObj);
      if (mediaObj) fd.append("media", mediaObj);
      if (editing) {
        if (removeFile) fd.append("removeFile", "true");
        if (removeMedia) fd.append("removeMedia", "true");
      }
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" };
      if (editing) {
        await apiClient.patch(`/api/crm/aftermarket/${editing._id}`, fd, { headers });
      } else {
        await apiClient.post("/api/crm/aftermarket", fd, { headers });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-500" />
            {editing ? "Edit Product" : "New Finance Line Product"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Product Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Extended Powertrain Warranty" className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Price (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the product, coverage, terms…"
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <FileSlot
            label="File Attachment (optional)"
            hint="PDF, Word, Excel, CSV"
            icon={<FileText className="h-4 w-4" />}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            selected={fileObj}
            existing={!removeFile ? editing?.file : undefined}
            onSelect={(f) => { setFileObj(f); setRemoveFile(false); }}
            onRemoveExisting={() => setRemoveFile(true)}
            onClearSelected={() => setFileObj(null)}
          />

          <FileSlot
            label="Photo / Video (optional)"
            hint="JPG, PNG, WEBP, MP4, WEBM"
            icon={<ImageIcon className="h-4 w-4" />}
            accept="image/*,video/*"
            selected={mediaObj}
            existing={!removeMedia ? editing?.media : undefined}
            onSelect={(f) => { setMediaObj(f); setRemoveMedia(false); }}
            onRemoveExisting={() => setRemoveMedia(true)}
            onClearSelected={() => setMediaObj(null)}
          />

          {error && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── File upload slot ─────────────────────────────────────────────────────────
function FileSlot({
  label, hint, icon, accept, selected, existing,
  onSelect, onRemoveExisting, onClearSelected,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  accept: string;
  selected: File | null;
  existing?: Attachment;
  onSelect: (f: File) => void;
  onRemoveExisting: () => void;
  onClearSelected: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const hasExisting = !!existing?.url;

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</label>
      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">{icon} {selected.name}</span>
          <button onClick={onClearSelected} className="text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
        </div>
      ) : hasExisting ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5">
          <span className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">
            {existing?.mediaType === "video" ? <Film className="h-4 w-4" /> : icon}
            {existing?.fileName || "Current attachment"}
          </span>
          <button onClick={onRemoveExisting} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 px-3 py-3 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <UploadCloud className="h-4 w-4" />
          </span>
          <span className="text-left">
            <span className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Click to upload</span>
            <span className="block text-[10px] text-zinc-400">{hint}</span>
          </span>
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ""; }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FinanceLinePage() {
  const router = useRouter();
  const [token, setToken] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [detailProduct, setDetailProduct] = React.useState<Product | null>(null);

  const load = React.useCallback(async (t: string, q: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/crm/aftermarket", {
        headers: { Authorization: `Bearer ${t}` },
        params: q ? { search: q } : undefined,
      });
      const data = res.data?.data || res.data;
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const t = localStorage.getItem("crm_token");
    if (!t) { router.replace("/crm"); return; }
    setToken(t);
    load(t, "");
  }, [router, load]);

  React.useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => load(token, search.trim()), 350);
    return () => clearTimeout(id);
  }, [search, token, load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/crm/aftermarket/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch {
      // optionally surface a toast
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/crm/dashboard")}
              className="h-9 w-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-zinc-500" />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Finance Line</h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Manage aftermarket products synced to the customer portal</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
          >
            <Plus className="h-4 w-4" /> New Product
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <PackageSearch className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
              <Tag className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">No products yet</p>
            <p className="text-xs text-zinc-400 mt-1">Create your first Finance Line product to sync it to customers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {products.map((p) => (
              <div
                key={p._id}
                onClick={() => setDetailProduct(p)}
                className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 overflow-hidden flex flex-col shadow-sm dark:shadow-none cursor-pointer hover:border-emerald-400/60 dark:hover:border-emerald-600/40 hover:shadow-md transition-all"
              >
                {/* Media preview */}
                <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  {p.media?.url ? (
                    p.media.mediaType === "video" ? (
                      <video src={resolveImageUrl(p.media.url)} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={resolveImageUrl(p.media.url)} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <Badge className={cn("text-[9px] h-5 px-2 rounded-full font-bold border-0", p.isActive ? "bg-emerald-500/90 text-white" : "bg-zinc-500/90 text-white")}>
                      {p.isActive ? <Eye className="h-2.5 w-2.5 mr-1" /> : <EyeOff className="h-2.5 w-2.5 mr-1" />}
                      {p.isActive ? "Live" : "Hidden"}
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                      View Details
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {p.name}
                    </h3>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">{currency(p.price)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 flex-1">{p.description}</p>

                  {p.file?.url && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <FileText className="h-3 w-3" /> {p.file.fileName || "Attachment"}
                    </div>
                  )}

                  <div
                    className="flex gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditing(p); setModalOpen(true); }}
                      className="flex-1 rounded-lg h-8 text-xs gap-1.5"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(p._id)}
                      disabled={deletingId === p._id}
                      className="rounded-lg h-8 text-xs px-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                    >
                      {deletingId === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={(p) => { setEditing(p); setModalOpen(true); }}
      />

      <ProductFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        token={token}
        editing={editing}
        onSaved={() => load(token, search.trim())}
      />
    </div>
  );
}