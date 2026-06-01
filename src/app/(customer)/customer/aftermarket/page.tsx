"use client";

import * as React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Film, PackageOpen,
  Loader2, CheckCircle2, Download, CreditCard, ArrowLeft, ArrowRight,
  Zap, Lock, ChevronRight, X, Tag, Star, MessageSquare, Send,
  ThumbsUp, ShieldCheck, AlertCircle, ChevronDown, BarChart2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAftermarketProducts, checkoutAftermarket, AftermarketProduct,
} from "@/lib/aftermarket";
import { resolveImageUrl } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const AFTERMARKET_EVENTS = [
  "aftermarket:product_created",
  "aftermarket:product_updated",
  "aftermarket:product_deleted",
] as const;

function resolveSocket() {
  const w = window as any;
  for (const key of ["__socket", "_socket", "socket", "__io"]) {
    if (w[key]?.on) return w[key];
  }
  return undefined;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartLine { product: AftermarketProduct; quantity: number; }
type CheckoutStep = "cart" | "payment" | "success";

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  verifiedCount: number;
  breakdown: Record<number, number>;
}

interface Review {
  _id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  title?: string;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewsData {
  summary: ReviewSummary;
  myReview: Review | null;
  reviews: Review[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
function ini(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Star rating display ──────────────────────────────────────────────────────

function StarDisplay({ value, max = 5, size = 14 }: { value: number; max?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.floor(value);
        const half = !filled && i < value;
        return (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn(
              filled ? "text-amber-400 fill-amber-400"
              : half  ? "text-amber-400 fill-amber-400/50"
              : "text-zinc-300 dark:text-zinc-600"
            )}
          />
        );
      })}
    </span>
  );
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = React.useState(0);
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5 rounded transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              i <= (hover || value)
                ? "text-amber-400 fill-amber-400"
                : "text-zinc-300 dark:text-zinc-600"
            )}
          />
        </button>
      ))}
    </span>
  );
}

// ─── Rating bar (breakdown row) ────────────────────────────────────────────────

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right text-muted-foreground">{label}</span>
      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-violet-600/20 border border-violet-600/20 flex items-center justify-center text-violet-600 dark:text-violet-400 text-[11px] font-bold shrink-0">
            {ini(review.customerName)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{review.customerName}</span>
              {review.isVerifiedPurchase && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
            <StarDisplay value={review.rating} size={12} />
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(review.createdAt)}</span>
      </div>
      {review.title && (
        <p className="font-semibold text-sm">{review.title}</p>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
    </div>
  );
}

// ─── Reviews Modal ────────────────────────────────────────────────────────────

function ReviewsModal({
  product,
  open,
  onClose,
}: {
  product: AftermarketProduct;
  open: boolean;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<"newest" | "highest" | "lowest">("newest");
  const [showForm, setShowForm] = React.useState(false);

  // Review form state
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const { data, isLoading } = useQuery<ReviewsData>({
    queryKey: ["aftermarket-reviews", product._id, page, sort],
    queryFn: async () => {
      const headers = await authHeaders();
      const r = await apiClient.get(`/api/aftermarket/${product._id}/reviews`, {
        headers,
        params: { page, limit: 10, sort },
      });
      return r.data?.data;
    },
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      await apiClient.post(
        `/api/aftermarket/${product._id}/reviews`,
        { rating, title: title.trim() || undefined, body: body.trim() },
        { headers }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aftermarket-reviews", product._id] });
      queryClient.invalidateQueries({ queryKey: ["aftermarket"] });
      setShowForm(false);
      setRating(0);
      setTitle("");
      setBody("");
      setFormError("");
    },
    onError: (e: any) => {
      setFormError(e?.response?.data?.message || "Failed to submit review. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      await apiClient.delete(`/api/aftermarket/${product._id}/reviews/mine`, { headers });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aftermarket-reviews", product._id] });
    },
  });

  const handleSubmit = () => {
    setFormError("");
    if (rating === 0) { setFormError("Please select a star rating."); return; }
    if (body.trim().length < 10) { setFormError("Review must be at least 10 characters."); return; }
    submitMutation.mutate();
  };

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const myReview = data?.myReview;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            Ratings & Reviews — {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* ── Summary ── */}
              {summary && (
                <div className="flex flex-col sm:flex-row gap-6 rounded-2xl border border-border/50 bg-muted/30 p-5">
                  {/* Left: big number */}
                  <div className="flex flex-col items-center justify-center gap-1 shrink-0 min-w-24">
                    <span className="text-5xl font-black tabular-nums">
                      {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : "—"}
                    </span>
                    <StarDisplay value={summary.averageRating} size={18} />
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {summary.totalReviews} {summary.totalReviews === 1 ? "review" : "reviews"}
                    </span>
                    {summary.verifiedCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 mt-1">
                        <ShieldCheck className="w-3 w-3" />
                        {summary.verifiedCount} verified
                      </span>
                    )}
                  </div>
                  {/* Right: breakdown bars */}
                  <div className="flex-1 flex flex-col justify-center gap-1.5">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <RatingBar
                        key={star}
                        label={String(star)}
                        count={summary.breakdown[star] ?? 0}
                        total={summary.totalReviews}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── My review / write form ── */}
              {!myReview && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border/70 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Star className="h-4 w-4" /> Write a review
                </button>
              )}

              {/* Write review form */}
              {showForm && !myReview && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
                  <p className="font-semibold text-sm">Your review</p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rating *</p>
                    <StarInput value={rating} onChange={setRating} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Headline (optional)</p>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Summarize your experience"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Review *</p>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Share details about the product — quality, value, what you liked or didn't…"
                      rows={4}
                      maxLength={2000}
                      className="resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{body.length}/2000</p>
                  </div>
                  {formError && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {formError}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Submit review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowForm(false); setFormError(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing own review */}
              {myReview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your review</p>
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-destructive hover:underline flex items-center gap-1"
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Remove
                    </button>
                  </div>
                  <ReviewCard review={myReview} />
                </div>
              )}

              {/* ── Sort + list ── */}
              {reviews.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {data?.pagination.total} {data?.pagination.total === 1 ? "review" : "reviews"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Sort:</span>
                      {(["newest", "highest", "lowest"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSort(s); setPage(1); }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg capitalize transition-colors",
                            sort === s
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:text-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <ReviewCard key={r._id} review={r} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && reviews.length === 0 && !myReview && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <Star className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No reviews yet</p>
                  <p className="text-xs text-muted-foreground">Be the first to review this product.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inquiry Modal ────────────────────────────────────────────────────────────

function InquiryModal({
  product,
  open,
  onClose,
}: {
  product: AftermarketProduct;
  open: boolean;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const [question, setQuestion] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const mutation = useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      await apiClient.post(
        `/api/aftermarket/${product._id}/inquiries`,
        { question: question.trim() },
        { headers }
      );
    },
    onSuccess: () => setSubmitted(true),
    onError: (e: any) => {
      setError(e?.response?.data?.message || "Failed to submit. Please try again.");
    },
  });

  const handleSubmit = () => {
    setError("");
    if (question.trim().length < 5) { setError("Please enter at least 5 characters."); return; }
    mutation.mutate();
  };

  const handleClose = () => {
    setQuestion("");
    setError("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Ask a Question
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="font-bold text-base">Question submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Our support team has been notified and will respond in your Support Chat.
              </p>
            </div>
            <Button onClick={handleClose} variant="outline" size="sm">Close</Button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Product context chip */}
            <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0">
                {product.media?.url && product.media.mediaType !== "video" ? (
                  <img
                    src={resolveImageUrl(product.media.url)}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <PackageOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <p className="text-xs text-emerald-600 font-bold">{currency(product.price)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  ID: {product._id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Product details are automatically included with your question so our team can respond without needing clarification.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Your question *</label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about this product?"
                rows={4}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right">{question.length}/2000</p>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Question
              </Button>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Detail Modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onOpenReviews,
  onOpenInquiry,
  reviewSummary,
}: {
  product: AftermarketProduct | null;
  onClose: () => void;
  onAddToCart: (p: AftermarketProduct) => void;
  onOpenReviews: (p: AftermarketProduct) => void;
  onOpenInquiry: (p: AftermarketProduct) => void;
  reviewSummary?: { averageRating: number; totalReviews: number } | null;
}) {
  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-h-[90vh] flex flex-col">
        {/* Media */}
        <div className="relative w-full aspect-video bg-zinc-100 dark:bg-zinc-900 shrink-0">
          {product.media?.url ? (
            product.media.mediaType === "video" ? (
              <video src={resolveImageUrl(product.media.url)} className="h-full w-full object-cover" controls autoPlay={false} />
            ) : (
              <img src={resolveImageUrl(product.media.url)} alt={product.name} className="h-full w-full object-cover" />
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
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-y-auto p-6 gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                {product.name}
              </h2>
              {/* Rating row — clickable to open reviews modal */}
              <button
                onClick={() => onOpenReviews(product)}
                className="flex items-center gap-2 group"
              >
                {reviewSummary && reviewSummary.totalReviews > 0 ? (
                  <>
                    <StarDisplay value={reviewSummary.averageRating} size={14} />
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {reviewSummary.averageRating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:underline">
                      ({reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? "review" : "reviews"})
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground group-hover:underline">
                    No reviews yet — be the first
                  </span>
                )}
              </button>
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

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-auto">
            <Button
              onClick={() => { onAddToCart(product); onClose(); }}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              <ShoppingCart className="h-4 w-4" /> Add to Cart — {currency(product.price)}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenReviews(product)}
                className="flex-1 h-9 rounded-xl gap-1.5 text-sm"
              >
                <Star className="h-3.5 w-3.5 text-amber-400" />
                Reviews
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenInquiry(product)}
                className="flex-1 h-9 rounded-xl gap-1.5 text-sm"
              >
                <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                Ask a Question
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SuprahPay + Order Success (unchanged) ────────────────────────────────────

function SuprahPayPanel({ total, onBack, onConfirm, placing }: { total: number; onBack: () => void; onConfirm: () => void; placing: boolean }) {
  const [selected, setSelected] = React.useState<"wise" | null>(null);
  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
      </button>
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">Suprah Pay</span>
        </div>
        <p className="text-white font-bold text-2xl">{currency(total)}</p>
        <p className="text-zinc-500 text-xs mt-0.5">Total due today</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Select payment method</p>
        <button onClick={() => setSelected("wise")} className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${selected === "wise" ? "border-emerald-500/60 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"}`}>
          <div className="h-10 w-10 rounded-xl bg-[#9FE870] flex items-center justify-center shrink-0"><span className="text-[#163300] font-black text-sm">W</span></div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${selected === "wise" ? "text-emerald-400" : "text-white"}`}>Wise</p>
            <p className="text-zinc-500 text-xs">Pay via Wise — fast international transfers</p>
          </div>
          <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${selected === "wise" ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"}`}>
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
      <Button onClick={onConfirm} disabled={!selected || placing} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 disabled:opacity-40">
        {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm Order <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}

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
      <Button onClick={onDone} className="mt-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8">Done</Button>
    </div>
  );
}

// ─── Mini rating chip (shown on product card) ─────────────────────────────────

function RatingChip({ productId }: { productId: string }) {
  const { getToken } = useAuth();
  const { data } = useQuery<ReviewsData>({
    queryKey: ["aftermarket-reviews-summary", productId],
    queryFn: async () => {
      const token = await getToken();
      const r = await apiClient.get(`/api/aftermarket/${productId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, limit: 1 },
      });
      return r.data?.data;
    },
    staleTime: 5 * 60_000,
  });

  const s = data?.summary;
  if (!s || s.totalReviews === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
      <span className="text-xs font-semibold tabular-nums">{s.averageRating.toFixed(1)}</span>
      <span className="text-[10px] text-muted-foreground">({s.totalReviews})</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AftermarketPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const [checkoutStep, setCheckoutStep] = React.useState<CheckoutStep>("cart");
  const [confirmedTotal, setConfirmedTotal] = React.useState(0);

  // Modal state
  const [detailProduct, setDetailProduct] = React.useState<AftermarketProduct | null>(null);
  const [reviewProduct, setReviewProduct] = React.useState<AftermarketProduct | null>(null);
  const [inquiryProduct, setInquiryProduct] = React.useState<AftermarketProduct | null>(null);

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

  // Real-time socket invalidation
  React.useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["aftermarket"] });
    let socket = resolveSocket();
    if (!socket) {
      const t = setTimeout(() => {
        socket = resolveSocket();
        if (socket) AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidate));
      }, 2_000);
      return () => clearTimeout(t);
    }
    AFTERMARKET_EVENTS.forEach((ev) => socket!.on(ev, invalidate));
    return () => { AFTERMARKET_EVENTS.forEach((ev) => socket!.off(ev, invalidate)); };
  }, [queryClient]);

  React.useEffect(() => {
    if (!cartOpen) {
      const t = setTimeout(() => { if (checkoutStep !== "success") setCheckoutStep("cart"); }, 300);
      return () => clearTimeout(t);
    }
  }, [cartOpen, checkoutStep]);

  // Cart helpers
  const addToCart = (product: AftermarketProduct) => {
    setCart((prev) => {
      const ex = prev.find((l) => l.product._id === product._id);
      if (ex) return prev.map((l) => l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l);
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

  // Open review modal (can be triggered from card OR from detail modal)
  const openReviews = (p: AftermarketProduct) => {
    setDetailProduct(null); // close detail modal first to avoid stacking
    setTimeout(() => setReviewProduct(p), 50);
  };

  const openInquiry = (p: AftermarketProduct) => {
    setDetailProduct(null);
    setTimeout(() => setInquiryProduct(p), 50);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page header ── */}
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

          {/* ── Cart sheet ── */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative shrink-0 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl">
                <ShoppingCart className="w-4 h-4 mr-2" /> Cart
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
                            {line.product.media?.url && line.product.media.mediaType !== "video"
                              ? <img src={resolveImageUrl(line.product.media.url)} alt={line.product.name} className="h-full w-full object-cover" />
                              : <div className="h-full w-full flex items-center justify-center"><PackageOpen className="h-5 w-5 text-zinc-600" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{line.product.name}</p>
                            <p className="text-xs text-emerald-400 font-bold mt-0.5">{currency(line.product.price)}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => updateQty(line.product._id, -1)} className="h-6 w-6 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"><Minus className="h-3 w-3 text-zinc-400" /></button>
                              <span className="text-sm font-bold text-white w-6 text-center tabular-nums">{line.quantity}</span>
                              <button onClick={() => updateQty(line.product._id, 1)} className="h-6 w-6 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"><Plus className="h-3 w-3 text-zinc-400" /></button>
                              <button onClick={() => removeLine(line.product._id)} className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
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
                <div className="flex-1"><OrderSuccessPanel total={confirmedTotal} onDone={handleDone} /></div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Product grid ── */}
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
              {/* Media */}
              <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                {p.media?.url ? (
                  p.media.mediaType === "video"
                    ? <video src={resolveImageUrl(p.media.url)} className="h-full w-full object-cover" muted preload="metadata" />
                    : <img src={resolveImageUrl(p.media.url)} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">{currency(p.price)}</span>
                </div>

                {/* ── Rating chip on card ── */}
                <RatingChip productId={p._id} />

                <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{p.description}</p>

                {p.file?.url && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                    <Tag className="h-3 w-3" /> Includes attachment
                  </div>
                )}

                {/* Card action buttons */}
                <div className="mt-4 flex flex-col gap-1.5">
                  <Button
                    onClick={(e) => { e.stopPropagation(); addToCart(p); setCartOpen(true); }}
                    className="w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 font-semibold gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add to Cart
                  </Button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); openReviews(p); }}
                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      <Star className="h-3 w-3 text-amber-400" /> Reviews
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openInquiry(p); }}
                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      <MessageSquare className="h-3 w-3 text-blue-500" /> Ask
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={(p) => { addToCart(p); setCartOpen(true); }}
        onOpenReviews={openReviews}
        onOpenInquiry={openInquiry}
        reviewSummary={null} // populated by RatingChip internally; pass null here to avoid an extra query
      />

      {reviewProduct && (
        <ReviewsModal
          product={reviewProduct}
          open={!!reviewProduct}
          onClose={() => setReviewProduct(null)}
        />
      )}

      {inquiryProduct && (
        <InquiryModal
          product={inquiryProduct}
          open={!!inquiryProduct}
          onClose={() => setInquiryProduct(null)}
        />
      )}
    </div>
  );
}