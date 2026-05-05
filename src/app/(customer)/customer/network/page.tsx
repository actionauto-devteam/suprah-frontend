"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Navigation, Phone, Clock, Navigation2, Gift, Crosshair, RefreshCw } from "lucide-react"
import mapboxgl from "mapbox-gl"

import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"

function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function ServiceNetworkPage() {
    const { getToken } = useAuth()
    const [locations, setLocations] = React.useState<any[]>([])
    const [sortedLocations, setSortedLocations] = React.useState<any[]>([])
    const [searchQuery, setSearchQuery] = React.useState("")
    const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [mapNotice, setMapNotice] = React.useState<string | null>(null)

    const mapRef = React.useRef<HTMLDivElement | null>(null)
    const mapInstanceRef = React.useRef<mapboxgl.Map | null>(null)
    const markersRef = React.useRef<mapboxgl.Marker[]>([])
    const userMarkerRef = React.useRef<mapboxgl.Marker | null>(null)

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

    const fetchLocations = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const token = await getToken()
            const res = await apiClient.get('/api/service/locations', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setLocations(res.data?.data || [])
        } catch (e) {
            console.error("Failed to fetch locations", e)
        } finally {
            setIsLoading(false)
        }
    }, [getToken])

    React.useEffect(() => {
        fetchLocations()
    }, [fetchLocations])

    React.useEffect(() => {
        const token = mapboxToken?.trim();
        if (!token || !mapRef.current || mapInstanceRef.current) return;

        if (!token.startsWith('pk.')) {
            setMapNotice("Invalid Mapbox token. Must start with pk.");
            return;
        }

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
            container: mapRef.current,
            style: "mapbox://styles/mapbox/dark-v11",
            center: [-111.8910, 40.7608], // Default to SLC roughly
            zoom: 8,
            attributionControl: false,
        });

        const nav = new mapboxgl.NavigationControl({ showCompass: false });
        map.addControl(nav, 'top-right');

        map.on('load', () => {
            map.resize();
        });

        map.on('error', (e) => {
            console.error('Mapbox error:', e);
            setMapNotice("Map style failed to load. Check token or network.");
        });

        // Robust Resize Observer for Flexbox/Animation sizing issues
        const resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.resize();
            }
        });
        resizeObserver.observe(mapRef.current);

        mapInstanceRef.current = map;

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapInstanceRef.current = null;
        }
    }, [mapboxToken]);

    React.useEffect(() => {
        // Filter and compute distances
        const filtered = locations.filter(loc =>
            loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            loc.zipCode.includes(searchQuery) ||
            loc.address.toLowerCase().includes(searchQuery.toLowerCase())
        );

        let parsed = filtered.map(loc => {
            let distNum = Infinity;
            if (userCoords && loc.location?.coordinates) {
                distNum = getDistanceFromLatLonInMiles(
                    userCoords.lat, userCoords.lng,
                    loc.location.coordinates[1], loc.location.coordinates[0]
                );
            }
            return {
                ...loc,
                distanceNum: distNum,
                distance: distNum === Infinity ? "" : `${distNum.toFixed(1)} miles`,
                time: distNum === Infinity ? "" : `${Math.round((distNum / 35) * 60)} min`
            }
        });

        if (userCoords) {
            // Sort by distance if we have coords
            parsed = parsed.sort((a, b) => a.distanceNum - b.distanceNum);
        } else {
            // Otherwise sort alphabetically by City
            parsed = parsed.sort((a, b) => a.city.localeCompare(b.city));
        }

        setSortedLocations(parsed);
    }, [locations, searchQuery, userCoords]);

    React.useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        sortedLocations.forEach((loc, index) => {
            if (!loc.location?.coordinates) return;
            const [lng, lat] = loc.location.coordinates;

            const isClosest = userCoords && index === 0;
            const color = isClosest ? "#16a34a" : "#52525b"; // Green for closest

            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
                `<div style="color: #18181b; padding: 4px;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${loc.name}</div>
                    <div style="font-size: 12px; color: #52525b;">${loc.address}, ${loc.city}</div>
                    ${loc.distance ? `<div style="font-size: 12px; font-weight: 600; color: #16a34a; margin-top: 4px;">${loc.distance} away</div>` : ''}
                </div>`
            );

            const marker = new mapboxgl.Marker({ color })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push(marker);
        });

    }, [sortedLocations, userCoords]);

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        setMapNotice("Locating...");
        navigator.geolocation.getCurrentPosition((pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserCoords(coords);
            setMapNotice(null);

            if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo({
                    center: [coords.lng, coords.lat],
                    zoom: 12,
                    essential: true,
                    duration: 2000
                });

                // Add a dot for user location
                if (userMarkerRef.current) userMarkerRef.current.remove();

                const el = document.createElement('div');
                el.className = 'w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white shadow-[0_0_10px_rgba(59,130,246,0.8)]';

                userMarkerRef.current = new mapboxgl.Marker({ element: el })
                    .setLngLat([coords.lng, coords.lat])
                    .addTo(mapInstanceRef.current);
            }
        }, (err) => {
            setMapNotice("Failed to get location.");
            console.error(err);
        });
    }

    const flyToLocation = (loc: any) => {
        if (!mapInstanceRef.current || !loc.location?.coordinates) return;
        const [lng, lat] = loc.location.coordinates;
        mapInstanceRef.current.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500
        });

        // Trigger the popup corresponding to this location
        const markerIndex = sortedLocations.findIndex(l => l._id === loc._id);
        if (markerIndex !== -1 && markersRef.current[markerIndex]) {
            markersRef.current[markerIndex].togglePopup();
        }
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        Service Network
                    </h1>
                    <p className="text-muted-foreground mt-1 max-w-2xl">
                        Find an Action Auto partner location near you. Simply show your membership card to redeem exclusive service discounts.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Enter Zip or City..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        />
                    </div>
                    <Button onClick={handleLocateMe} variant="outline" className="shrink-0 bg-white dark:bg-zinc-900">
                        <Crosshair className="w-4 h-4 mr-2" /> Locate Me
                    </Button>
                </div>
            </div>

            {/* Map & List Layout */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

                {/* Left Col: Locations List */}
                <div className="w-full lg:w-100 flex flex-col gap-4 overflow-y-auto pr-2 pb-8 custom-scrollbar">

                    {/* Membership Card */}
                    {/* <Card className="p-0 overflow-hidden relative border-none shadow-xl bg-gradient-to-br from-green-600 to-emerald-900 shrink-0">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }} />

                        <div className="p-6 relative z-10 text-white">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold tracking-widest uppercase text-sm text-green-200">Action Auto Member</span>
                                <Gift className="w-5 h-5 text-green-300" />
                            </div>
                            <h3 className="text-2xl font-extrabold tracking-tight mb-1">Cris Paulo</h3>
                            <p className="text-green-200 text-sm font-mono tracking-wider">ID: 1029-4481-9920</p>

                            <div className="mt-8 pt-4 border-t border-white/20 flex justify-between items-center">
                                <p className="text-xs font-medium text-green-100 uppercase tracking-widest max-w-[150px]">Show this barcode at any partner location</p>
                                <div className="bg-white/90 px-2 py-1 rounded h-10 w-24 flex items-center justify-center">
                                    <div className="flex gap-0.5 h-full w-full py-1 justify-center items-center">
                                        <div className="w-1 h-full bg-black"></div><div className="w-0.5 h-full bg-black"></div><div className="w-1.5 h-full bg-black"></div><div className="w-0.5 h-full bg-black"></div><div className="w-1 h-full bg-black"></div><div className="w-0.5 h-full bg-black"></div><div className="w-1.5 h-full bg-black"></div><div className="w-1 h-full bg-black"></div><div className="w-0.5 h-full bg-black"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card> */}

                    <div className="flex justify-between items-end mt-4 mb-2 shrink-0">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Nearest Locations (Jiffy Lube)</h3>
                        <span className="text-xs font-medium text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{sortedLocations.length} results</span>
                    </div>

                    <div className="flex flex-col gap-3 pb-4 shrink-0">
                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2 border border-dashed rounded-lg">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <p className="text-sm">Loading locations...</p>
                            </div>
                        ) : sortedLocations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                                <p className="text-sm">No partner locations found matching your search.</p>
                            </div>
                        ) : sortedLocations.slice(0, 20).map((loc, i) => (
                            <Card
                                key={loc._id}
                                onClick={() => flyToLocation(loc)}
                                className={`p-4 transition-all cursor-pointer ${userCoords && i === 0 ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 relative overflow-hidden' : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
                            >
                                {userCoords && i === 0 && (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] items-center px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-bl-lg">Closest</div>
                                )}
                                <div className="flex justify-between items-start mb-2 pr-12">
                                    <h4 className={`font-semibold ${userCoords && i === 0 ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>{loc.name}</h4>
                                    {loc.distance && (
                                        <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-600 dark:text-zinc-300 shrink-0">{loc.distance}</span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-start gap-1.5 mb-2 mt-2 leading-tight">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {loc.address}, {loc.city}, {loc.state} {loc.zipCode}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1">
                                    {loc.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{loc.time} drive</span>}
                                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {loc.phone || "(Not Provided)"}</span>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button
                                        variant={userCoords && i === 0 ? "default" : "outline"}
                                        size="sm"
                                        className={`w-full h-8 text-xs ${userCoords && i === 0 ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(`https://maps.google.com/?q=${encodeURIComponent(`${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}`)}`, '_blank')
                                        }}
                                    >
                                        <Navigation2 className="w-3 h-3 mr-1.5" /> Open in Maps
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {sortedLocations.length > 20 && (
                            <p className="text-xs text-center text-muted-foreground pt-2 font-medium">+ {sortedLocations.length - 20} more locations omitted. Use search to filter.</p>
                        )}
                    </div>
                </div>

                {/* Right Col: Interactive Map */}
                <div className="flex-1 min-h-125 flex flex-col">
                    <Card className="flex-1 w-full h-full bg-zinc-100 dark:bg-zinc-900 border-border/50 shadow-inner overflow-hidden relative">
                        {!mapboxgl.supported() ? (
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                                <p className="text-sm text-muted-foreground bg-black/80 px-4 py-2 rounded-full">Mapbox requires a WebGL-compatible browser.</p>
                            </div>
                        ) : mapboxToken ? (
                            <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/20 dark:border-zinc-800 max-w-sm">
                                    <Navigation className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold mb-2">Mapbox Token Missing</h3>
                                    <p className="text-sm text-muted-foreground mb-6">Please configure your NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables to view the interactive map.</p>
                                </div>
                            </div>
                        )}

                        {mapNotice && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white backdrop-blur px-4 py-2 rounded-full text-sm font-medium shadow-2xl flex items-center gap-2 z-50">
                                <Crosshair className="w-4 h-4 animate-spin-slow" /> {mapNotice}
                            </div>
                        )}
                    </Card>
                </div>

            </div>
            {/* Hardened Local CSS Override for Webkit Scrollbar Defaults */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px !important;
                    height: 6px !important;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent !important;
                    border-radius: 9999px !important;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #3f3f46 !important; /* Premium Dark Zinc */
                    border-radius: 9999px !important;
                    border: 2px solid transparent !important;
                    background-clip: padding-box !important;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #52525b !important;
                }
                html.dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #27272a !important; /* Slightly darker in true dark mode */
                }
                html.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #3f3f46 !important;
                }
            `}</style>
        </div>
    )
}
