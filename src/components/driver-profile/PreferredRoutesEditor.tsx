"use client";

import * as React from "react";
import { Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/components/driver-profile/driver-profile-constants";
import {
  formatPreferredRoute,
  preferredRouteIdentity,
  type PreferredRouteDirection,
} from "@/lib/preferred-route";
import { cn } from "@/lib/utils";

interface PreferredRoutesEditorProps {
  routes: string[];
  onChange: (routes: string[]) => void;
  defaultFromState?: string | null;
  defaultFromCity?: string | null;
  maxRoutes?: number;
  className?: string;
  showDescription?: boolean;
}

export function PreferredRoutesEditor({
  routes,
  onChange,
  defaultFromState,
  defaultFromCity,
  maxRoutes = 10,
  className,
  showDescription = true,
}: PreferredRoutesEditorProps) {
  const [fromState, setFromState] = React.useState(defaultFromState || "");
  const [fromCity, setFromCity] = React.useState(defaultFromCity || "");
  const [toState, setToState] = React.useState("");
  const [toCity, setToCity] = React.useState("");
  const [direction, setDirection] =
    React.useState<PreferredRouteDirection>("one_way");

  const appliedDefaultOriginRef = React.useRef(false);
  const originTouchedRef = React.useRef(false);

  React.useEffect(() => {
    if (appliedDefaultOriginRef.current || originTouchedRef.current) return;
    if (!defaultFromState && !defaultFromCity) return;

    if (defaultFromState) setFromState(defaultFromState);
    if (defaultFromCity) setFromCity(defaultFromCity);
    appliedDefaultOriginRef.current = true;
  }, [defaultFromCity, defaultFromState]);

  const handleFromStateChange = React.useCallback((value: string) => {
    originTouchedRef.current = true;
    appliedDefaultOriginRef.current = true;
    setFromState(value);
  }, []);

  const handleFromCityChange = React.useCallback((value: string) => {
    originTouchedRef.current = true;
    appliedDefaultOriginRef.current = true;
    setFromCity(value);
  }, []);

  const addRoute = () => {
    if (routes.length >= maxRoutes) {
      toast.error(`You can save up to ${maxRoutes} preferred routes.`);
      return;
    }

    if (!fromState || !toState) {
      toast.error("Select both the From state and To state.");
      return;
    }

    const normalizedFromCity = fromCity.trim();
    const normalizedToCity = toCity.trim();
    if (
      fromState === toState &&
      normalizedFromCity.toLowerCase() === normalizedToCity.toLowerCase()
    ) {
      toast.error(
        normalizedFromCity
          ? "The From and To locations must be different."
          : "For an in-state route, add at least one city so the route is meaningful.",
      );
      return;
    }

    const route = formatPreferredRoute({
      fromState,
      fromCity: normalizedFromCity,
      toState,
      toCity: normalizedToCity,
      direction,
    });

    if (!route) {
      toast.error("Choose valid states for the preferred route.");
      return;
    }

    const identity = preferredRouteIdentity(route);
    const duplicate = routes.some((savedRoute) => {
      const savedIdentity = preferredRouteIdentity(savedRoute);
      return identity ? savedIdentity === identity : savedRoute === route;
    });

    if (duplicate) {
      toast.error("That preferred route is already saved.");
      return;
    }

    onChange([...routes, route]);
    // Most drivers build multiple lanes from the same home base. Keep the
    // origin and clear only the destination for the next quick route entry.
    setToState("");
    setToCity("");
  };

  const swapEndpoints = () => {
    const nextFromState = toState;
    const nextFromCity = toCity;
    originTouchedRef.current = true;
    appliedDefaultOriginRef.current = true;
    setToState(fromState);
    setToCity(fromCity);
    setFromState(nextFromState);
    setFromCity(nextFromCity);
  };

  return (
    <div className={cn("space-y-5", className)}>
      {showDescription && (
        <p className="text-sm leading-relaxed text-muted-foreground/90">
          Choose a From and To state. Cities are optional: leave a city blank
          to prefer the whole state corridor. One Way matches only the listed
          direction; Two Way matches both directions. Preferred routes improve
          recommendations but never block other loads.
        </p>
      )}

      <div className="rounded-xl border border-border/60 bg-background/35 p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:items-end">
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              From
            </p>
            <Select value={fromState} onValueChange={handleFromStateChange}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={`preferred-route-from-${state}`} value={String(state)}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={fromCity}
              onChange={(event) => handleFromCityChange(event.target.value)}
              placeholder="City (optional / any city)"
              maxLength={60}
              className="h-10 text-sm"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 px-3 text-sm font-semibold"
            onClick={swapEndpoints}
            disabled={!fromState && !toState && !fromCity && !toCity}
          >
            Swap
          </Button>

          <div className="space-y-2 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              To
            </p>
            <Select value={toState} onValueChange={setToState}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={`preferred-route-to-${state}`} value={String(state)}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={toCity}
              onChange={(event) => setToCity(event.target.value)}
              placeholder="City (optional / any city)"
              maxLength={60}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Direction
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-10 text-sm font-semibold",
                direction === "one_way" &&
                  "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
              onClick={() => setDirection("one_way")}
            >
              One Way →
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-10 text-sm font-semibold",
                direction === "two_way" &&
                  "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
              onClick={() => setDirection("two_way")}
            >
              Two Way ↔
            </Button>
          </div>
        </div>

        <Button
          type="button"
          className="w-full h-10 text-sm font-bold"
          onClick={addRoute}
          disabled={routes.length >= maxRoutes}
        >
          <Plus className="size-4 mr-1.5" />
          Add Preferred Route
        </Button>
      </div>

      {routes.length > 0 ? (
        <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain pr-1">
          {routes.map((route) => {
            const twoWay = /↔|<->|⇄/.test(route);
            return (
              <div
                key={route}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5"
              >
                <Route className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
                    {route}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90">
                    {twoWay
                      ? "Two Way · both directions preferred"
                      : "One Way · listed direction preferred"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 shrink-0 text-sm font-medium text-destructive hover:text-destructive"
                  onClick={() => onChange(routes.filter((savedRoute) => savedRoute !== route))}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/70 text-center py-2">
          No preferred routes added yet
        </p>
      )}

      <p className="text-xs font-medium text-muted-foreground">
        {routes.length}/{maxRoutes} routes
      </p>
    </div>
  );
}