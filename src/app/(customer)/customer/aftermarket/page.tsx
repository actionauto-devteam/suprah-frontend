"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Search,
  Loader2,
  ShoppingCart,
  Zap,
  MessageSquarePlus,
  X,
  Plus,
  Minus,
  Trash2,
  FileText,
} from "lucide-react";
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
  createdAt: string;
}
interface CartLine {
  product: AftermarketProduct;
  qty: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(n?: number | null) {
  if (n == null) return null;
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Inquiry modal ──────────────────────────────────────────────────────────

function InquiryModal({
  product,
  onClose,
}: {
  product: AftermarketProduct;
  onClose: () => void;
}) {
  const [question, setQuestion] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (question.trim().length < 5) return setError("Please enter at least 5 characters.");
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/api/aftermarket/${product._id}/inquiries`, { question: question.trim() });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not send your inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[14px] border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="font-bold text-sm tracking-tight">Ask about {product.name}</p>
          <button onClick={onClose} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <div className="p-8 text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
            </div>
            <p className="font-semibold text-sm">Inquiry sent</p>
            <p className="text-xs text-muted-foreground">
              Our team will review and send you a quote. You'll see the invoice on your Payments page.
            </p>
            <Button size="sm" onClick={onClose} className="rounded-xl mt-2">Done</Button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground">
              This product is quote-based. Tell us what you need and we'll send pricing.
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="e.g. I'd like a quote for 2 units, shipped to…"
              className="w-full resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Cancel</Button>
              <Button size="sm" onClick={submit} disabled={submitting} className="rounded-xl gap-1.5">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}
                Send inquiry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  buying,
  onBuyNow,
  onAddToCart,
  onInquire,
}: {
  product: AftermarketProduct;
  buying: boolean;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onInquire: () => void;
}) {
  const priced = product.price != null;
  const isVideo = product.media?.mediaType === "video" || product.media?.mimeType?.startsWith("video/");
  return (
    <div className="flex flex-col rounded-[14px] border border-border bg-card overflow-hidden">
      <div className="aspect-[4/3] bg-muted relative">
        {product.media?.url ? (
          isVideo ? (
            <video src={product.media.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={product.media.url} alt={product.name} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-sm tracking-tight leading-snug">{product.name}</p>
          <p className={cn("text-sm font-bold tabular-nums font-mono shrink-0", priced ? "text-primary" : "text-muted-foreground")}>
            {priced ? money(product.price) : "Quote"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{product.description}</p>

        {product.file?.url && (
          <a
            href={product.file.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
          >
            <FileText className="h-3 w-3" /> {product.file.fileName || "Spec sheet"}
          </a>
        )}

        <div className="pt-1 mt-auto">
          {priced ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onAddToCart} className="rounded-xl gap-1.5 flex-1">
                <ShoppingCart className="h-3.5 w-3.5" /> Cart
              </Button>
              <Button size="sm" onClick={onBuyNow} disabled={buying} className="rounded-xl gap-1.5 flex-1">
                {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Buy Now
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onInquire} className="rounded-xl gap-1.5 w-full">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Contact for pricing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart sheet ───────────────────────────────────────────────────────────────

function CartSheet({
  open,
  lines,
  onClose,
  setQty,
  removeLine,
  onCheckout,
  checkingOut,
}: {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  setQty: (id: string, qty: number) => void;
  removeLine: (id: string) => void;
  onCheckout: () => void;
  checkingOut: boolean;
}) {
  const total = lines.reduce((s, l) => s + (l.product.price || 0) * l.qty, 0);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <p className="font-bold text-sm tracking-tight">Your cart</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">Your cart is empty.</p>
            </div>
          ) : (
            lines.map((l) => (
              <div key={l.product._id} className="flex gap-3 rounded-[10px] border border-border p-3">
                <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0">
                  {l.product.media?.url ? (
                    <img src={l.product.media.url} alt={l.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/40" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{l.product.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums font-mono">{money(l.product.price)}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button onClick={() => setQty(l.product._id, l.qty - 1)} className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-mono tabular-nums w-5 text-center">{l.qty}</span>
                    <button onClick={() => setQty(l.product._id, l.qty + 1)} className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted">
                      <Plus className="h-3 w-3" />
                    </button>
                    <button onClick={() => removeLine(l.product._id)} className="ml-auto h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span className="tabular-nums font-mono text-primary">{money(total)}</span>
          </div>
          <Button onClick={onCheckout} disabled={lines.length === 0 || checkingOut} className="w-full rounded-xl gap-1.5">
            {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            Checkout
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Checkout creates an order; you'll settle payment on your Payments page.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerAftermarketPage() {
  const router = useRouter();

  const [search, setSearch] = React.useState("");
  const [debSearch, setDebSearch] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [buying, setBuying] = React.useState<string | null>(null);
  const [inquiryFor, setInquiryFor] = React.useState<AftermarketProduct | null>(null);
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["aftermarket-products", debSearch],
    queryFn: async () => {
      const r = await apiClient.get("/api/aftermarket", {
        params: debSearch ? { search: debSearch } : undefined,
      });
      return (r.data?.data || []) as AftermarketProduct[];
    },
    staleTime: 15_000,
  });

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const addToCart = (product: AftermarketProduct) => {
    setCart((p) => {
      const existing = p.find((l) => l.product._id === product._id);
      if (existing) return p.map((l) => (l.product._id === product._id ? { ...l, qty: l.qty + 1 } : l));
      return [...p, { product, qty: 1 }];
    });
    setCartOpen(true);
  };
  const setQty = (id: string, qty: number) =>
    setCart((p) => (qty <= 0 ? p.filter((l) => l.product._id !== id) : p.map((l) => (l.product._id === id ? { ...l, qty } : l))));
  const removeLine = (id: string) => setCart((p) => p.filter((l) => l.product._id !== id));

  const handleBuyNow = async (product: AftermarketProduct) => {
    setBuying(product._id);
    setNotice(null);
    try {
      const r = await apiClient.post(`/api/aftermarket/${product._id}/buy-now`, { quantity: 1 });
      const paymentId = r.data?.data?.paymentId;
      router.push(`/customer/payments?pay=${paymentId}`);
    } catch (e: any) {
      setNotice(e?.response?.data?.message || "Could not start purchase.");
      setBuying(null);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    setNotice(null);
    try {
      await apiClient.post("/api/aftermarket/checkout", {
        items: cart.map((l) => ({ productId: l.product._id, quantity: l.qty })),
      });
      setCart([]);
      setCartOpen(false);
      router.push("/customer/payments");
    } catch (e: any) {
      setNotice(e?.response?.data?.message || "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Aftermarket</h1>
            <p className="text-xs text-muted-foreground">Parts, accessories & add-ons</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setCartOpen(true)} className="rounded-xl gap-2 relative">
          <ShoppingCart className="h-4 w-4" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          {notice}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">{search ? "No products match your search." : "No products available yet."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              buying={buying === p._id}
              onBuyNow={() => handleBuyNow(p)}
              onAddToCart={() => addToCart(p)}
              onInquire={() => setInquiryFor(p)}
            />
          ))}
        </div>
      )}

      <CartSheet
        open={cartOpen}
        lines={cart}
        onClose={() => setCartOpen(false)}
        setQty={setQty}
        removeLine={removeLine}
        onCheckout={handleCheckout}
        checkingOut={checkingOut}
      />

      {inquiryFor && <InquiryModal product={inquiryFor} onClose={() => setInquiryFor(null)} />}
    </div>
  );
}