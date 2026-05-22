"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  FileText,
  Film,
  PackageOpen,
  Loader2,
  CheckCircle2,
  X,
  Download,
  ShoppingBag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  fetchAftermarketProducts,
  checkoutAftermarket,
  AftermarketProduct,
} from "@/lib/aftermarket";
import { resolveImageUrl } from "@/lib/utils";

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

interface CartLine {
  product: AftermarketProduct;
  quantity: number;
}

// ── Socket event type accepted by this page ──────────────────────────────────
type AftermarketSocketEvent =
  | "aftermarket:product_created"
  | "aftermarket:product_updated"
  | "aftermarket:product_deleted";

const AFTERMARKET_EVENTS: AftermarketSocketEvent[] = [
  "aftermarket:product_created",
  "aftermarket:product_updated",
  "aftermarket:product_deleted",
];

/**
 * Attempt to locate the live socket instance from the most common locations
 * used by socket.io React integrations. Returns undefined when no socket is
 * found so the caller can fall back gracefully.
 */
function resolveSocket():
  | { on: (ev: string, fn: () => void) => void; off: (ev: string, fn: () => void) => void }
  | undefined {
  // 1. Explicit window exposure (legacy / simple setups)
  const w = window as unknown as Record<string, unknown>;
  const candidates = ["__socket", "_socket", "socket", "__io"];
  for (const key of candidates) {
    const s = w[key];
    if (s && typeof (s as any).on === "function") return s as any;
  }
  return undefined;
}

export default function AftermarketPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [orderPlaced, setOrderPlaced] = React.useState(false);

  // ── Debounce search input ─────────────────────────────────────────────────
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // ── Product query — poll every 30 s as a reliable fallback ───────────────
  const { data: products, isLoading } = useQuery({
    queryKey: ["aftermarket", debounced],
    queryFn: () => fetchAftermarketProducts(debounced || undefined),
    // Keeps the list fresh even when sockets are unavailable.
    refetchInterval: 30_000,
    // Don't discard the cached result immediately on window focus; the
    // 30-second poll keeps data fresh enough.
    staleTime: 20_000,
  });

  // ── Real-time sync via socket.io ─────────────────────────────────────────
  // We try several well-known locations for the socket instance and register
  // listeners that invalidate ALL aftermarket queries (regardless of search
  // term) so every open search view refreshes simultaneously.
  React.useEffect(() => {
    const invalidateAll = () =>
      queryClient.invalidateQueries({ queryKey: ["aftermarket"] });

    let socket = resolveSocket();

    if (!socket) {
      // Socket not yet mounted — retry once after a short delay (providers
      // sometimes expose the socket asynchronously after first render).
      const retryTimer = setTimeout(() => {
        socket = resolveSocket();
        if (socket) {
          AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidateAll));
        }
      }, 2_000);
      return () => clearTimeout(retryTimer);
    }

    AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidateAll));
    return () => {
      AFTERMARKET_EVENTS.forEach((ev) => socket!.off(ev, invalidateAll));
    };
  }, [queryClient]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (product: AftermarketProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product._id === product._id);
      if (existing) {
        return prev.map((l) =>
          l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setOrderPlaced(false);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product._id === id ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (id: string) =>
    setCart((prev) => prev.filter((l) => l.product._id !== id));

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      await checkoutAftermarket(
        cart.map((l) => ({ productId: l.product._id, quantity: l.quantity }))
      );
      setCart([]);
      setOrderPlaced(true);
    } catch (e) {
      console.error("Checkout failed", e);
      alert("Checkout failed. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Aftermarket</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
            Browse exclusive aftermarket products, warranties, and add-ons available for your vehicles.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative shrink-0 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Your Cart
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ShoppingCart className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((line) => (
                    <div
                      key={line.product._id}
                      className="flex gap-3 rounded-xl border border-border/50 p-3"
                    >
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                        {line.product.media?.url &&
                        line.product.media.mediaType !== "video" ? (
                          <img
                            src={resolveImageUrl(line.product.media.url)}
                            alt={line.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <PackageOpen className="h-5 w-5 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{line.product.name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          {currency(line.product.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(line.product._id, -1)}
                            className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(line.product._id, 1)}
                            className="h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeLine(line.product._id)}
                            className="ml-auto text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                {orderPlaced && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Order placed successfully!
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-extrabold">{currency(cartTotal)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || placing}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Place Order
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-3xl animate-pulse bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-muted-foreground font-medium">Loading products…</p>
        </div>
      ) : !products || products.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center">
          <PackageOpen className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold">No Products Available</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">
            There are no aftermarket products published yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <Card
              key={p._id}
              className="overflow-hidden rounded-3xl border-border/40 shadow-sm hover:shadow-md transition-shadow flex flex-col bg-white dark:bg-zinc-950"
            >
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                {p.media?.url ? (
                  p.media.mediaType === "video" ? (
                    <video
                      src={resolveImageUrl(p.media.url)}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={resolveImageUrl(p.media.url)}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <PackageOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
                {p.media?.mediaType === "video" && (
                  <Badge className="absolute top-3 left-3 bg-black/70 text-white border-0 text-[10px] gap-1">
                    <Film className="h-2.5 w-2.5" /> Video
                  </Badge>
                )}
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground leading-tight">{p.name}</h3>
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {currency(p.price)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
                  {p.description}
                </p>

                {p.file?.url && (
                  <a
                    href={resolveImageUrl(p.file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    {p.file.fileName || "Download attachment"}
                  </a>
                )}

                <Button
                  onClick={() => {
                    addToCart(p);
                    setCartOpen(true);
                  }}
                  className="mt-4 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-semibold gap-2"
                >
                  <Plus className="h-4 w-4" /> Add to Cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}