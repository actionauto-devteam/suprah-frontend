"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Film,
  PackageOpen,
  Loader2,
  CheckCircle2,
  Download,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Zap,
  Lock,
  ChevronRight,
  X,
  Tag,
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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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

type CheckoutStep = "cart" | "payment" | "success";

type AftermarketSocketEvent =
  | "aftermarket:product_created"
  | "aftermarket:product_updated"
  | "aftermarket:product_deleted";

const AFTERMARKET_EVENTS: AftermarketSocketEvent[] = [
  "aftermarket:product_created",
  "aftermarket:product_updated",
  "aftermarket:product_deleted",
];

function resolveSocket():
  | {
      on: (ev: string, fn: () => void) => void;
      off: (ev: string, fn: () => void) => void;
    }
  | undefined {
  const w = window as unknown as Record<string, unknown>;
  const candidates = ["__socket", "_socket", "socket", "__io"];
  for (const key of candidates) {
    const s = w[key];
    if (s && typeof (s as any).on === "function") return s as any;
  }
  return undefined;
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: {
  product: AftermarketProduct | null;
  onClose: () => void;
  onAddToCart: (p: AftermarketProduct) => void;
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
              {product.media?.mediaType === "video" && (
                <Badge className="mt-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-0 text-[10px] gap-1">
                  <Film className="h-2.5 w-2.5" /> Includes video
                </Badge>
              )}
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 shrink-0">
              {currency(product.price)}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Description
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {product.file?.url && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Attachment
              </p>
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
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 mt-auto"
          >
            <ShoppingCart className="h-4 w-4" /> Add to Cart — {currency(product.price)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Suprah Pay placeholder panel ──────────────────────────────────────────────
function SuprahPayPanel({
  total,
  onBack,
  onConfirm,
  placing,
}: {
  total: number;
  onBack: () => void;
  onConfirm: () => void;
  placing: boolean;
}) {
  const [selected, setSelected] = React.useState<"wise" | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
      </button>

      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">
            Suprah Pay
          </span>
        </div>
        <p className="text-white font-bold text-2xl">{currency(total)}</p>
        <p className="text-zinc-500 text-xs mt-0.5">Total due today</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
          Select payment method
        </p>
        <button
          onClick={() => setSelected("wise")}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
            selected === "wise"
              ? "border-emerald-500/60 bg-emerald-500/[0.06]"
              : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-[#9FE870] flex items-center justify-center shrink-0">
            <span className="text-[#163300] font-black text-sm">W</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${selected === "wise" ? "text-emerald-400" : "text-white"}`}>
              Wise
            </p>
            <p className="text-zinc-500 text-xs">Pay via Wise — fast international transfers</p>
          </div>
          <div
            className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
              selected === "wise" ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
            }`}
          >
            {selected === "wise" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
          </div>
        </button>

        <div className="mt-2 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/[0.04] bg-white/[0.01]">
          <CreditCard className="h-4 w-4 text-zinc-600 shrink-0" />
          <p className="text-zinc-600 text-xs">More payment methods coming soon</p>
        </div>
      </div>

      {selected === "wise" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-400/80 leading-relaxed">
          <span className="font-semibold text-amber-400">Wise integration coming soon.</span>{" "}
          This is a placeholder. Clicking &ldquo;Confirm Order&rdquo; will simulate a successful payment.
        </div>
      )}

      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <Lock className="h-3 w-3 shrink-0" />
        Payments are processed securely via Suprah Pay. Your data is encrypted.
      </div>

      <Button
        onClick={onConfirm}
        disabled={!selected || placing}
        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 disabled:opacity-40"
      >
        {placing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>Confirm Order <ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </div>
  );
}

// ── Success panel ─────────────────────────────────────────────────────────────
function OrderSuccessPanel({ total, onDone }: { total: number; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
      <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>
      <div>
        <h3 className="text-white font-bold text-xl">Order placed!</h3>
        <p className="text-zinc-500 text-sm mt-1">{currency(total)} will be processed via Suprah Pay.</p>
      </div>
      <p className="text-zinc-600 text-xs max-w-xs leading-relaxed">
        You&apos;ll receive a confirmation email shortly. Our team will reach out with next steps.
      </p>
      <Button onClick={onDone} className="mt-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8">
        Done
      </Button>
    </div>
  );
}

export default function AftermarketPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [checkoutStep, setCheckoutStep] = React.useState<CheckoutStep>("cart");
  const [confirmedTotal, setConfirmedTotal] = React.useState(0);
  const [detailProduct, setDetailProduct] = React.useState<AftermarketProduct | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["aftermarket", debounced],
    queryFn: () => fetchAftermarketProducts(debounced || undefined),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  React.useEffect(() => {
    const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["aftermarket"] });
    let socket = resolveSocket();
    if (!socket) {
      const retryTimer = setTimeout(() => {
        socket = resolveSocket();
        if (socket) AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidateAll));
      }, 2_000);
      return () => clearTimeout(retryTimer);
    }
    AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidateAll));
    return () => { AFTERMARKET_EVENTS.forEach((ev) => socket!.off(ev, invalidateAll)); };
  }, [queryClient]);

  React.useEffect(() => {
    if (!cartOpen) {
      const t = setTimeout(() => { if (checkoutStep !== "success") setCheckoutStep("cart"); }, 300);
      return () => clearTimeout(t);
    }
  }, [cartOpen, checkoutStep]);

  const addToCart = (product: AftermarketProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product._id === product._id);
      if (existing) return prev.map((l) => l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { product, quantity: 1 }];
    });
    if (checkoutStep === "success") setCheckoutStep("cart");
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) => l.product._id === id ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l)
          .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.product._id !== id));

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      await checkoutAftermarket(cart.map((l) => ({ productId: l.product._id, quantity: l.quantity })));
      setConfirmedTotal(cartTotal);
      setCart([]);
      setCheckoutStep("success");
    } catch (e) {
      console.error("Checkout failed", e);
      alert("Checkout failed. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const handleDone = () => { setCheckoutStep("cart"); setCartOpen(false); };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

            <SheetContent className="w-full sm:max-w-md flex flex-col bg-zinc-950 border-white/[0.06] text-white">
              <SheetHeader className="mb-2">
                <SheetTitle className="flex items-center gap-2 text-white">
                  {checkoutStep === "cart" && <><ShoppingCart className="w-5 h-5" /> Your Cart</>}
                  {checkoutStep === "payment" && <><CreditCard className="w-5 h-5" /> Checkout</>}
                  {checkoutStep === "success" && <><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Order Confirmed</>}
                </SheetTitle>
              </SheetHeader>

              {checkoutStep === "cart" && (
                <>
                  <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 space-y-3">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <ShoppingCart className="w-12 h-12 text-zinc-700 mb-3" />
                        <p className="text-sm text-zinc-500">Your cart is empty.</p>
                      </div>
                    ) : (
                      cart.map((line) => (
                        <div key={line.product._id} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="h-16 w-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                            {line.product.media?.url && line.product.media.mediaType !== "video" ? (
                              <img src={resolveImageUrl(line.product.media.url)} alt={line.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <PackageOpen className="h-5 w-5 text-zinc-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{line.product.name}</p>
                            <p className="text-xs text-emerald-400 font-bold mt-0.5">{currency(line.product.price)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => updateQty(line.product._id, -1)} className="h-6 w-6 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <Minus className="h-3 w-3 text-zinc-400" />
                              </button>
                              <span className="text-sm font-bold text-white w-6 text-center tabular-nums">{line.quantity}</span>
                              <button onClick={() => updateQty(line.product._id, 1)} className="h-6 w-6 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                                <Plus className="h-3 w-3 text-zinc-400" />
                              </button>
                              <button onClick={() => removeLine(line.product._id)} className="ml-auto text-zinc-600 hover:text-red-400 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-white/[0.06] pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Subtotal ({cartCount} item{cartCount !== 1 ? "s" : ""})</span>
                      <span className="text-xl font-extrabold text-white">{currency(cartTotal)}</span>
                    </div>
                    <Button onClick={() => setCheckoutStep("payment")} disabled={cart.length === 0} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 disabled:opacity-40">
                      Proceed to Payment <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {checkoutStep === "payment" && (
                <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
                  <SuprahPayPanel total={cartTotal} onBack={() => setCheckoutStep("cart")} onConfirm={handleConfirmOrder} placing={placing} />
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="flex-1">
                  <OrderSuccessPanel total={confirmedTotal} onDone={handleDone} />
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center border rounded-3xl animate-pulse bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-muted-foreground font-medium">Loading products…</p>
        </div>
      ) : !products || products.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center">
          <PackageOpen className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold">No Products Available</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">There are no aftermarket products published yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <Card
              key={p._id}
              onClick={() => setDetailProduct(p)}
              className="overflow-hidden rounded-3xl border-border/40 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col bg-white dark:bg-zinc-950 cursor-pointer group"
            >
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                {p.media?.url ? (
                  p.media.mediaType === "video" ? (
                    <video src={resolveImageUrl(p.media.url)} className="h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    <img src={resolveImageUrl(p.media.url)} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                    View Details
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{currency(p.price)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{p.description}</p>

                {p.file?.url && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Tag className="h-3 w-3" /> Includes attachment
                  </div>
                )}

                <Button
                  onClick={(e) => { e.stopPropagation(); addToCart(p); setCartOpen(true); }}
                  className="mt-4 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-semibold gap-2"
                >
                  <Plus className="h-4 w-4" /> Add to Cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(p) => { addToCart(p); setCartOpen(true); }}
      />
    </div>
  );
}