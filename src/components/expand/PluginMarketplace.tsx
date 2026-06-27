"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Zap,
  Info,
  ArrowLeft,
  CreditCard,
  Settings,
  CheckCircle2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { marketplacePlugins, Plugin } from "@/data/plugins";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PluginMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [plugins, setPlugins] = useState<Plugin[]>(marketplacePlugins);
  const showPluginMarketplaceCatalog = true;
  const showPluginDevControls =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_ENABLE_PLUGIN_DEV_CONTROLS === "true";

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchMatchedPlugins = useMemo(() => {
    if (!normalizedSearchQuery) return plugins;

    return plugins.filter((p) => {
      const haystack = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      return haystack.includes(normalizedSearchQuery);
    });
  }, [plugins, normalizedSearchQuery]);

  const baseCategoryIds = useMemo(() => {
    return Array.from(new Set(plugins.map((p) => p.category))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [plugins]);

  const categories = useMemo(() => {
    const searchCategoryCount = new Map<string, number>();

    for (const plugin of searchMatchedPlugins) {
      searchCategoryCount.set(
        plugin.category,
        (searchCategoryCount.get(plugin.category) ?? 0) + 1,
      );
    }

    const installedCount = searchMatchedPlugins.filter(
      (p) => p.status === "active",
    ).length;

    return [
      { id: "all", name: "All Plugins", count: searchMatchedPlugins.length },
      { id: "installed", name: "Installed Plugins", count: installedCount },
      ...baseCategoryIds.map((id) => ({
        id,
        name: id,
        count: searchCategoryCount.get(id) ?? 0,
      })),
    ];
  }, [baseCategoryIds, searchMatchedPlugins]);

  const safeSelectedCategory = categories.some(
    (category) => category.id === selectedCategory,
  )
    ? selectedCategory
    : "all";

  const filteredPlugins = useMemo(() => {
    return searchMatchedPlugins.filter((p) => {
      const matchesCategory =
        safeSelectedCategory === "all" ||
        (safeSelectedCategory === "installed"
          ? p.status === "active"
          : p.category === safeSelectedCategory);
      return matchesCategory;
    });
  }, [searchMatchedPlugins, safeSelectedCategory]);

  const installedPlugins = useMemo(
    () => plugins.filter((plugin) => plugin.status === "active"),
    [plugins],
  );

  const visiblePlugins = showPluginMarketplaceCatalog
    ? filteredPlugins
    : installedPlugins;

  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const emptyStateMessage = hasSearchQuery
    ? safeSelectedCategory === "all"
      ? `No plugins found for "${searchQuery.trim()}"`
      : `No plugins found for "${searchQuery.trim()}" in ${safeSelectedCategory}`
    : safeSelectedCategory === "all"
      ? "No plugins found"
      : safeSelectedCategory === "installed"
        ? "No installed plugins found"
        : `No plugins found in ${safeSelectedCategory}`;

  const handleEnroll = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, status: "enrolling" } : p)),
    );

    setTimeout(() => {
      setPlugins((prev) => {
        const updated = prev.map((p) =>
          p.id === pluginId ? { ...p, status: "active" as const } : p,
        );
        const newPlugin = updated.find((p) => p.id === pluginId);
        if (newPlugin) setSelectedPlugin(newPlugin);
        return updated;
      });
      toast.success("Plugin Activated", {
        description: `${plugins.find((p) => p.id === pluginId)?.name} is now ready for use.`,
        descriptionClassName: "!text-zinc-800 dark:!text-zinc-200 !opacity-100",
        classNames: {
          title: "text-zinc-900 dark:text-zinc-100",
          description: "text-zinc-800 dark:text-zinc-200 opacity-100",
        },
      });
    }, 2000);
  };

  const handleDeactivate = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, status: "idle" } : p)),
    );
    setSelectedPlugin(null);
    toast.error("Plugin Deactivated", {
      description: "Billing has been stopped for this cycle.",
      descriptionClassName: "!text-zinc-800 dark:!text-zinc-200 !opacity-100",
      classNames: {
        title: "text-zinc-900 dark:text-zinc-100",
        description: "text-zinc-800 dark:text-zinc-200 opacity-100",
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
      {/* Header Area */}
      <header className="min-h-16 border-b flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Zap className="size-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight uppercase">
              Plugins
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Marketplace
            </p>
          </div>
        </div>

        {showPluginDevControls && (
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-secondary transition-all hover:border-primary/30 group cursor-help">
              <CreditCard className="size-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Credits:
              </span>
              <span className="text-xs font-black text-primary whitespace-nowrap">$50.00</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 sm:h-8 gap-2 text-xs font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Billing Logic</span>
            </Button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Pane (desktop) */}
        {showPluginMarketplaceCatalog && (
          <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-card/30 shrink-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  className="pl-9 h-9 text-xs bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 py-4">
              <div className="px-3 space-y-1">
                <p className="px-3 text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 opacity-50">
                  Filter by Category
                </p>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold tracking-tight transition-all group",
                      safeSelectedCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1"
                        : "hover:bg-primary/5 text-muted-foreground hover:text-primary",
                    )}
                  >
                    <span>{cat.name}</span>
                    <Badge
                      variant={
                        safeSelectedCategory === cat.id ? "outline" : "secondary"
                      }
                      className={cn(
                        "text-[9px] h-4 px-1.5 leading-none border-none font-black",
                        safeSelectedCategory === cat.id
                          ? "bg-white/20 text-white"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {cat.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 relative bg-muted/5 flex flex-col overflow-hidden">
          {/* Filter bar (mobile/tablet) */}
          {showPluginMarketplaceCatalog && (
            <div className="lg:hidden border-b bg-card/30 px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  className="pl-9 h-10 text-sm bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold tracking-tight transition-all min-h-9",
                      safeSelectedCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:text-primary",
                    )}
                  >
                    <span className="whitespace-nowrap">{cat.name}</span>
                    <Badge
                      variant={
                        safeSelectedCategory === cat.id ? "outline" : "secondary"
                      }
                      className={cn(
                        "text-[9px] h-4 px-1.5 leading-none border-none font-black",
                        safeSelectedCategory === cat.id
                          ? "bg-white/20 text-white"
                          : "text-muted-foreground/60",
                      )}
                    >
                      {cat.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-screen-2xl mx-auto">
              <div className="mb-6 lg:mb-10 space-y-2">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tighter uppercase">
                  {showPluginMarketplaceCatalog
                    ? "Power-Ups Library"
                    : "Installed Plugins"}
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {showPluginMarketplaceCatalog
                    ? "Browse, enroll, and manage professional-grade tools for your IDE environment."
                    : "Only active and functional plugins are shown in this environment."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
                {visiblePlugins.map((plugin) => (
                  <MarketplacePluginCard
                    key={plugin.id}
                    plugin={plugin}
                    onClick={() => setSelectedPlugin(plugin)}
                  />
                ))}
              </div>

              {visiblePlugins.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                    <Search className="size-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-lg font-bold text-muted-foreground">
                    {showPluginMarketplaceCatalog
                      ? emptyStateMessage
                      : "No active plugins are available."}
                  </p>
                  {showPluginMarketplaceCatalog && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      }}
                    >
                      Reset Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Plugin Detail Overlay (Management & Enrollment) */}
          {selectedPlugin && (
            <div
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center px-4 sm:px-6 py-0 animate-in fade-in duration-300"
              onClick={() => setSelectedPlugin(null)}
            >
              <Card
                className="w-full max-w-[min(860px,92vw)] h-dvh sm:h-dvh overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border-primary/20 flex flex-col"
                onClick={(event) => event.stopPropagation()}
              >
                <PluginDetailView
                  plugin={selectedPlugin}
                  onClose={() => setSelectedPlugin(null)}
                  onEnroll={() => handleEnroll(selectedPlugin.id)}
                  onDeactivate={() => handleDeactivate(selectedPlugin.id)}
                />
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MarketplacePluginCard({
  plugin,
  onClick,
}: {
  plugin: Plugin;
  onClick: () => void;
}) {
  const Icon = plugin.icon;
  const isInstalled = plugin.status === "active";

  return (
    <Card
      className={cn(
        "group relative h-full w-full flex flex-col bg-card border-border/40 hover:border-primary/40 transition-all duration-500 cursor-pointer overflow-hidden transform-gpu",
        isInstalled
          ? "ring-2 ring-primary/10 shadow-lg"
          : "hover:shadow-2xl hover:-translate-y-2",
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "size-12 rounded-2xl flex items-center justify-center transition-all duration-700 ring-4 ring-transparent shrink-0",
              isInstalled
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-xl group-hover:shadow-primary/20",
            )}
          >
            <Icon className="size-6" />
          </div>
          <div className="flex flex-col items-end gap-2">
            {isInstalled && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-none p-1.5 h-7 w-7 flex items-center justify-center rounded-full animate-in zoom-in-50"
              >
                <Settings className="size-4 animate-spin-slow" />
              </Badge>
            )}
            {plugin.badge && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] uppercase tracking-widest px-2 h-5 font-black border-none shadow-sm",
                  plugin.badge === "Plus"
                    ? "bg-purple-500/10 text-purple-600"
                    : plugin.badge === "Essentials"
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-green-500/10 text-green-600",
                )}
              >
                {plugin.badge}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg font-black tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
          {plugin.name}
          {isInstalled && (
            <span className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
          )}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground/80 font-medium line-clamp-2 mt-1.5 leading-relaxed not-italic">
          {plugin.description}
        </CardDescription>
      </CardHeader>

      <div
        className={cn(
          "mt-auto p-3 pt-2.5 flex flex-col gap-2.5 border-t transition-colors",
          isInstalled
            ? "bg-primary/5 border-primary/10"
            : "bg-muted/10 group-hover:bg-muted/30 border-border/20",
        )}
      >
        <div className="w-full flex items-center justify-between min-h-6">
          {isInstalled ? (
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest min-w-0">
              <TrendingUp className="size-3.5 shrink-0" />
              <span className="truncate">Manage Scale</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">
                Pricing
              </span>
              <span className="text-sm font-black text-primary">
                {plugin.price}
              </span>
            </div>
          )}
        </div>

        <Button
          variant={isInstalled ? "default" : "ghost"}
          size="sm"
          className={cn(
            "w-full h-7 text-[9px] font-black uppercase tracking-widest gap-2 shadow-none rounded-lg min-w-0",
            !isInstalled && "hover:bg-primary hover:text-primary-foreground",
          )}
        >
          <span className="truncate">
            {isInstalled ? "Control Panel" : "View Specs"}
          </span>
          <Info className="size-3.5 shrink-0" />
        </Button>
      </div>
    </Card>
  );
}

function PluginDetailView({
  plugin,
  onClose,
  onEnroll,
  onDeactivate,
}: {
  plugin: Plugin;
  onClose: () => void;
  onEnroll: () => void;
  onDeactivate: () => void;
}) {
  const Icon = plugin.icon;
  const isEnrolling = plugin.status === "enrolling";
  const isInstalled = plugin.status === "active";

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="p-4 sm:p-6 border-b flex flex-wrap items-center justify-between gap-3 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-2 h-9 px-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
        >
          <ArrowLeft className="size-4" /> Back to Market
        </Button>
        <div className="flex gap-2">
          {isInstalled && (
            <Badge
              variant="outline"
              className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-none px-3 h-7 flex items-center shadow-inner"
            >
              Active License
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="uppercase tracking-widest font-black text-[10px] px-3 h-7 flex items-center bg-primary/10 text-primary border-none"
          >
            {plugin.category}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 sm:p-6 lg:p-7 space-y-6 lg:space-y-7">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 lg:gap-7 items-start">
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
                <div className="size-20 sm:size-24 rounded-4xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner group relative">
                  <Icon className="size-10 sm:size-12 group-hover:scale-110 transition-transform duration-500" />
                  {isInstalled && (
                    <div className="absolute -top-2 -right-2 size-8 bg-green-500 rounded-full flex items-center justify-center text-white border-4 border-background shadow-lg shadow-green-500/20">
                      <CheckCircle2 className="size-4" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4 pt-1">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight uppercase leading-none">
                    {plugin.name}
                  </h2>
                  <p className="text-base sm:text-lg text-foreground/85 leading-relaxed max-w-3xl not-italic">
                    {plugin.description}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 sm:p-6 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Technical Capabilities
                </h4>
                <p className="text-sm sm:text-base leading-relaxed text-foreground/80">
                  {plugin.longDescription}
                </p>
              </div>
            </section>

            <aside className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-muted/40 border border-border/50 flex flex-col justify-between hover:border-primary/20 transition-all cursor-default min-h-36">
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase font-black text-muted-foreground/65 tracking-widest">
                    Billing Tier
                  </p>
                  <p className="text-3xl font-black text-primary tracking-tight">
                    {plugin.price}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
                  <CreditCard className="size-3.5" /> Post-Paid Monthly
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl bg-muted/40 border border-border/50 space-y-4 hover:border-primary/20 transition-all cursor-default min-h-36">
                <div className="flex justify-between items-end gap-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase font-black text-muted-foreground/65 tracking-widest">
                      Real-time Usage
                    </p>
                    <p className="text-3xl font-black tracking-tight">
                      {isInstalled ? "420" : "0"}{" "}
                      <span className="text-sm text-muted-foreground font-semibold">
                        / 5,000 unit
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold tracking-wide mb-1 border-primary/20 text-primary"
                  >
                    8% Capacity
                  </Badge>
                </div>
                <Progress
                  value={isInstalled ? 8 : 0}
                  className="h-2 bg-muted-foreground/10 rounded-full overflow-hidden"
                />
              </div>
            </aside>
          </div>

          <div className="bg-primary/5 p-5 sm:p-6 rounded-4xl border border-primary/10 space-y-5 shadow-inner shadow-primary/5">
            <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] text-primary flex items-center gap-3">
              <Settings className="size-4 animate-spin-slow" /> Management
              Control Panel
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2.5 p-5 rounded-2xl bg-card border border-primary/10 hover:border-primary/30 hover:shadow-xl transition-all cursor-pointer group transform-gpu active:scale-95">
                <div className="flex items-center justify-between">
                  <TrendingUp className="size-5 text-primary" />
                  <Badge
                    variant="secondary"
                    className="text-[9px] font-bold tracking-wide bg-primary/10 text-primary"
                  >
                    Pro Feature
                  </Badge>
                </div>
                <div className="space-y-1.5 mt-1">
                  <span className="text-sm font-bold uppercase tracking-wide group-hover:text-primary transition-colors">
                    Scale Infrastructure
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upgrade or downgrade your plan instantly based on current
                    operational demand.
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-col gap-2.5 p-5 rounded-2xl bg-card border border-destructive/10 hover:border-destructive/30 hover:shadow-xl transition-all cursor-pointer group transform-gpu active:scale-95",
                  !isInstalled && "opacity-50 grayscale cursor-not-allowed",
                )}
                onClick={() => isInstalled && onDeactivate()}
              >
                <div className="flex items-center justify-between">
                  <XCircle className="size-5 text-destructive" />
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold tracking-wide border-destructive/20 text-destructive uppercase"
                  >
                    Security First
                  </Badge>
                </div>
                <div className="space-y-1.5 mt-1">
                  <span className="text-sm font-bold uppercase tracking-wide group-hover:text-destructive transition-colors">
                    Instant Deactivation
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Billing stops at the end of the current cycle. No lock-in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 sm:p-5 lg:p-6 border-t bg-card mt-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        {isInstalled ? (
          <Button
            variant="outline"
            className="flex-1 h-14 text-xs font-black uppercase tracking-widest gap-3 bg-green-500/5 hover:bg-green-500/10 text-green-700 border-green-500/20 shadow-inner rounded-2xl"
            disabled
          >
            <CheckCircle2 className="size-5" /> Subscribed & Verified
          </Button>
        ) : (
          <Button
            className="flex-1 h-14 text-xs font-black uppercase tracking-[0.15em] gap-3 shadow-lg shadow-primary/20 animate-pulse rounded-2xl"
            onClick={onEnroll}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <Zap className="size-4 animate-bounce" />
            ) : (
              <Zap className="size-4 fill-primary-foreground" />
            )}
            {isEnrolling
              ? "Provisioning Logic..."
              : "Activate Risk-Free Enrollment"}
          </Button>
        )}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-14 w-14 p-0 rounded-[1.25rem] border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group"
              >
                <Info className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="end"
              className="max-w-65 p-4 rounded-2xl space-y-2 border border-primary/20 bg-card shadow-xl"
            >
              <p className="text-[11px] font-black uppercase tracking-widest text-primary">
                Risk-Free Enrollment
              </p>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                You won&apos;t be charged until the end of your first billing
                cycle. Cancel anytime — no lock-in, no penalties.
              </p>
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
                <span className="text-[10px] font-bold text-muted-foreground">
                  Billed post-usage, monthly
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
