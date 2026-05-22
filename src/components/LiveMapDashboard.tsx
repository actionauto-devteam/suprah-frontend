"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "@tanstack/react-query";
import { getActiveDrivers, ActiveDriver } from "@/lib/api/loads";
import { Loader2, Navigation2, MapPin, Package, User, Truck, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/ThemeContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const STATUS_COLORS = {
  "on-route": "#10b981", // emerald-500
  "idle": "#f59e0b",     // amber-500
  "on-break": "#8b5cf6", // violet-500
  "waiting": "#3b82f6",  // blue-500
  "offline": "#64748b",  // slate-500
};

export function LiveMapDashboard() {
  const { theme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapThemeRef = useRef<"light" | "dark" | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [selectedDriver, setSelectedDriver] = useState<ActiveDriver | null>(null);

  const { data: drivers = [], isLoading, refetch } = useQuery({
    queryKey: ["active-drivers"],
    queryFn: getActiveDrivers,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token is missing!");
      return;
    }
    mapboxgl.accessToken = token;
    mapThemeRef.current = theme;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v11",
      center: [-111.891, 40.7608], // Salt Lake City default
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || mapThemeRef.current === theme) return;
    mapThemeRef.current = theme;
    map.current.setStyle(
      theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v11",
    );
  }, [theme]);

  useEffect(() => {
    if (!map.current) return;

    // Update markers
    drivers.forEach((driver) => {
      const { lat, lng } = driver.coords;
      const id = driver.id;

      if (markers.current[id]) {
        markers.current[id].setLngLat([lng, lat]);
        const el = markers.current[id].getElement();
        const dot = el.querySelector('.status-dot') as HTMLDivElement;
        if (dot) dot.style.backgroundColor = STATUS_COLORS[driver.status] || STATUS_COLORS.offline;
      } else {
        const el = document.createElement("div");
        el.className = "marker-container cursor-pointer transition-all hover:scale-110";
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="relative size-8 rounded-full border border-border shadow-sm flex items-center justify-center bg-card overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div class="status-dot absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-background shadow-xs" style="background-color: ${STATUS_COLORS[driver.status] || STATUS_COLORS.offline}"></div>
          </div>
        `;

        el.onclick = () => setSelectedDriver(driver);

        markers.current[id] = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }
    });

    // Remove old markers
    Object.keys(markers.current).forEach((id) => {
      if (!drivers.find((d) => d.id === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    if (drivers.length > 0 && map.current.getZoom() < 5) {
      const bounds = new mapboxgl.LngLatBounds();
      drivers.forEach((d) => bounds.extend([d.coords.lng, d.coords.lat]));
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 10 });
    }
  }, [drivers]);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] rounded-xl overflow-hidden border border-border bg-muted/10">
      <div ref={mapContainer} className="absolute inset-0" />

      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
          <ShieldAlert className="size-12 text-destructive mb-4" />
          <h2 className="text-lg font-bold">Mapbox Token Missing</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md px-6">
            Please add your Mapbox API key to the <code className="bg-muted px-1.5 py-0.5 rounded">.env.local</code> file as <code className="bg-muted px-1.5 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the live map.
          </p>
        </div>
      )}

      {/* Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-card border border-border px-4 py-2 rounded-lg shadow-sm flex items-center gap-3 pointer-events-auto">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Fleet Live</span>
          <div className="h-3 w-px bg-border mx-1" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{drivers.length} Drivers</span>
        </div>

        <button 
          onClick={() => refetch()}
          className="bg-card border border-border p-2 rounded-lg shadow-sm text-muted-foreground hover:text-primary transition-colors pointer-events-auto"
        >
          {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
        </button>
      </div>

      {/* Driver List Overlay (Left) */}
      <div className="absolute top-16 left-4 bottom-4 w-64 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
            <Truck className="size-3.5" />
            Active Drivers
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <User className="size-6 opacity-20 mb-2" />
              <p className="text-[10px] font-bold uppercase">No active drivers</p>
            </div>
          ) : (
            drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelectedDriver(d);
                  map.current?.flyTo({ center: [d.coords.lng, d.coords.lat], zoom: 12 });
                }}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg transition-all hover:bg-muted/50 border border-transparent",
                  selectedDriver?.id === d.id ? "bg-primary/5 border-primary/10" : ""
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                      {d.driver.avatar ? (
                        <img src={d.driver.avatar} alt={d.driver.name} className="size-full object-cover" />
                      ) : (
                        <User className="size-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-card" style={{ backgroundColor: STATUS_COLORS[d.status] || STATUS_COLORS.offline }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate text-foreground">{d.driver.name}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">{d.status.replace('-', ' ')}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Driver Detail Overlay (Right/Bottom) */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-16 right-4 w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                     {selectedDriver.driver.avatar ? (
                        <img src={selectedDriver.driver.avatar} alt={selectedDriver.driver.name} className="size-full object-cover" />
                      ) : (
                        <User className="size-5 text-muted-foreground/50" />
                      )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{selectedDriver.driver.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">{selectedDriver.driver.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
                  <Navigation2 className="size-3.5 rotate-[-135deg]" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[selectedDriver.status] || STATUS_COLORS.offline }} />
                    <span className="text-[10px] font-bold uppercase">{selectedDriver.status.replace('-', ' ')}</span>
                  </div>
                </div>
                <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Last Seen</span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                    <Clock className="size-3 text-muted-foreground" />
                    {formatDistanceToNow(new Date(selectedDriver.lastSeenAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {selectedDriver.equipment && (
                <div className="space-y-2">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Equipment Detail</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-muted/20 border border-border/50 rounded-lg">
                      <p className="text-muted-foreground text-[8px] uppercase mb-0.5">Trailer</p>
                      <p className="font-bold">{selectedDriver.equipment.trailerType}</p>
                    </div>
                    <div className="p-2 bg-muted/20 border border-border/50 rounded-lg">
                      <p className="text-muted-foreground text-[8px] uppercase mb-0.5">Capacity</p>
                      <p className="font-bold">{selectedDriver.equipment.maxVehicleCapacity} Units</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Active Shipments ({selectedDriver.shipments.length})</p>
                <div className="space-y-1.5">
                  {selectedDriver.shipments.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/60 italic p-2 bg-muted/10 rounded-lg border border-dashed border-border/50 text-center">No active loads</p>
                  ) : (
                    selectedDriver.shipments.map(s => (
                      <div key={s.id} className="p-2.5 bg-muted/20 border border-border/50 rounded-lg flex items-center justify-between">
                         <div className="min-w-0">
                            <span className="text-[9px] font-bold text-primary block mb-0.5">{s.trackingNumber}</span>
                            <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                              <MapPin className="size-2.5 text-muted-foreground/50 shrink-0" />
                              <span className="truncate">{s.origin} &rarr; {s.destination}</span>
                            </div>
                         </div>
                         <Badge variant="outline" className="text-[8px] font-bold px-1 py-0 border-primary/20 text-primary uppercase h-4">
                           {s.status}
                         </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button className="w-full h-9 bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
                Contact Driver
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-bottom-left {
          display: none !important;
        }
        .marker-container {
          will-change: transform;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary), 0.2);
        }
      `}</style>
    </div>
  );
}
