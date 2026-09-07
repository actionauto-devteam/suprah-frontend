"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Car,
    Eye,
    EyeOff,
    GripVertical,
    LayoutDashboard,
    Plus,
    MapPin,
    Menu,
    RotateCcw,
    Save,
    Search,
    ChevronDown,
    ChevronUp,
    Truck,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { isSupraSpaceInstalled } from "@/lib/supraspace-install";

const SUPRASPACE_EMBEDDED_HREF = "/crm/supra-space";
const SUPRASPACE_SUBDOMAIN_URL = "https://space.suprah-app.com/";
const NAVIGATION_INTENT_EVENT = "suprah:navigation-intent";

export type BottomNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    isCenter?: boolean;
};

type MobileBottomNavProps = {
    items: BottomNavItem[];
    /** Full module registry for the dealership shell. Optional so admin/driver/customer callers remain unchanged. */
    allItems?: BottomNavItem[];
};


const MAX_QUICK_ACCESS_ITEMS = 5;
const CENTER_QUICK_ACCESS_INDEX = 2;
const MOBILE_NAV_STORAGE_PREFIX = "suprah:mobile-nav:v1";
const MOBILE_NAV_VISIBILITY_KEY = `${MOBILE_NAV_STORAGE_PREFIX}:hidden`;

type DealershipNavScope = "dealership" | "inventory";

type NavPreferenceState = {
    customized: boolean;
    order: string[];
};

type StoredNavPreference = NavPreferenceState & {
    version: 1;
};

function mergeUniqueItems(...groups: BottomNavItem[][]) {
    const seen = new Set<string>();
    const merged: BottomNavItem[] = [];

    for (const group of groups) {
        for (const item of group) {
            if (!item.href || seen.has(item.href)) continue;
            seen.add(item.href);
            merged.push(item);
        }
    }

    return merged;
}

function reconcileOrder(
    order: string[],
    availableItems: BottomNavItem[],
    defaultOrder: string[],
) {
    const allowed = new Set(availableItems.map((item) => item.href));
    const seen = new Set<string>();
    const next: string[] = [];

    const append = (href: string) => {
        if (!allowed.has(href) || seen.has(href)) return;
        seen.add(href);
        next.push(href);
    };

    order.forEach(append);
    defaultOrder.forEach(append);
    availableItems.forEach((item) => append(item.href));

    return next;
}

function storageKey(scope: DealershipNavScope) {
    return `${MOBILE_NAV_STORAGE_PREFIX}:${scope}`;
}

function moduleMatchesPathname(pathname: string, href: string) {
    if (!href.startsWith("/")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveCurrentModule(
    pathname: string,
    availableItems: BottomNavItem[],
): BottomNavItem | null {
    return (
        availableItems
            .filter((item) => moduleMatchesPathname(pathname, item.href))
            .sort((a, b) => b.href.length - a.href.length)[0] ?? null
    );
}

function buildOrderedModuleList(
    preferredSlots: Array<string | null | undefined>,
    availableItems: BottomNavItem[],
) {
    const allowed = new Set(availableItems.map((item) => item.href));
    const used = new Set<string>();
    const quickSlots: Array<string | null> = preferredSlots.map((href) => {
        if (!href || !allowed.has(href) || used.has(href)) return null;
        used.add(href);
        return href;
    });

    // Keep existing familiar modules as the first fallbacks when the active module
    // duplicates one of the fixed anchors (for example CRM itself is current).
    const fallbackPriority = [
        "/inventory",
        "/team-pulse",
        "/crm/suprah-calendar",
        "/project",
        "/reports",
        "/billing",
        "/suprah-radar",
    ];
    const fallbackPool = [
        ...fallbackPriority,
        ...availableItems.map((item) => item.href),
    ];

    for (let index = 0; index < quickSlots.length; index += 1) {
        if (quickSlots[index]) continue;
        const replacement = fallbackPool.find(
            (href) => allowed.has(href) && !used.has(href),
        );
        if (!replacement) continue;
        quickSlots[index] = replacement;
        used.add(replacement);
    }

    const ordered = quickSlots.filter((href): href is string => Boolean(href));
    for (const item of availableItems) {
        if (!used.has(item.href)) {
            used.add(item.href);
            ordered.push(item.href);
        }
    }

    return ordered;
}


function lockActiveModuleToCenter(
    order: string[],
    activeHref: string | null | undefined,
    availableItems: BottomNavItem[],
    defaultOrder: string[],
) {
    const reconciled = reconcileOrder(order, availableItems, defaultOrder);
    if (!activeHref || !availableItems.some((item) => item.href === activeHref)) {
        return reconciled;
    }

    // The active route is a presentation constraint, not a drag barrier. Remove it
    // from the user's sequence and insert it only when deriving the five visible
    // quick-access slots. This lets items move freely from slot 1/2 to slot 4/5.
    const withoutActive = reconciled.filter((href) => href !== activeHref);
    return [
        ...withoutActive.slice(0, CENTER_QUICK_ACCESS_INDEX),
        activeHref,
        ...withoutActive.slice(CENTER_QUICK_ACCESS_INDEX),
    ];
}

function getEditableOrder(
    order: string[],
    activeHref: string | null | undefined,
    availableItems: BottomNavItem[],
    defaultOrder: string[],
) {
    const reconciled = reconcileOrder(order, availableItems, defaultOrder);
    return activeHref ? reconciled.filter((href) => href !== activeHref) : reconciled;
}

function composeStoredOrderFromEditable(
    editableOrder: string[],
    activeHref: string | null | undefined,
    availableItems: BottomNavItem[],
    defaultOrder: string[],
) {
    if (!activeHref || !availableItems.some((item) => item.href === activeHref)) {
        return reconcileOrder(editableOrder, availableItems, defaultOrder);
    }

    const allowedWithoutActive = availableItems.filter((item) => item.href !== activeHref);
    const defaultWithoutActive = defaultOrder.filter((href) => href !== activeHref);
    const reconciledEditable = reconcileOrder(
        editableOrder,
        allowedWithoutActive,
        defaultWithoutActive,
    );

    return [
        ...reconciledEditable.slice(0, CENTER_QUICK_ACCESS_INDEX),
        activeHref,
        ...reconciledEditable.slice(CENTER_QUICK_ACCESS_INDEX),
    ];
}

function editableIndexToQuickPosition(index: number): number | null {
    if (index === 0) return 1;
    if (index === 1) return 2;
    if (index === 2) return 4;
    if (index === 3) return 5;
    return null;
}

function previewIndexToEditableIndex(index: number): number | null {
    if (index === 0) return 0;
    if (index === 1) return 1;
    if (index === 3) return 2;
    if (index === 4) return 3;
    return null;
}

function DraggableNavigationRow({
    item,
    index,
    active,
    onPromote,
}: {
    item: BottomNavItem;
    index: number;
    active: boolean;
    onPromote?: (href: string) => void;
}) {
    const dragControls = useDragControls();
    const Icon = item.icon;
    const quickPosition = editableIndexToQuickPosition(index);
    const isQuickAccess = quickPosition !== null;

    return (
        <Reorder.Item
            value={item.href}
            dragListener={false}
            dragControls={dragControls}
            className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm",
                "bg-background/90 backdrop-blur-xl transition-colors",
                isQuickAccess
                    ? "border-primary/35 bg-primary/[0.055]"
                    : "border-border/55 bg-background/75",
                active && "ring-1 ring-primary/40",
            )}
        >
            <div
                className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                    isQuickAccess
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border/50 bg-muted/25 text-muted-foreground",
                )}
            >
                <Icon className="size-4.5" strokeWidth={active ? 2.4 : 2} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-foreground">
                        {item.label}
                    </span>
                </div>
                <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/65">
                    {isQuickAccess
                        ? `Quick access position ${quickPosition}`
                        : "Available module · drag up or tap Add"}
                </p>
            </div>

            {!isQuickAccess && onPromote && (
                <button
                    type="button"
                    onClick={() => onPromote(item.href)}
                    aria-label={`Add ${item.label} to quick access`}
                    title={`Add ${item.label} to quick access`}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-primary/25 bg-primary/[0.08] px-2 text-[9px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <Plus className="size-3.5" />
                    Add
                </button>
            )}

            <button
                type="button"
                aria-label={`Drag ${item.label}`}
                title={`Drag ${item.label}`}
                onPointerDown={(event) => dragControls.start(event)}
                className="touch-none rounded-xl p-2 text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <GripVertical className="size-5" />
            </button>
        </Reorder.Item>
    );
}

// Transportation and Driver Tracker belong to the Inventory workspace family.
// They are injected only while the user is inside Inventory / Transportation /
// Driver Tracker. Dashboard and CRM keep the shell-provided nav so Pulse and
// Chat / Supra Space are not removed there.
const INVENTORY_WORKSPACE_BASE_ITEMS: BottomNavItem[] = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Inventory", href: "/inventory", icon: Car },
    { label: "Transportation", href: "/transportation", icon: Truck },
    { label: "Driver Tracker", href: "/driver-tracker", icon: MapPin },
];

function isInventoryWorkspaceRoute(pathname: string) {
    return ["/inventory", "/transportation", "/driver-tracker"].some(
        (base) => pathname === base || pathname.startsWith(`${base}/`),
    );
}

function isDashboardOrCrmRoute(pathname: string) {
    return pathname === "/" || pathname === "/crm" || pathname.startsWith("/crm/");
}

export function MobileBottomNav({ items, allItems }: MobileBottomNavProps) {
    const pathname = usePathname();
    const router = useRouter();

    const inventoryWorkspace = isInventoryWorkspaceRoute(pathname);

    // Only the dealership shell gets the hamburger/customizable navigation.
    // Admin, driver, and customer mobile navs keep their existing behavior.
    const isDealershipShell = React.useMemo(() => {
        const hrefs = new Set(items.map((item) => item.href));
        return hrefs.has("/") && hrefs.has("/inventory") && hrefs.has("/crm");
    }, [items]);

    const inventoryWorkspaceItems = React.useMemo<BottomNavItem[]>(() => {
        // Reuse the app shell's real CRM icon/route when available so this stays
        // aligned with the existing CRM navigation configuration.
        const existingCrmItem = items.find(
            (item) => item.label.trim().toLowerCase() === "crm",
        );
        const crmItem: BottomNavItem = existingCrmItem
            ? { ...existingCrmItem, isCenter: false }
            : { label: "CRM", href: "/crm", icon: Users };

        return [
            INVENTORY_WORKSPACE_BASE_ITEMS[0],
            INVENTORY_WORKSPACE_BASE_ITEMS[1],
            crmItem,
            INVENTORY_WORKSPACE_BASE_ITEMS[2],
            INVENTORY_WORKSPACE_BASE_ITEMS[3],
        ];
    }, [items]);

    // Old callers still only need to pass `items`. The dealership layout may also
    // provide the full module registry through `allItems`; admin/driver/customer
    // callers remain completely compatible with the old prop contract.
    const dealershipAvailableItems = React.useMemo(
        () => mergeUniqueItems(allItems ?? items, items, inventoryWorkspaceItems),
        [allItems, items, inventoryWorkspaceItems],
    );

    // The editor exposes the same complete dealership module list in every
    // dealership workspace, including Inventory / Transportation / Driver Tracker.
    const inventoryAvailableItems = dealershipAvailableItems;

    const currentDealershipItem = React.useMemo(
        () => resolveCurrentModule(pathname, dealershipAvailableItems),
        [pathname, dealershipAvailableItems],
    );

    const dealershipDefaultOrder = React.useMemo(() => {
        const currentHref = currentDealershipItem?.href ?? "/inventory";

        // Reserve slot 3 for the current module first. If the current module is
        // itself CRM, Dashboard, Suprah Space, or YapLine, its usual anchor slot
        // becomes a fallback slot instead of duplicating the current module.
        return buildOrderedModuleList(
            [
                currentHref === "/crm" ? null : "/crm",
                currentHref === "/" ? null : "/",
                currentHref,
                currentHref === SUPRASPACE_EMBEDDED_HREF ? null : SUPRASPACE_EMBEDDED_HREF,
                currentHref === "/crm/yapline" ? null : "/crm/yapline",
            ],
            dealershipAvailableItems,
        );
    }, [currentDealershipItem, dealershipAvailableItems]);

    const inventoryDefaultOrder = React.useMemo(() => {
        const family = ["/inventory", "/transportation", "/driver-tracker"];
        const currentFamilyHref =
            family.find((href) => moduleMatchesPathname(pathname, href)) ?? "/inventory";
        const remainingFamily = family.filter((href) => href !== currentFamilyHref);

        return buildOrderedModuleList(
            [
                "/crm",
                SUPRASPACE_EMBEDDED_HREF,
                currentFamilyHref,
                remainingFamily[0],
                remainingFamily[1],
            ],
            inventoryAvailableItems,
        );
    }, [pathname, inventoryAvailableItems]);

    const [navPreferences, setNavPreferences] = React.useState<
        Record<DealershipNavScope, NavPreferenceState>
    >(() => ({
        dealership: {
            customized: false,
            order: dealershipDefaultOrder,
        },
        inventory: {
            customized: false,
            order: inventoryDefaultOrder,
        },
    }));

    const customizationScope: DealershipNavScope = inventoryWorkspace
        ? "inventory"
        : "dealership";
    const activeAvailableItems = inventoryWorkspace
        ? inventoryAvailableItems
        : dealershipAvailableItems;
    const activeDefaultOrder = inventoryWorkspace
        ? inventoryDefaultOrder
        : dealershipDefaultOrder;
    const activePreference = navPreferences[customizationScope];

    const activeCenterHref = isDealershipShell ? currentDealershipItem?.href ?? null : null;

    const effectiveOrder = React.useMemo(
        () =>
            lockActiveModuleToCenter(
                activePreference.customized ? activePreference.order : [],
                activeCenterHref,
                activeAvailableItems,
                activeDefaultOrder,
            ),
        [
            activePreference,
            activeCenterHref,
            activeAvailableItems,
            activeDefaultOrder,
        ],
    );

    const activeItemByHref = React.useMemo(
        () => new Map(activeAvailableItems.map((item) => [item.href, item])),
        [activeAvailableItems],
    );

    const customizedVisibleItems = React.useMemo(
        () =>
            effectiveOrder
                .slice(0, MAX_QUICK_ACCESS_ITEMS)
                .map((href) => activeItemByHref.get(href))
                .filter((item): item is BottomNavItem => Boolean(item)),
        [effectiveOrder, activeItemByHref],
    );

    // Both default and customized dealership navigation are route-aware. The
    // active module is always locked into slot 3; customization controls the
    // remaining quick-access choices. Admin/driver/customer remain unchanged.
    const defaultVisibleItems = React.useMemo(
        () =>
            activeDefaultOrder
                .slice(0, MAX_QUICK_ACCESS_ITEMS)
                .map((href) => activeItemByHref.get(href))
                .filter((item): item is BottomNavItem => Boolean(item)),
        [activeDefaultOrder, activeItemByHref],
    );

    const visibleItems = isDealershipShell
        ? activePreference.customized
            ? customizedVisibleItems
            : defaultVisibleItems
        : inventoryWorkspace
            ? inventoryWorkspaceItems
            : items;

    // The dealership shell always uses the moving active-circle treatment,
    // including Pulse. Non-dealership shells keep the legacy behavior.
    const useMovingActiveTreatment = isDealershipShell
        ? true
        : inventoryWorkspace || isDashboardOrCrmRoute(pathname);

    const [hidden, setHidden] = React.useState(false);
    const [hiddenForConvo, setHiddenForConvo] = React.useState(false);
    const [hiddenForLeadConvo, setHiddenForLeadConvo] = React.useState(false);
    const [hiddenForMailWorkspace, setHiddenForMailWorkspace] = React.useState(false);
    const [inventoryInspectorActive, setInventoryInspectorActive] = React.useState(false);
    const [transportationInspectorActive, setTransportationInspectorActive] = React.useState(false);
    const [pendingHref, setPendingHref] = React.useState<string | null>(null);
    const [customizerOpen, setCustomizerOpen] = React.useState(false);
    const [draftOrder, setDraftOrder] = React.useState<string[]>([]);
    const [selectedQuickSlot, setSelectedQuickSlot] = React.useState<number | null>(null);
    const [moduleSearch, setModuleSearch] = React.useState("");
    const [advancedArrangeOpen, setAdvancedArrangeOpen] = React.useState(false);
    const [userHidden, setUserHidden] = React.useState(false);

    const lastScrollY = React.useRef(0);
    const pendingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Once this device has SupraSpace's own PWA installed, the SupraSpace tab
    // should hand off there directly instead of opening the embedded dashboard.
    const [supraSpaceInstalledElsewhere, setSupraSpaceInstalledElsewhere] = React.useState(false);

    React.useEffect(() => {
        setSupraSpaceInstalledElsewhere(isSupraSpaceInstalled());
    }, []);

    React.useEffect(() => {
        if (!isDealershipShell || typeof window === "undefined") return;
        try {
            setUserHidden(window.localStorage.getItem(MOBILE_NAV_VISIBILITY_KEY) === "1");
        } catch {
            setUserHidden(false);
        }
    }, [isDealershipShell]);

    // Load both dealership preference scopes once the shell module list is known.
    // Preferences are browser-local only; no module permissions or routes are changed.
    React.useEffect(() => {
        if (!isDealershipShell || typeof window === "undefined") return;

        const readPreference = (
            scope: DealershipNavScope,
            availableItems: BottomNavItem[],
            defaultOrder: string[],
        ): NavPreferenceState => {
            const fallback: NavPreferenceState = {
                customized: false,
                order: reconcileOrder([], availableItems, defaultOrder),
            };

            try {
                const raw = window.localStorage.getItem(storageKey(scope));
                if (!raw) return fallback;

                const parsed = JSON.parse(raw) as Partial<StoredNavPreference>;
                if (parsed.version !== 1 || !Array.isArray(parsed.order)) {
                    return fallback;
                }

                return {
                    customized: parsed.customized === true,
                    order: reconcileOrder(parsed.order, availableItems, defaultOrder),
                };
            } catch {
                return fallback;
            }
        };

        setNavPreferences({
            dealership: readPreference(
                "dealership",
                dealershipAvailableItems,
                dealershipDefaultOrder,
            ),
            inventory: readPreference(
                "inventory",
                inventoryAvailableItems,
                inventoryDefaultOrder,
            ),
        });
    }, [
        isDealershipShell,
        dealershipAvailableItems,
        dealershipDefaultOrder,
        inventoryAvailableItems,
        inventoryDefaultOrder,
    ]);

    // The committed URL is the single source of truth for the active icon.
    // A pending destination is visual feedback only and never forces/replaces a route.
    React.useEffect(() => {
        setPendingHref(null);
        setHidden(false);
        setCustomizerOpen(false);
        setSelectedQuickSlot(null);
        setModuleSearch("");
        setAdvancedArrangeOpen(false);

        if (pendingTimeoutRef.current) {
            clearTimeout(pendingTimeoutRef.current);
            pendingTimeoutRef.current = null;
        }
    }, [pathname]);

    React.useEffect(() => {
        return () => {
            if (pendingTimeoutRef.current) {
                clearTimeout(pendingTimeoutRef.current);
            }
        };
    }, []);

    // Prefetch the current nav destinations to reduce the heavy-workspace wait
    // without forcing a document reload.
    React.useEffect(() => {
        for (const item of visibleItems) {
            if (item.href.startsWith("/") && item.href !== SUPRASPACE_EMBEDDED_HREF) {
                router.prefetch(item.href);
            }
        }
    }, [router, visibleItems]);

    React.useEffect(() => {
        const handler = (e: Event) => {
            setHiddenForConvo((e as CustomEvent<{ active: boolean }>).detail.active);
        };
        window.addEventListener("supraspace:conv-state", handler);
        return () => window.removeEventListener("supraspace:conv-state", handler);
    }, []);

    React.useEffect(() => {
        const handler = (e: Event) => {
            setHiddenForLeadConvo((e as CustomEvent<{ active: boolean }>).detail.active);
        };
        window.addEventListener("crm-leads:convo-state", handler);
        return () => window.removeEventListener("crm-leads:convo-state", handler);
    }, []);

    React.useEffect(() => {
        const handler = (e: Event) => {
            setHiddenForMailWorkspace(Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active));
        };
        window.addEventListener("suprah-mail:workspace-state", handler);
        return () => window.removeEventListener("suprah-mail:workspace-state", handler);
    }, []);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const active = Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active);
            setInventoryInspectorActive(active);
            if (active) setHidden(false);
        };
        window.addEventListener("inventory:inspector-state", handler);
        return () => window.removeEventListener("inventory:inspector-state", handler);
    }, []);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const active = Boolean((e as CustomEvent<{ active?: boolean }>).detail?.active);
            setTransportationInspectorActive(active);
            if (active) setHidden(false);
        };
        window.addEventListener("transportation:inspector-state", handler);
        return () => window.removeEventListener("transportation:inspector-state", handler);
    }, []);

    React.useEffect(() => {
        const el = document.querySelector("main");
        if (!el) return;

        const onScroll = () => {
            const y = el.scrollTop;
            if (Math.abs(y - lastScrollY.current) < 8) return;
            setHidden(y > lastScrollY.current && y > 60);
            lastScrollY.current = y;
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    const isActive = React.useCallback((href: string) => {
        const exact = ["/", "/driver", "/admin/dashboard", "/customer"];
        if (exact.includes(href)) return pathname === href;
        return pathname === href || pathname.startsWith(`${href}/`);
    }, [pathname]);

    const isMovingItemActive = React.useCallback((item: BottomNavItem) => {
        // On dealership routes, use the most-specific registered module so /crm
        // does not incorrectly appear active on /crm/yapline, /crm/feeds, etc.
        if (isDealershipShell) {
            return currentDealershipItem?.href === item.href;
        }

        const label = item.label.trim().toLowerCase();
        if (label === "dashboard") return pathname === "/";
        if (label === "inventory") return pathname === "/inventory" || pathname.startsWith("/inventory/");
        if (label === "crm") return pathname === "/crm" || pathname.startsWith("/crm/");
        if (label === "transportation") return pathname === "/transportation" || pathname.startsWith("/transportation/");
        if (label === "driver tracker") return pathname === "/driver-tracker" || pathname.startsWith("/driver-tracker/");

        return isActive(item.href);
    }, [currentDealershipItem, isDealershipShell, pathname, isActive]);

    const beginClientNavigation = React.useCallback((href: string) => {
        setPendingHref(href);
        setHidden(false);

        // Tell the currently mounted workspace about the user's newest navigation
        // intent immediately. CRM uses this to cancel/ignore its delayed auth
        // redirect before the next route has finished rendering.
        window.dispatchEvent(
            new CustomEvent<{ href: string }>(NAVIGATION_INTENT_EVENT, {
                detail: { href },
            }),
        );

        if (pendingTimeoutRef.current) {
            clearTimeout(pendingTimeoutRef.current);
        }

        // This timeout only clears stale loading feedback. It never performs
        // navigation and therefore cannot fight with Next.js routing.
        pendingTimeoutRef.current = setTimeout(() => {
            setPendingHref((current) => (current === href ? null : current));
            pendingTimeoutRef.current = null;
        }, 12000);
    }, []);

    const handleNavClick = React.useCallback((
        event: React.MouseEvent<HTMLAnchorElement>,
        item: BottomNavItem,
        handoffToInstalledApp: boolean,
    ) => {
        if (handoffToInstalledApp) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const currentlyActive = useMovingActiveTreatment
            ? isMovingItemActive(item)
            : isActive(item.href);

        if (currentlyActive) {
            event.preventDefault();
            setPendingHref(null);
            setHidden(false);

            if (pendingTimeoutRef.current) {
                clearTimeout(pendingTimeoutRef.current);
                pendingTimeoutRef.current = null;
            }
            return;
        }

        // Do not preventDefault here. Next <Link> performs a normal client-side
        // navigation, preserving SPA state and avoiding the full-page reload that
        // window.location.assign caused in the previous fix.
        beginClientNavigation(item.href);
    }, [
        beginClientNavigation,
        isActive,
        isMovingItemActive,
        useMovingActiveTreatment,
    ]);

    const openCustomizer = React.useCallback(() => {
        if (!isDealershipShell) return;
        setDraftOrder(
            getEditableOrder(
                activePreference.customized ? activePreference.order : activeDefaultOrder,
                activeCenterHref,
                activeAvailableItems,
                activeDefaultOrder,
            ),
        );
        setSelectedQuickSlot(null);
        setModuleSearch("");
        setAdvancedArrangeOpen(false);
        setCustomizerOpen(true);
        setHidden(false);
    }, [
        isDealershipShell,
        activePreference,
        activeDefaultOrder,
        activeCenterHref,
        activeAvailableItems,
    ]);

    const closeCustomizer = React.useCallback(() => {
        setCustomizerOpen(false);
        setDraftOrder([]);
        setSelectedQuickSlot(null);
        setModuleSearch("");
        setAdvancedArrangeOpen(false);
    }, []);

    const handleDraftReorder = React.useCallback((nextOrder: string[]) => {
        // The active module is not part of this reorder list, so there is no fixed
        // row for Framer Motion to collide with. Items can cross freely between the
        // left-side quick slots (1/2) and the right-side quick slots (4/5).
        setDraftOrder(nextOrder);
    }, []);

    const swapModuleIntoQuickSlot = React.useCallback((href: string, targetIndex: number) => {
        setDraftOrder((current) => {
            const sourceIndex = current.indexOf(href);
            if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= Math.min(4, current.length)) {
                return current;
            }
            if (sourceIndex === targetIndex) return current;

            const next = [...current];
            [next[targetIndex], next[sourceIndex]] = [next[sourceIndex], next[targetIndex]];
            return next;
        });
        setSelectedQuickSlot(null);
    }, []);

    const handleModuleTap = React.useCallback((href: string) => {
        const sourceIndex = draftOrder.indexOf(href);
        if (sourceIndex < 0) return;

        // Tapping an existing quick-access module can start the swap directly.
        // Otherwise the user first chooses one of the four editable preview slots.
        if (selectedQuickSlot == null) {
            if (sourceIndex < 4) setSelectedQuickSlot(sourceIndex);
            return;
        }

        swapModuleIntoQuickSlot(href, selectedQuickSlot);
    }, [draftOrder, selectedQuickSlot, swapModuleIntoQuickSlot]);

    const promoteModuleToQuickAccess = React.useCallback((href: string) => {
        setDraftOrder((current) => {
            if (!current.includes(href)) return current;
            const without = current.filter((itemHref) => itemHref !== href);
            // Promote into editable slot 4 (visible quick-access position 5).
            // The displaced shortcut remains available and can be moved anywhere.
            const insertAt = Math.min(3, without.length);
            return [
                ...without.slice(0, insertAt),
                href,
                ...without.slice(insertAt),
            ];
        });
    }, []);

    const setMobileNavVisibility = React.useCallback((hiddenByUser: boolean) => {
        if (!isDealershipShell) return;
        setUserHidden(hiddenByUser);
        try {
            if (hiddenByUser) {
                window.localStorage.setItem(MOBILE_NAV_VISIBILITY_KEY, "1");
            } else {
                window.localStorage.removeItem(MOBILE_NAV_VISIBILITY_KEY);
            }
        } catch {
            // In-memory visibility still applies when storage is unavailable.
        }
    }, [isDealershipShell]);

    const saveCustomizedNavigation = React.useCallback(() => {
        if (!isDealershipShell) return;

        const nextOrder = composeStoredOrderFromEditable(
            draftOrder,
            activeCenterHref,
            activeAvailableItems,
            activeDefaultOrder,
        );
        const nextPreference: NavPreferenceState = {
            customized: true,
            order: nextOrder,
        };

        setNavPreferences((current) => ({
            ...current,
            [customizationScope]: nextPreference,
        }));

        try {
            const stored: StoredNavPreference = {
                version: 1,
                ...nextPreference,
            };
            window.localStorage.setItem(
                storageKey(customizationScope),
                JSON.stringify(stored),
            );
        } catch {
            // The in-memory preference still applies for this session if storage
            // is unavailable (private mode/storage restriction).
        }

        setDraftOrder(nextOrder);
        setCustomizerOpen(false);
    }, [
        isDealershipShell,
        draftOrder,
        activeCenterHref,
        activeAvailableItems,
        activeDefaultOrder,
        customizationScope,
    ]);

    const resetNavigationToDefault = React.useCallback(() => {
        if (!isDealershipShell) return;

        const nextOrder = lockActiveModuleToCenter(
            [],
            activeCenterHref,
            activeAvailableItems,
            activeDefaultOrder,
        );
        const nextPreference: NavPreferenceState = {
            customized: false,
            order: nextOrder,
        };

        setNavPreferences((current) => ({
            ...current,
            [customizationScope]: nextPreference,
        }));

        try {
            window.localStorage.removeItem(storageKey(customizationScope));
        } catch {
            // Reset still applies in memory even if storage is unavailable.
        }

        setDraftOrder(nextOrder);
        setCustomizerOpen(false);
    }, [
        isDealershipShell,
        activeCenterHref,
        activeAvailableItems,
        activeDefaultOrder,
        customizationScope,
    ]);

    const draftItems = React.useMemo(
        () =>
            draftOrder
                .map((href) => activeItemByHref.get(href))
                .filter((item): item is BottomNavItem => Boolean(item)),
        [draftOrder, activeItemByHref],
    );

    const filteredDraftItems = React.useMemo(() => {
        const query = moduleSearch.trim().toLowerCase();
        if (!query) return draftItems;
        return draftItems.filter((item) =>
            `${item.label} ${item.href}`.toLowerCase().includes(query),
        );
    }, [draftItems, moduleSearch]);

    const selectedQuickPosition = selectedQuickSlot == null
        ? null
        : editableIndexToQuickPosition(selectedQuickSlot);

    const draftPreviewItems = React.useMemo(() => {
        if (!activeCenterHref) return draftItems.slice(0, MAX_QUICK_ACCESS_ITEMS);
        const previewHrefs = [
            ...draftOrder.slice(0, 2),
            activeCenterHref,
            ...draftOrder.slice(2, 4),
        ];
        return previewHrefs
            .map((href) => activeItemByHref.get(href))
            .filter((item): item is BottomNavItem => Boolean(item));
    }, [draftOrder, activeCenterHref, activeItemByHref, draftItems]);

    const isSupraSpace = pathname === "/crm/supra-space" || pathname.startsWith("/crm/supra-space/");
    const inspectorActive = inventoryInspectorActive || transportationInspectorActive;
    // Hard invisibility preserves the old architecture for conversation workspaces
    // and keeps Suprah Space completely free of the dealership mobile navigation.
    const shouldBeInvisible = hiddenForConvo || hiddenForLeadConvo || hiddenForMailWorkspace || isSupraSpace;
    const shouldHide = !customizerOpen && (
        userHidden || (!inspectorActive && hidden) || shouldBeInvisible
    );
    const activeRouteIsPinned = isDealershipShell
        ? visibleItems.some((item) => isMovingItemActive(item))
        : true;

    return (
        <>
            <AnimatePresence>
                {customizerOpen && isDealershipShell && !shouldBeInvisible && (
                    <motion.div
                        className="fixed inset-0 z-[70] md:hidden print:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.button
                            type="button"
                            aria-label="Close navigation customization"
                            className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-[2px]"
                            onClick={closeCustomizer}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />

                        <motion.section
                            role="dialog"
                            aria-modal="true"
                            aria-label="Customize mobile navigation"
                            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] w-full max-w-[33rem] flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-border/70 bg-background/98 shadow-2xl backdrop-blur-2xl"
                            initial={{ y: 48, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 42, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        >
                            <div className="flex justify-center pb-1 pt-2">
                                <div className="h-1 w-10 rounded-full bg-border/80" />
                            </div>

                            <div className="flex items-start justify-between gap-3 border-b border-border/55 px-4 pb-3 pt-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                            <Menu className="size-4.5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-black tracking-tight text-foreground">
                                                    Mobile Navigation
                                                </h2>
                                                <span
                                                    className={cn(
                                                        "rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider",
                                                        activePreference.customized
                                                            ? "border-primary/30 bg-primary/10 text-primary"
                                                            : "border-border/60 bg-muted/20 text-muted-foreground",
                                                    )}
                                                >
                                                    {activePreference.customized ? "Customized" : "Default"}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                                                Tap a shortcut position, then choose the module you want there.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeCustomizer}
                                    aria-label="Close navigation editor"
                                    className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="border-b border-border/50 bg-muted/[0.07] px-3 py-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                                            Live Preview
                                        </p>
                                        <p className="mt-0.5 text-[9px] text-muted-foreground/65">
                                            Position 3 always follows the module you are currently using.
                                        </p>
                                    </div>
                                    <span className="rounded-lg border border-border/50 bg-background/70 px-2 py-1 font-mono text-[9px] font-bold text-muted-foreground">
                                        {customizationScope === "inventory" ? "Inventory" : "Main"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-5 items-end gap-1 rounded-2xl border border-border/55 bg-background/70 px-2 pb-2 pt-3">
                                    {draftPreviewItems.map((item, index) => {
                                        const Icon = item.icon;
                                        const center = index === CENTER_QUICK_ACCESS_INDEX;
                                        const editableIndex = previewIndexToEditableIndex(index);
                                        const selected = editableIndex != null && selectedQuickSlot === editableIndex;
                                        const previewBody = (
                                            <>
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-center border transition-all",
                                                        center
                                                            ? "size-11 rounded-full border-primary/45 bg-primary text-black shadow-md ring-4 ring-primary/15"
                                                            : "size-9 rounded-xl border-border/50 bg-muted/20 text-muted-foreground",
                                                        selected && "border-primary bg-primary/12 text-primary ring-2 ring-primary/30",
                                                    )}
                                                >
                                                    <Icon className={center ? "size-5" : "size-4"} strokeWidth={center || selected ? 2.5 : 2} />
                                                </div>
                                                <span
                                                    className={cn(
                                                        "w-full truncate px-0.5 text-center text-[8px] font-bold uppercase tracking-tight",
                                                        center || selected ? "text-primary" : "text-muted-foreground/70",
                                                    )}
                                                    title={item.label}
                                                >
                                                    {item.label}
                                                </span>
                                                <span className={cn(
                                                    "text-[7px] font-black uppercase tracking-wider",
                                                    center || selected ? "text-primary" : "text-muted-foreground/50",
                                                )}>
                                                    {center ? "Active" : selected ? "Selected" : `Pos ${index + 1}`}
                                                </span>
                                            </>
                                        );

                                        if (center || editableIndex == null) {
                                            return (
                                                <div key={`${item.href}-${index}`} className="flex min-w-0 flex-col items-center gap-1">
                                                    {previewBody}
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={`${item.href}-${index}`}
                                                type="button"
                                                onClick={() => setSelectedQuickSlot(editableIndex)}
                                                aria-pressed={selected}
                                                aria-label={`Select quick access position ${index + 1}, currently ${item.label}`}
                                                className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                            >
                                                {previewBody}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <div className="border-b border-border/45 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">
                                                Tap to Swap
                                            </p>
                                            <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/65">
                                                {selectedQuickPosition
                                                    ? `Position ${selectedQuickPosition} selected. Tap a module below to swap it in.`
                                                    : "Select position 1, 2, 4 or 5 above, then tap a module below."}
                                            </p>
                                        </div>
                                        {selectedQuickPosition ? (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedQuickSlot(null)}
                                                className="h-8 shrink-0 rounded-lg border border-primary/25 bg-primary/8 px-2.5 text-[9px] font-black uppercase tracking-wider text-primary"
                                            >
                                                Clear
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="relative mt-3">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                                        <input
                                            value={moduleSearch}
                                            onChange={(event) => setModuleSearch(event.target.value)}
                                            placeholder="Search modules"
                                            className="h-11 w-full rounded-xl border border-border/60 bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                                        />
                                        {moduleSearch ? (
                                            <button
                                                type="button"
                                                onClick={() => setModuleSearch("")}
                                                aria-label="Clear module search"
                                                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="space-y-1.5 px-3 py-3">
                                    {filteredDraftItems.map((item) => {
                                        const Icon = item.icon;
                                        const sourceIndex = draftOrder.indexOf(item.href);
                                        const quickPosition = sourceIndex < 4 ? editableIndexToQuickPosition(sourceIndex) : null;
                                        const selectedSource = selectedQuickSlot === sourceIndex;
                                        const requiresSlotSelection = selectedQuickSlot == null && sourceIndex >= 4;
                                        return (
                                            <button
                                                key={item.href}
                                                type="button"
                                                onClick={() => handleModuleTap(item.href)}
                                                disabled={requiresSlotSelection}
                                                className={cn(
                                                    "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                                                    selectedSource
                                                        ? "border-primary/40 bg-primary/10"
                                                        : "border-border/55 bg-background/70 hover:border-primary/25 hover:bg-muted/20",
                                                    requiresSlotSelection && "cursor-not-allowed opacity-55 hover:border-border/55 hover:bg-background/70",
                                                )}
                                            >
                                                <span className={cn(
                                                    "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                                                    quickPosition
                                                        ? "border-primary/25 bg-primary/10 text-primary"
                                                        : "border-border/50 bg-muted/25 text-muted-foreground",
                                                )}>
                                                    <Icon className="size-4.5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold text-foreground">{item.label}</span>
                                                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground/65">
                                                        {quickPosition ? `Currently position ${quickPosition}` : "Available module"}
                                                    </span>
                                                </span>
                                                <span className={cn(
                                                    "shrink-0 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider",
                                                    selectedQuickPosition
                                                        ? "bg-primary text-primary-foreground"
                                                        : quickPosition
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-muted/40 text-muted-foreground",
                                                )}>
                                                    {selectedQuickPosition ? "Swap" : quickPosition ? "Select" : "Choose slot"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {filteredDraftItems.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                                            No modules match your search.
                                        </div>
                                    ) : null}
                                </div>

                                <div className="border-t border-border/45 px-3 py-3">
                                    <button
                                        type="button"
                                        onClick={() => setAdvancedArrangeOpen((open) => !open)}
                                        aria-expanded={advancedArrangeOpen}
                                        className="flex h-11 w-full items-center justify-between rounded-xl border border-border/60 bg-muted/15 px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted/30"
                                    >
                                        <span className="flex items-center gap-2">
                                            <GripVertical className="size-4 text-muted-foreground" />
                                            Advanced drag arrangement
                                        </span>
                                        {advancedArrangeOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                    </button>

                                    {advancedArrangeOpen ? (
                                        <Reorder.Group
                                            axis="y"
                                            values={draftOrder}
                                            onReorder={handleDraftReorder}
                                            className="mt-2 space-y-2"
                                        >
                                            {draftItems.map((item, index) => (
                                                <DraggableNavigationRow
                                                    key={item.href}
                                                    item={item}
                                                    index={index}
                                                    active={false}
                                                    onPromote={promoteModuleToQuickAccess}
                                                />
                                            ))}
                                        </Reorder.Group>
                                    ) : null}
                                </div>
                            </div>

                            <div className="border-t border-border/55 bg-background/98 px-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileNavVisibility(!userHidden)}
                                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/65 bg-muted/15 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 items-center justify-center rounded-xl bg-background text-muted-foreground">
                                            {userHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">
                                                {userHidden ? "Show mobile navigation" : "Hide mobile navigation"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/65">
                                                {userHidden
                                                    ? "Restore the five quick-access shortcuts."
                                                    : "A small recovery menu remains available."}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-primary">
                                        {userHidden ? "Show" : "Hide"}
                                    </span>
                                </button>
                            </div>

                            <div
                                className="grid grid-cols-2 gap-2 bg-background/98 p-3"
                                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
                            >
                                <button
                                    type="button"
                                    onClick={resetNavigationToDefault}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                                >
                                    <RotateCcw className="size-3.5" />
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={saveCustomizedNavigation}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground shadow-sm transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                                >
                                    <Save className="size-3.5" />
                                    Save Changes
                                </button>
                            </div>
                        </motion.section>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDealershipShell && userHidden && !shouldBeInvisible && !customizerOpen && (
                    <motion.div
                        className="fixed right-3 z-[60] flex items-center gap-2 md:hidden print:hidden"
                        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
                        initial={{ y: 18, opacity: 0, scale: 0.94 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 18, opacity: 0, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    >
                        <button
                            type="button"
                            onClick={() => setMobileNavVisibility(false)}
                            aria-label="Show mobile bottom navigation"
                            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/35 bg-background/95 px-3 text-primary shadow-xl backdrop-blur-xl transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <Eye className="size-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Show</span>
                        </button>
                        <button
                            type="button"
                            onClick={openCustomizer}
                            aria-label="Open mobile navigation menu"
                            aria-expanded={customizerOpen}
                            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border/65 bg-background/95 px-3 text-muted-foreground shadow-xl backdrop-blur-xl transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            <Menu className="size-4" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Menu</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.nav
            initial={{ y: 140, opacity: 0 }}
            animate={{ y: shouldHide ? 140 : 0, opacity: shouldBeInvisible || userHidden ? 0 : hidden ? 0.88 : 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.85 }}
            className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 md:hidden select-none print:hidden"
            style={{
                paddingBottom: "env(safe-area-inset-bottom)",
                pointerEvents: shouldBeInvisible || userHidden ? "none" : undefined,
            }}
        >
            <div className="mx-auto w-[min(100%-1rem,33rem)] mb-2.5">
                <div
                    className={cn(
                        "relative rounded-3xl border backdrop-blur-2xl px-1.5 pt-4 pb-1.5 overflow-visible",
                        useMovingActiveTreatment
                            ? "border-border/70 bg-background/95 dark:bg-background/90 shadow-[0_12px_38px_rgba(0,0,0,0.38)]"
                            : "border-border/40 bg-background/70 dark:bg-background/60 shadow-[0_10px_34px_rgba(0,0,0,0.2)]",
                    )}
                >
                    {isDealershipShell && (
                        <div className="absolute -top-10 right-2 flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setMobileNavVisibility(true)}
                                aria-label="Hide mobile bottom navigation"
                                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/65 bg-background/95 px-2.5 text-muted-foreground shadow-lg backdrop-blur-xl transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                <EyeOff className="size-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Hide</span>
                            </button>
                            <button
                                type="button"
                                onClick={openCustomizer}
                                aria-label="Customize mobile navigation"
                                aria-expanded={customizerOpen}
                                className={cn(
                                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5",
                                    "bg-background/95 shadow-lg backdrop-blur-xl transition-all",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                    customizerOpen
                                        ? "border-primary/45 text-primary"
                                        : activeRouteIsPinned
                                            ? "border-border/65 text-muted-foreground hover:text-foreground"
                                            : "border-primary/45 text-primary",
                                )}
                            >
                                <Menu className="size-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Menu</span>
                                {!activeRouteIsPinned && (
                                    <span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                                )}
                            </button>
                        </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />

                    <div
                        className="grid items-end gap-0.5"
                        style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
                    >
                        {visibleItems.map((item, index) => {
                            const active = useMovingActiveTreatment
                                ? isMovingItemActive(item)
                                : isActive(item.href);
                            const pending = pendingHref === item.href && !active;
                            const Icon = item.icon;
                            const handoffToInstalledApp =
                                item.href === SUPRASPACE_EMBEDDED_HREF && supraSpaceInstalledElsewhere;
                            const linkHref = handoffToInstalledApp ? SUPRASPACE_SUBDOMAIN_URL : item.href;
                            const linkTargetProps = handoffToInstalledApp
                                ? { target: "_blank" as const, rel: "noopener" }
                                : {};

                            if (useMovingActiveTreatment) {
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ y: 8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.03, duration: 0.22, ease: "easeOut" }}
                                        className="flex justify-center"
                                    >
                                        <Link
                                            href={linkHref}
                                            {...linkTargetProps}
                                            aria-current={active ? "page" : undefined}
                                            aria-busy={pending || undefined}
                                            onClick={(event) => handleNavClick(event, item, handoffToInstalledApp)}
                                            className={cn(
                                                "relative flex min-w-0 flex-col items-center gap-0.5",
                                                active ? "-mt-7" : "py-1",
                                            )}
                                        >
                                            <motion.div
                                                whileTap={{ scale: active ? 0.9 : 0.84 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                                                className={cn(
                                                    "relative flex items-center justify-center transition-all duration-200",
                                                    active
                                                        ? "h-13 w-13 rounded-full bg-primary ring-4 ring-primary/25 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
                                                        : "h-8 w-10 rounded-xl bg-transparent",
                                                )}
                                            >
                                                {active && (
                                                    <motion.div
                                                        layoutId="activeMobileNavCircle"
                                                        className="absolute inset-0 rounded-full bg-primary"
                                                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                                                    />
                                                )}

                                                <motion.div
                                                    className="relative z-10"
                                                    animate={{
                                                        rotate: active ? 4 : 0,
                                                        scale: active ? 1.04 : pending ? 0.96 : 1,
                                                        opacity: pending ? 0.82 : 1,
                                                    }}
                                                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            "transition-colors duration-200",
                                                            active
                                                                ? "size-5.5 text-black"
                                                                : pending
                                                                    ? "size-5 text-primary"
                                                                    : "size-5 text-muted-foreground/65",
                                                        )}
                                                        strokeWidth={active ? 2.5 : pending ? 2.2 : 1.8}
                                                    />
                                                </motion.div>

                                                {pending && (
                                                    <motion.span
                                                        className="absolute -bottom-0.5 size-1 rounded-full bg-primary"
                                                        initial={{ opacity: 0.4, scale: 0.7 }}
                                                        animate={{ opacity: [0.4, 1, 0.4], scale: [0.7, 1, 0.7] }}
                                                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                                                    />
                                                )}
                                            </motion.div>

                                            <span
                                                className={cn(
                                                    "max-w-full truncate px-0.5 text-center text-[8px] font-semibold uppercase tracking-[0.04em] transition-colors duration-200 sm:text-[9px]",
                                                    active
                                                        ? "text-primary"
                                                        : pending
                                                            ? "text-primary/80"
                                                            : "text-muted-foreground/55",
                                                )}
                                                title={item.label}
                                            >
                                                {item.label}
                                            </span>
                                        </Link>
                                    </motion.div>
                                );
                            }

                            if (item.isCenter) {
                                return (
                                    <motion.div
                                        key={item.href}
                                        initial={{ y: 8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: index * 0.03, duration: 0.22, ease: "easeOut" }}
                                        className="flex justify-center"
                                    >
                                        <Link
                                            href={linkHref}
                                            {...linkTargetProps}
                                            aria-current={active ? "page" : undefined}
                                            aria-busy={pending || undefined}
                                            onClick={(event) => handleNavClick(event, item, handoffToInstalledApp)}
                                            className="relative -mt-7 flex flex-col items-center gap-0.5"
                                        >
                                            <motion.div
                                                whileTap={{ scale: 0.9 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 26 }}
                                                className={cn(
                                                    "relative flex h-13 w-13 items-center justify-center rounded-full",
                                                    "shadow-[0_8px_24px_rgba(0,0,0,0.28)]",
                                                    "transition-all duration-200",
                                                    active ? "bg-primary ring-4 ring-primary/25" : "bg-primary/95",
                                                )}
                                            >
                                                <motion.div
                                                    animate={{ rotate: active ? 4 : 0, scale: active ? 1.02 : 1 }}
                                                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                                                >
                                                    <Icon
                                                        className="size-5.5 text-primary-foreground"
                                                        strokeWidth={active ? 2.5 : 2.15}
                                                    />
                                                </motion.div>
                                            </motion.div>
                                            <span
                                                className={cn(
                                                    "text-[9px] font-semibold tracking-wide uppercase",
                                                    active ? "text-primary" : "text-muted-foreground/70",
                                                )}
                                            >
                                                {item.label}
                                            </span>
                                        </Link>
                                    </motion.div>
                                );
                            }

                            return (
                                <motion.div
                                    key={item.href}
                                    initial={{ y: 8, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.03, duration: 0.22, ease: "easeOut" }}
                                >
                                    <Link
                                        href={linkHref}
                                        {...linkTargetProps}
                                        aria-current={active ? "page" : undefined}
                                        aria-busy={pending || undefined}
                                        onClick={(event) => handleNavClick(event, item, handoffToInstalledApp)}
                                        className="flex flex-col items-center gap-0.5 py-1"
                                    >
                                        <motion.div
                                            whileTap={{ scale: 0.84 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                            className="relative flex flex-col items-center gap-0.5"
                                        >
                                            <div
                                                className={cn(
                                                    "relative flex items-center justify-center rounded-xl px-2.5 py-1 transition-all duration-200",
                                                    active ? "bg-primary/14 dark:bg-primary/20" : "bg-transparent",
                                                )}
                                            >
                                                {active && (
                                                    <motion.div
                                                        layoutId="navPill"
                                                        className="absolute inset-0 rounded-xl bg-primary/12 dark:bg-primary/18"
                                                        transition={{ type: "spring", stiffness: 380, damping: 36 }}
                                                    />
                                                )}
                                                <Icon
                                                    className={cn(
                                                        "relative size-5 transition-colors duration-200",
                                                        active
                                                            ? "text-primary"
                                                            : pending
                                                                ? "text-primary/80"
                                                                : "text-muted-foreground/60",
                                                    )}
                                                    strokeWidth={active ? 2.45 : pending ? 2.1 : 1.8}
                                                />
                                            </div>
                                            <span
                                                className={cn(
                                                    "text-[9px] font-semibold tracking-wide uppercase transition-colors duration-200",
                                                    active
                                                        ? "text-primary"
                                                        : pending
                                                            ? "text-primary/75"
                                                            : "text-muted-foreground/50",
                                                )}
                                            >
                                                {item.label}
                                            </span>
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
            </motion.nav>
        </>
    );
}