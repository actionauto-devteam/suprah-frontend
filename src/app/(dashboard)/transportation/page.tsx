"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Truck, Search, Menu, Plus, RefreshCw, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShippingQuoteModal } from "@/components/shipping-quote-modal";
import { QuoteResultModal } from "@/components/QuoteResultModal";
import {
  TransportationMobileStatusPanel,
  TransportationMobileSupportCenter,
  TransportationSidebar,
} from "@/components/TransportationSidebar";
import { QuoteCard } from "@/components/QuoteCard";
import { useRouter } from "next/navigation";
import {
  useTransportationData,
  PER_PAGE_OPTIONS,
  PerPageOption,
} from "@/hooks/useTransportationData";
import { useLoadsData } from "@/hooks/useLoadsData";
import { useAlert, AlertDialog } from "@/components/AlertDialog";
import { Quote } from "@/types/transportation";
import { LoadCard } from "@/components/LoadCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ShippingQuoteFormData } from "@/types/inventory";


function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  )
    pages.push(i);
  if (current < total - 2) pages.push("…");
  if (total > 1) pages.push(total);
  return pages;
}

function PerPageSelector({
  limit,
  total,
  onLimitChange,
}: {
  limit: PerPageOption;
  total: number;
  onLimitChange: (l: PerPageOption) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Per page:</span>
      <select
        value={limit}
        onChange={(e) => onLimitChange(Number(e.target.value) as PerPageOption)}
        className="h-7 rounded border border-border bg-background text-xs text-foreground px-2 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {total > 0 && (
        <span className="text-muted-foreground/60">({total} total)</span>
      )}
    </div>
  );
}

function PaginationBar({
  page,
  pagination,
  onPageChange,
}: {
  page: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  onPageChange: (p: number) => void;
}) {
  if (!pagination) return null;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  const goToPage = (nextPage: number) => {
    const bounded = Math.max(1, Math.min(totalPages, nextPage));
    if (bounded !== page) onPageChange(bounded);
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-foreground font-medium">
          Page {pagination.page} of {totalPages}
        </span>
        <span>
          Showing{" "}
          <span className="font-semibold text-foreground">
            {from}-{to}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {pagination.total}
          </span>
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-7 text-center text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p as number)}
              className={`h-7 w-7 rounded text-xs font-medium transition-colors ${page === p
                ? "bg-green-500 text-white"
                : "border border-border text-muted-foreground hover:bg-muted"
                }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function TransportationPage() {
  return (
    <React.Suspense fallback={null}>
      <TransportationPageInner />
    </React.Suspense>
  );
}

function TransportationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState(() => {
    const tab = searchParams.get("tab");
    if (tab === "load-board" || tab === "market-board") return "load-board";
    if (tab === "drafts") return "drafts";
    return "shipments";
  });
  const [searchQuery, setSearchQuery] = React.useState(
    searchParams.get("search") || "",
  );
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedQuoteStatus, setSelectedQuoteStatus] = React.useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = React.useState(false);
  const [isQuoteResultModalOpen, setIsQuoteResultModalOpen] =
    React.useState(false);
  const [calculatedQuote, setCalculatedQuote] = React.useState<Quote | null>(
    null,
  );

  const { showAlert, alert, hideAlert } = useAlert();

  const {
    isLoading,
    isSilentRefreshing,
    error,
    loads,
    loadsPagination,
    loadsPage,
    loadsLimit,
    changeLoadsPage,
    changeLoadsLimit,
    quotes,
    quotesPagination,
    quotesPage,
    quotesLimit,
    changeQuotesPage,
    changeQuotesLimit,
    vehicles,
    stats,
    quoteStats,
    hasNewEntries,
    dismissNewEntries,
    fetchData,
    handleCalculateQuote,
    handleConvertToLoad,
    handleDeleteQuote,
    handleDeleteLoad,
    handleUpdateQuote,
  } = useTransportationData({
    shipmentStatus: activeTab === "shipments" ? selectedStatus : "all",
    quoteStatus: activeTab === "drafts" ? selectedQuoteStatus : "all",
    activeView: activeTab,
  });

  const {
    loads: boardLoads,
    pagination: boardPagination,
    page: boardPage,
    limit: boardLimit,
    changePage: changeBoardPage,
    changeLimit: changeBoardLimit,
    stats: boardStats,
    isLoading: isBoardLoading,
    error: boardError,
    fetchLoads: fetchBoardLoads,
    handleDeleteLoad: handleDeleteBoardLoad,
    deletingId: boardDeletingId,
  } = useLoadsData(
    activeTab === "load-board" ? searchQuery : undefined,
    activeTab === "load-board" ? selectedStatus : undefined,
    activeTab === "load-board",
  );

  // Refetch when tab becomes visible again (covers navigation back from create-load page
  // and browser tab switching) — catches socket events missed while page was hidden
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;

      if (activeTab === "load-board") {
        void fetchBoardLoads();
      } else {
        void fetchData({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeTab, fetchData, fetchBoardLoads]);

  // Handle create-load from sidebar
  React.useEffect(() => {
    if (searchParams.get("tab") === "create-load") {
      setIsQuoteModalOpen(true);
      // Clean up the URL to prevent re-opening on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (!hasNewEntries) return;
    const timer = setTimeout(() => dismissNewEntries(), 8000);
    return () => clearTimeout(timer);
  }, [hasNewEntries, dismissNewEntries]);

  const handleCalculateQuoteWrapper = async (formData: ShippingQuoteFormData) => {
    try {
      const quote = await handleCalculateQuote(formData);
      setCalculatedQuote(quote);
      setIsQuoteModalOpen(false);
      setIsQuoteResultModalOpen(true);
    } catch (error) {
      showAlert({
        type: "error",
        title: "Error Creating Quote",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create quote. Please try again.",
      });
    }
  };

  const handleConvertToLoadFromQuote = async () => {
    if (!calculatedQuote) return;
    try {
      await handleConvertToLoad(calculatedQuote._id);
      setIsQuoteResultModalOpen(false);
      setCalculatedQuote(null);
      setActiveTab("shipments");
      showAlert({
        type: "success",
        title: "Load Created",
        message: "The quote has been converted to a load and is now ready for dispatch.",
      });
    } catch (error) {
      showAlert({
        type: "error",
        title: "Error Converting Quote",
        message: error instanceof Error ? error.message : "Failed to convert quote to load. Please try again.",
      });
    }
  };

  const handleViewQuoteDetails = () => {
    setIsQuoteResultModalOpen(false);
    setCalculatedQuote(null);
    setActiveTab("drafts");
  };

  const handleManualRefresh = React.useCallback(() => {
    if (activeTab === "load-board") {
      void fetchBoardLoads();
      return;
    }
    void fetchData({ silent: true, force: true });
  }, [activeTab, fetchBoardLoads, fetchData]);

  const filteredLoads = React.useMemo(() => {
    if (!searchQuery) return loads;

    const query = searchQuery.toLowerCase();
    return loads.filter((s) => {
      const pickup = s.pickupLocation;
      const delivery = s.deliveryLocation;
      const vehicles = s.vehicles || [];

      return (
        s.loadNumber?.toLowerCase().includes(query) ||
        pickup.city.toLowerCase().includes(query) ||
        pickup.state.toLowerCase().includes(query) ||
        pickup.contactName?.toLowerCase().includes(query) ||
        delivery.city.toLowerCase().includes(query) ||
        delivery.state.toLowerCase().includes(query) ||
        delivery.contactName?.toLowerCase().includes(query) ||
        vehicles.some(
          (v) =>
            v.make?.toLowerCase().includes(query) ||
            v.model?.toLowerCase().includes(query) ||
            v.vin?.toLowerCase().includes(query),
        )
      );
    });
  }, [loads, searchQuery]);

  const filteredQuotes = React.useMemo(() => {
    if (!searchQuery) return quotes;
    const query = searchQuery.toLowerCase();
    return quotes.filter(
      (q) =>
        q.firstName?.toLowerCase().includes(query) ||
        q.lastName?.toLowerCase().includes(query) ||
        q.vin?.toLowerCase().includes(query) ||
        q.stockNumber?.toLowerCase().includes(query) ||
        q.email?.toLowerCase().includes(query),
    );
  }, [quotes, searchQuery]);

  if (error && !isLoading && loads.length === 0 && quotes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-destructive mb-2">
              Error Loading Data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => fetchData()}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog {...alert} onOpenChange={hideAlert} />

      { }
      {hasNewEntries && (
        <div className="bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800 px-3 sm:px-4 md:px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
            New entries detected — the list has been refreshed automatically.
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"
            onClick={dismissNewEntries}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      { }
      <div className="bg-card border-b border-border px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex xl:hidden relative z-10 -ml-2 h-11 w-11 min-h-11 min-w-11 shrink-0 border-none rounded-lg hover:bg-secondary active:bg-secondary touch-manipulation"
                onClick={() => setIsSidebarOpen((open) => !open)}
                aria-label="Open transportation filters"
                aria-expanded={isSidebarOpen}
                aria-controls="transportation-sidebar"
                aria-haspopup="dialog"
              >
                <Menu className="size-5" />
              </Button>
              <div className="bg-green-500 p-1.5 sm:p-2 rounded shrink-0">
                <Truck className="size-4 sm:size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground truncate">
                  Transport
                </h1>
                {vehicles.length > 0 && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                    {vehicles.length} vehicles
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex gap-1 sm:gap-2 text-[11px] sm:text-xs h-7 sm:h-9 px-2 sm:px-4 border-border"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (searchQuery) params.set("search", searchQuery);
                  if (selectedStatus !== "all")
                    params.set("status", selectedStatus);
                  if (activeTab !== "shipments") params.set("tab", activeTab);
                  const query = params.toString();
                  router.push(
                    `/transportation/create-load${query ? `?${query}` : ""}`,
                  );
                }}
              >
                <Plus className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">CREATE LOAD</span>
              </Button>
              <Button
                size="sm"
                className="gap-1 sm:gap-2 bg-green-500 hover:bg-green-600 text-white text-[11px] sm:text-xs h-7 sm:h-9 px-2 sm:px-4"
                onClick={() => setIsQuoteModalOpen(true)}
              >
                <Plus className="size-3.5 sm:size-4" />
                <span className="hidden xxs:inline">NEW QUOTE</span>
                <span className="xxs:hidden">NEW</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === "load-board"
                    ? "Search by load #, city, state, make, model, or VIN..."
                    : "Search by name, VIN, stock, or tracking number..."
                }
                className="pl-8 sm:pl-10 w-full text-sm h-8 sm:h-10 bg-background border-border text-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          { }
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
              {isSilentRefreshing && (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  · <RefreshCw className="w-2.5 h-2.5 animate-spin" />{" "}
                  Refreshing
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground"
              onClick={handleManualRefresh}
              disabled={
                activeTab === "load-board"
                  ? isBoardLoading
                  : isLoading || isSilentRefreshing
              }
            >
              <RefreshCw
                className={`w-3 h-3 ${
                  activeTab === "load-board"
                    ? isBoardLoading
                      ? "animate-spin"
                      : ""
                    : isLoading || isSilentRefreshing
                      ? "animate-spin"
                      : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mobile Tab Bar (always visible on small screens) ── */}
      <div className="xl:hidden border-b border-border bg-card px-3">
        <div className="flex">
          {(
            [
              { key: "shipments", label: "My Loads" },
              { key: "drafts", label: "Quotes" },
              { key: "load-board", label: "Board" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors border-b-2 ${activeTab === t.key
                ? "border-green-500 text-green-600 dark:text-green-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <TransportationMobileStatusPanel
        activeTab={activeTab}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedQuoteStatus={selectedQuoteStatus}
        setSelectedQuoteStatus={setSelectedQuoteStatus}
        stats={stats}
        loadStats={boardStats}
        quoteStats={quoteStats}
      />

      <div className="flex relative min-w-0">
        <TransportationSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedQuoteStatus={selectedQuoteStatus}
          setSelectedQuoteStatus={setSelectedQuoteStatus}
          stats={stats}
          loadStats={boardStats}
          quoteStats={quoteStats}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 bg-background">
          {activeTab === "load-board" ? (
            boardError && !isBoardLoading && boardLoads.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                  <Truck className="size-10 sm:size-12 md:size-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-destructive mb-2">
                    Failed to Load Loads
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 px-2 sm:px-4">
                    {boardError}
                  </p>
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                    onClick={fetchBoardLoads}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : isBoardLoading && boardLoads.length === 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-border overflow-hidden">
                    <CardContent className="p-0">
                      <div className="h-1 w-full bg-muted" />
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                          <Skeleton className="h-16 rounded-lg" />
                          <Skeleton className="h-4 w-8 rounded" />
                          <Skeleton className="h-16 rounded-lg" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Skeleton className="h-14 rounded-md" />
                          <Skeleton className="h-14 rounded-md" />
                          <Skeleton className="h-14 rounded-md" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : boardLoads.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                  <Truck className="size-10 sm:size-12 md:size-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-foreground mb-2">
                    {selectedStatus !== "all"
                      ? `No ${selectedStatus} loads found`
                      : "No Loads Found"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 px-2 sm:px-4">
                    {searchQuery
                      ? selectedStatus !== "all"
                        ? `No ${selectedStatus} Board loads match your search.`
                        : "No Board loads match your search criteria."
                      : selectedStatus !== "all"
                        ? `There are no Board loads with ${selectedStatus} status.`
                        : "No loads have been posted yet. Create a load to get started."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    {searchQuery || selectedStatus !== "all" ? (
                      <Button
                        variant="outline"
                        className="text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedStatus("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    ) : (
                      <Button
                        className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                        onClick={() => router.push("/transportation/create-load")}
                      >
                        Create Load
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-xs sm:text-sm h-8 sm:h-9"
                      onClick={fetchBoardLoads}
                    >
                      Refresh
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <PerPageSelector
                  limit={boardLimit}
                  total={boardPagination?.total ?? 0}
                  onLimitChange={changeBoardLimit}
                />
                {boardLoads.map((load) => (
                  <LoadCard
                    key={load._id}
                    load={load}
                    onDelete={handleDeleteBoardLoad}
                    isDeleting={boardDeletingId === load._id}
                  />
                ))}
                <PaginationBar
                  page={boardPage}
                  pagination={boardPagination}
                  onPageChange={changeBoardPage}
                />
              </div>
            )
          ) : activeTab === "shipments" ? (
            isLoading && loads.length === 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border-border overflow-hidden">
                    <CardContent className="p-0">
                      <Skeleton className="w-full h-40 sm:h-56 md:h-64 rounded-none" />
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex justify-between">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-16 rounded-md" />
                            <Skeleton className="h-8 w-16 rounded-md" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Skeleton className="h-20 rounded-lg" />
                          <Skeleton className="h-20 rounded-lg" />
                        </div>
                        <Skeleton className="h-40 w-full rounded-lg" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredLoads.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                  <Truck className="size-10 sm:size-12 md:size-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-sm sm:text-base md:text-lg font-medium text-foreground mb-2">
                    {selectedStatus !== "all"
                      ? `No ${selectedStatus} loads found`
                      : "No Shipments Found"}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4 sm:mb-6 px-2 sm:px-4">
                    {searchQuery
                      ? selectedStatus !== "all"
                        ? `No ${selectedStatus} loads match your search.`
                        : "No shipments match your search criteria."
                      : selectedStatus !== "all"
                        ? `There are no loads with ${selectedStatus} status.`
                        : "You don't have any shipments yet. Start by creating a quote."}
                  </p>
                  {searchQuery || selectedStatus !== "all" ? (
                    <Button
                      variant="outline"
                      className="text-xs sm:text-sm h-8 sm:h-9 md:h-10"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedStatus("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  ) : (
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9 md:h-10"
                      onClick={() => setIsQuoteModalOpen(true)}
                    >
                      Create New Quote
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <PerPageSelector
                  limit={loadsLimit}
                  total={loadsPagination?.total ?? 0}
                  onLimitChange={changeLoadsLimit}
                />
                {filteredLoads.map((load) => (
                  <LoadCard
                    key={load._id}
                    load={load}
                    onDelete={handleDeleteLoad}
                  />
                ))}
                <PaginationBar
                  page={loadsPage}
                  pagination={loadsPagination}
                  onPageChange={changeLoadsPage}
                />
              </div>
            )
          ) : isLoading && quotes.length === 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-border overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col 2xl:flex-row divide-y 2xl:divide-y-0 2xl:divide-x divide-gray-100 dark:divide-gray-700">
                      <div className="w-full 2xl:w-1/3 p-4 sm:p-6 space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-40 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <div className="w-full 2xl:w-2/3 p-4 sm:p-6 space-y-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <div className="grid grid-cols-3 gap-3">
                          <Skeleton className="h-16 rounded-lg" />
                          <Skeleton className="h-16 rounded-lg" />
                          <Skeleton className="h-16 rounded-lg" />
                        </div>
                        <Skeleton className="h-20 w-full rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredQuotes.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                <Package className="size-10 sm:size-12 md:size-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base md:text-lg font-medium text-foreground mb-2">
                  {selectedQuoteStatus !== "all"
                    ? `No ${
                        selectedQuoteStatus.charAt(0).toUpperCase() +
                        selectedQuoteStatus.slice(1)
                      } quotes found`
                    : "No Quotes Found"}
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4 sm:mb-6 px-2 sm:px-4">
                  {searchQuery
                    ? selectedQuoteStatus !== "all"
                      ? `No ${selectedQuoteStatus} quotes match your search criteria.`
                      : "No quotes match your search criteria."
                    : selectedQuoteStatus !== "all"
                      ? `There are no quotes with ${selectedQuoteStatus} status.`
                      : "You don't have any quotes yet. Create a new quote to get started."}
                </p>
                {searchQuery || selectedQuoteStatus !== "all" ? (
                  <Button
                    variant="outline"
                    className="text-xs sm:text-sm h-8 sm:h-9 md:h-10"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedQuoteStatus("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9 md:h-10"
                    onClick={() => setIsQuoteModalOpen(true)}
                  >
                    Create New Quote
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <PerPageSelector
                limit={quotesLimit}
                total={quotesPagination?.total ?? 0}
                onLimitChange={changeQuotesLimit}
              />
              {filteredQuotes.map((quote) => (
                <QuoteCard
                  key={quote._id}
                  quote={quote}
                  onConvertToLoad={handleConvertToLoad}
                  onDelete={handleDeleteQuote}
                  onUpdate={handleUpdateQuote}
                />
              ))}
              <PaginationBar
                page={quotesPage}
                pagination={quotesPagination}
                onPageChange={changeQuotesPage}
              />
            </div>
          )}
        </div>
      </div>

      <TransportationMobileSupportCenter />

      <ShippingQuoteModal
        open={isQuoteModalOpen}
        onOpenChange={setIsQuoteModalOpen}
        vehicles={vehicles}
        onCalculate={handleCalculateQuoteWrapper}
      />

      <QuoteResultModal
        open={isQuoteResultModalOpen}
        onOpenChange={setIsQuoteResultModalOpen}
        quote={calculatedQuote}
        onConvertToLoad={handleConvertToLoadFromQuote}
        onViewQuote={handleViewQuoteDetails}
      />
    </div>
  );
}