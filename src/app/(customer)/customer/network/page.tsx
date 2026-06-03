"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Navigation, Phone, Clock, Navigation2, Crosshair, RefreshCw } from "lucide-react"
import mapboxgl from "mapbox-gl"

import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { useTheme } from "@/context/ThemeContext"

// ---------------------------------------------------------------------------
// Static fallback: all 79 Utah Jiffy Lube locations from the store list XLS.
// Used if the API has not been seeded yet. Once seeded, the API response takes
// priority and these are ignored.
// ---------------------------------------------------------------------------
const STATIC_UTAH_LOCATIONS = [
  { _id: 's0',  name: 'American Fork',    address: '562 E. State Rd',             city: 'American Fork',    state: 'UT', zipCode: '84003', phone: '801-756-5333' },
  { _id: 's1',  name: 'Ballard',          address: '1516 East Highway 40',         city: 'Ballard',          state: 'UT', zipCode: '84066', phone: '435-725-5823' },
  { _id: 's2',  name: 'Bountiful',        address: '327 W. 500 S.',                city: 'Bountiful',        state: 'UT', zipCode: '84010', phone: '801-292-5061' },
  { _id: 's3',  name: 'Brigham City',     address: '692 S. Main St',               city: 'Brigham City',     state: 'UT', zipCode: '84302', phone: '435-723-3777' },
  { _id: 's4',  name: 'Cedar City',       address: '707 S. Main St',               city: 'Cedar City',       state: 'UT', zipCode: '84720', phone: '435-865-1111' },
  { _id: 's5',  name: 'Cedar City',       address: '1240 S. Sage Drive',           city: 'Cedar City',       state: 'UT', zipCode: '84720', phone: '435-867-9439' },
  { _id: 's6',  name: 'Centerville',      address: '300 West Parrish Lane',        city: 'Centerville',      state: 'UT', zipCode: '84014', phone: '801-298-3277' },
  { _id: 's7',  name: 'Clinton',          address: '1953 N. 2000 W.',              city: 'Clinton',          state: 'UT', zipCode: '84015', phone: '801-784-7952' },
  { _id: 's8',  name: 'Draper',           address: '1028 E. Draper Pkwy',          city: 'Draper',           state: 'UT', zipCode: '84020', phone: '801-576-1961' },
  { _id: 's9',  name: 'Draper',           address: '13955 South Bangerter Pkwy',   city: 'Draper',           state: 'UT', zipCode: '84020', phone: '801-553-7051' },
  { _id: 's10', name: 'Eagle Mountain',   address: '4019 E. Pony Express Pkwy',    city: 'Eagle Mountain',   state: 'UT', zipCode: '84005', phone: '801-789-4166' },
  { _id: 's11', name: 'Farr West',        address: '1783 W. 2700 N.',              city: 'Farr West',        state: 'UT', zipCode: '84404', phone: '801-737-3103' },
  { _id: 's12', name: 'Harrisville',      address: '609 N. Harrisville Rd',        city: 'Harrisville',      state: 'UT', zipCode: '84404', phone: '801-394-3000' },
  { _id: 's13', name: 'Heber',            address: '510 N. Main Street',           city: 'Heber',            state: 'UT', zipCode: '84032', phone: '435-654-2780' },
  { _id: 's14', name: 'Herriman',         address: '13154 S. 5600 W.',             city: 'Herriman',         state: 'UT', zipCode: '84096', phone: '801-254-8768' },
  { _id: 's15', name: 'Herriman',         address: '5146 W. Denali Park Dr.',      city: 'Herriman',         state: 'UT', zipCode: '84096', phone: '(801) 727-0200' },
  { _id: 's16', name: 'Highland',         address: '5248 W. 11000 N.',             city: 'Highland',         state: 'UT', zipCode: '84003', phone: '801-772-0808' },
  { _id: 's17', name: 'Holladay',         address: '2350 E. 4500 S.',              city: 'Holladay',         state: 'UT', zipCode: '84117', phone: '801-278-4760' },
  { _id: 's18', name: 'Holladay',         address: '1804 Murray Holladay Rd',      city: 'Holladay',         state: 'UT', zipCode: '84117', phone: '801-272-1962' },
  { _id: 's19', name: 'Hurricane',        address: '987 W State St',               city: 'Hurricane',        state: 'UT', zipCode: '84737', phone: '435-635-5002' },
  { _id: 's20', name: 'Kaysville',        address: '215 W. 200 N.',                city: 'Kaysville',        state: 'UT', zipCode: '84037', phone: '801-593-0117' },
  { _id: 's21', name: 'Layton',           address: '236 N. Fairfield Rd',          city: 'Layton',           state: 'UT', zipCode: '84041', phone: '801-544-5041' },
  { _id: 's22', name: 'Layton',           address: '1370 N. Main St',              city: 'Layton',           state: 'UT', zipCode: '84041', phone: '801-546-6760' },
  { _id: 's23', name: 'Lehi',             address: '116 S. 850 E.',                city: 'Lehi',             state: 'UT', zipCode: '84043', phone: '801-766-1914' },
  { _id: 's24', name: 'Lindon',           address: '625 N. State St',              city: 'Lindon',           state: 'UT', zipCode: '84042', phone: '801-785-8097' },
  { _id: 's25', name: 'Logan',            address: '1152 S. Main St',              city: 'Logan',            state: 'UT', zipCode: '84321', phone: '435-753-3999' },
  { _id: 's26', name: 'Logan',            address: '30 E. 1400 N.',                city: 'Logan',            state: 'UT', zipCode: '84341', phone: '435-753-8276' },
  { _id: 's27', name: 'Magna',            address: '7200 W. 3444 S.',              city: 'Magna',            state: 'UT', zipCode: '84044', phone: '801-508-7721' },
  { _id: 's28', name: 'Midvale',          address: '1331 Fort Union Blvd',         city: 'Midvale',          state: 'UT', zipCode: '84121', phone: '801-943-4752' },
  { _id: 's29', name: 'Midvale',          address: '7087 Bingham Junction Blvd.',  city: 'Midvale',          state: 'UT', zipCode: '84047', phone: '801-260-5057' },
  { _id: 's30', name: 'Murray',           address: '4949 S. State St',             city: 'Murray',           state: 'UT', zipCode: '84107', phone: '801-263-9066' },
  { _id: 's31', name: 'Murray',           address: '5601 S. 900 E.',               city: 'Murray',           state: 'UT', zipCode: '84121', phone: '801-261-4808' },
  { _id: 's32', name: 'Murray',           address: '6390 S. Highland Dr',          city: 'Murray',           state: 'UT', zipCode: '84121', phone: '801-278-7421' },
  { _id: 's33', name: 'North Ogden',      address: '2381 N. 400 E.',               city: 'North Ogden',      state: 'UT', zipCode: '84414', phone: '801-737-3112' },
  { _id: 's34', name: 'North Salt Lake',  address: '989 N. Hwy 89',                city: 'North Salt Lake',  state: 'UT', zipCode: '84054', phone: '801-296-1921' },
  { _id: 's35', name: 'Ogden',            address: '192 36th St',                  city: 'Ogden',            state: 'UT', zipCode: '84405', phone: '801-392-2665' },
  { _id: 's36', name: 'Ogden',            address: '442 12th Street',              city: 'Ogden',            state: 'UT', zipCode: '84404', phone: '801-689-2870' },
  { _id: 's37', name: 'Orem',             address: '809 N. State St',              city: 'Orem',             state: 'UT', zipCode: '84057', phone: '801-764-9500' },
  { _id: 's38', name: 'Orem',             address: '91 N. State St',               city: 'Orem',             state: 'UT', zipCode: '84057', phone: '801-226-1150' },
  { _id: 's39', name: 'Orem',             address: '991 S. State',                 city: 'Orem',             state: 'UT', zipCode: '84097', phone: '801-225-0703' },
  { _id: 's40', name: 'Payson',           address: '1094 W 800 S',                 city: 'Payson',           state: 'UT', zipCode: '84651', phone: '801-658-5539' },
  { _id: 's41', name: 'Provo',            address: '290 W. 1230 N.',               city: 'Provo',            state: 'UT', zipCode: '84604', phone: '801-377-7636' },
  { _id: 's42', name: 'Provo',            address: '1575 N. Freedom Blvd',         city: 'Provo',            state: 'UT', zipCode: '84604', phone: '801-377-2072' },
  { _id: 's43', name: 'Provo',            address: '836 S. University Ave',        city: 'Provo',            state: 'UT', zipCode: '84601', phone: '801-370-0303' },
  { _id: 's44', name: 'Provo',            address: '3711 North 40 East',           city: 'Provo',            state: 'UT', zipCode: '84604', phone: '801-224-2854' },
  { _id: 's45', name: 'Riverdale',        address: '913 W. Riverdale Rd.',         city: 'Riverdale',        state: 'UT', zipCode: '84405', phone: '801-690-7682' },
  { _id: 's46', name: 'Riverton',         address: '1625 W. 12600 S.',             city: 'Riverton',         state: 'UT', zipCode: '84065', phone: '801-446-1315' },
  { _id: 's47', name: 'Riverton',         address: '13318 S. Market Center Dr',    city: 'Riverton',         state: 'UT', zipCode: '84065', phone: '801-676-7528' },
  { _id: 's48', name: 'Roy',              address: '4080 Midland Drive',           city: 'Roy',              state: 'UT', zipCode: '84067', phone: '801-731-8778' },
  { _id: 's49', name: 'Salt Lake City',   address: '3300 S. Main St.',             city: 'Salt Lake City',   state: 'UT', zipCode: '84115', phone: '801-487-9561' },
  { _id: 's50', name: 'Salt Lake City',   address: '804 E. 400 S.',                city: 'Salt Lake City',   state: 'UT', zipCode: '84102', phone: '801-363-6604' },
  { _id: 's51', name: 'Salt Lake City',   address: '757 W. North Temple',          city: 'Salt Lake City',   state: 'UT', zipCode: '84116', phone: '801-355-1385' },
  { _id: 's52', name: 'Salt Lake City',   address: '2102 S. Main St',              city: 'Salt Lake City',   state: 'UT', zipCode: '84115', phone: '801-467-1861' },
  { _id: 's53', name: 'Salt Lake City',   address: '677 E 400 S',                  city: 'Salt Lake City',   state: 'UT', zipCode: '84102', phone: '801-355-7803' },
  { _id: 's54', name: 'Salt Lake City',   address: '1577 Foothill Dr',             city: 'Salt Lake City',   state: 'UT', zipCode: '84108', phone: '801-583-0290' },
  { _id: 's55', name: 'Salt Lake City',   address: '2000 E. 3302 S.',              city: 'Salt Lake City',   state: 'UT', zipCode: '84109', phone: '801-486-0412' },
  { _id: 's56', name: 'Sandy',            address: '9045 S. 255 W.',               city: 'Sandy',            state: 'UT', zipCode: '84070', phone: '801-562-2035' },
  { _id: 's57', name: 'Sandy',            address: '10620 S. 700 E.',              city: 'Sandy',            state: 'UT', zipCode: '84070', phone: '801-576-9445' },
  { _id: 's58', name: 'Sandy',            address: '9400 South 2047 East',         city: 'Sandy',            state: 'UT', zipCode: '84093', phone: '801-845-4722' },
  { _id: 's59', name: 'Saratoga Springs', address: '284 E Crossroads Blvd',        city: 'Saratoga Springs', state: 'UT', zipCode: '84043', phone: '801-766-3300' },
  { _id: 's60', name: 'South Jordan',     address: '3332 W. South Jordan Pkwy',    city: 'South Jordan',     state: 'UT', zipCode: '84095', phone: '(801) 662-0679' },
  { _id: 's61', name: 'South Jordan',     address: '11333 S. Redwood Rd.',         city: 'South Jordan',     state: 'UT', zipCode: '84095', phone: '(801) 727-7370' },
  { _id: 's62', name: 'South Ogden',      address: '5746 Harrison Blvd',           city: 'South Ogden',      state: 'UT', zipCode: '84403', phone: '801-475-4355' },
  { _id: 's63', name: 'Spanish Fork',     address: '901 Expressway Lane',          city: 'Spanish Fork',     state: 'UT', zipCode: '84660', phone: '801-798-3993' },
  { _id: 's64', name: 'Springville',      address: '1703 W. 400 S.',               city: 'Springville',      state: 'UT', zipCode: '84663', phone: '801-491-6868' },
  { _id: 's65', name: 'St. George',       address: '1287 W. Sunset Blvd',          city: 'St. George',       state: 'UT', zipCode: '84770', phone: '435-688-2158' },
  { _id: 's66', name: 'St. George',       address: '1393 S River Road',            city: 'St. George',       state: 'UT', zipCode: '84790', phone: '(435) 703-9576' },
  { _id: 's67', name: 'Sugarhouse',       address: '2097 S. 1200 E.',              city: 'Sugarhouse',       state: 'UT', zipCode: '84105', phone: '801-466-9789' },
  { _id: 's68', name: 'Syracuse',         address: '1129 W. 1700 S.',              city: 'Syracuse',         state: 'UT', zipCode: '84075', phone: '801-825-9300' },
  { _id: 's69', name: 'Taylorsville',     address: '2196 W. 5400 S.',              city: 'Taylorsville',     state: 'UT', zipCode: '84129', phone: '801-964-6800' },
  { _id: 's70', name: 'Tooele',           address: '21 W. 1280 N.',                city: 'Tooele',           state: 'UT', zipCode: '84074', phone: '435-882-2218' },
  { _id: 's71', name: 'Vineyard',         address: '199 N Geneva Rd',              city: 'Vineyard',         state: 'UT', zipCode: '84059', phone: '385-537-0500' },
  { _id: 's72', name: 'Washington',       address: '1064 W. Red Cliffs Dr',        city: 'Washington',       state: 'UT', zipCode: '84780', phone: '435-656-1200' },
  { _id: 's73', name: 'West Jordan',      address: '6131 S. 4800 W.',              city: 'West Jordan',      state: 'UT', zipCode: '84118', phone: '801-957-1057' },
  { _id: 's74', name: 'West Jordan',      address: '1735 W. 9000 S.',              city: 'West Jordan',      state: 'UT', zipCode: '84088', phone: '801-566-4075' },
  { _id: 's75', name: 'West Jordan',      address: '7867 S. Airport Rd',           city: 'West Jordan',      state: 'UT', zipCode: '84088', phone: '801-280-5505' },
  { _id: 's76', name: 'West Jordan',      address: '7805 Redwood Rd',              city: 'West Jordan',      state: 'UT', zipCode: '84088', phone: '801-562-0442' },
  { _id: 's77', name: 'West Valley',      address: '3796 W. 3500 S.',              city: 'West Valley',      state: 'UT', zipCode: '84120', phone: '801-969-6457' },
  { _id: 's78', name: 'West Valley',      address: '1850 W. 4100 S.',              city: 'West Valley',      state: 'UT', zipCode: '84119', phone: '801-972-3455' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a single address using the US Census Geocoder (client-side, free, no key)
async function geocodeAddress(address: string, city: string, state: string, zip: string): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${q}&benchmark=Public_AR_Current&format=json`
    );
    const json = await res.json();
    const match = json?.result?.addressMatches?.[0];
    if (match) return [parseFloat(match.coordinates.x), parseFloat(match.coordinates.y)];
  } catch {/* silent */}
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ServiceNetworkPage() {
  const { getToken } = useAuth()
  const { theme } = useTheme()
  const [locations, setLocations] = React.useState<any[]>([])
  const [sortedLocations, setSortedLocations] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isGeocoding, setIsGeocoding] = React.useState(false)
  const [geocodedCount, setGeocodedCount] = React.useState(0)
  const [mapNotice, setMapNotice] = React.useState<string | null>(null)
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null)

  const mapRef = React.useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = React.useRef<mapboxgl.Map | null>(null)
  const mapThemeRef = React.useRef<"light" | "dark" | null>(null)
  const markersRef = React.useRef<mapboxgl.Marker[]>([])
  const userMarkerRef = React.useRef<mapboxgl.Marker | null>(null)

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // -------------------------------------------------------------------------
  // 1. Fetch from API; fall back to static list if empty / error
  // -------------------------------------------------------------------------
  const fetchLocations = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const res = await apiClient.get('/api/service/locations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const apiData: any[] = res.data?.data || []

      if (apiData.length > 0) {
        setLocations(apiData)
      } else {
        // DB not seeded yet — use static data and geocode on-the-fly
        setLocations(STATIC_UTAH_LOCATIONS)
      }
    } catch {
      setLocations(STATIC_UTAH_LOCATIONS)
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => { fetchLocations() }, [fetchLocations])

  // -------------------------------------------------------------------------
  // 2. Geocode static entries that have no coordinates yet (background)
  // -------------------------------------------------------------------------
  React.useEffect(() => {
    const needsGeocode = locations.filter(
      loc => loc._id?.toString().startsWith('s') && !loc.location?.coordinates
    )
    if (needsGeocode.length === 0) return

    let cancelled = false
    setIsGeocoding(true)

    ;(async () => {
      for (const loc of needsGeocode) {
        if (cancelled) break
        const coords = await geocodeAddress(loc.address, loc.city, loc.state, loc.zipCode)
        if (coords && !cancelled) {
          setLocations(prev =>
            prev.map(l =>
              l._id === loc._id
                ? { ...l, location: { type: 'Point', coordinates: coords } }
                : l
            )
          )
          setGeocodedCount(n => n + 1)
        }
        await new Promise(r => setTimeout(r, 150)) // gentle throttle
      }
      if (!cancelled) setIsGeocoding(false)
    })()

    return () => { cancelled = true }
  }, [locations.length]) // only re-run if list itself changes

  // -------------------------------------------------------------------------
  // 3. Map init
  // -------------------------------------------------------------------------
  React.useEffect(() => {
    const token = mapboxToken?.trim()
    if (!token || !mapRef.current || mapInstanceRef.current) return
    if (!token.startsWith('pk.')) { setMapNotice("Invalid Mapbox token."); return }

    mapboxgl.accessToken = token
    mapThemeRef.current = theme
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12",
      center: [-111.891, 40.761],
      zoom: 8,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => map.resize())
    map.on('error', () => setMapNotice("Map failed to load. Check Mapbox token."))

    const ro = new ResizeObserver(() => mapInstanceRef.current?.resize())
    ro.observe(mapRef.current)
    mapInstanceRef.current = map

    return () => { ro.disconnect(); map.remove(); mapInstanceRef.current = null }
  }, [mapboxToken])

  React.useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || mapThemeRef.current === theme) return
    mapThemeRef.current = theme
    map.setStyle(theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12")
  }, [theme])

  // -------------------------------------------------------------------------
  // 4. Filter + sort
  // -------------------------------------------------------------------------
  React.useEffect(() => {
    const q = searchQuery.toLowerCase()
    const filtered = locations.filter(loc =>
      loc.name.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.zipCode?.includes(q) ||
      loc.address.toLowerCase().includes(q)
    )

    const parsed = filtered.map(loc => {
      let distNum = Infinity
      if (userCoords && loc.location?.coordinates) {
        distNum = getDistanceFromLatLonInMiles(
          userCoords.lat, userCoords.lng,
          loc.location.coordinates[1], loc.location.coordinates[0]
        )
      }
      return {
        ...loc,
        distanceNum: distNum,
        distance: distNum === Infinity ? "" : `${distNum.toFixed(1)} mi`,
        time: distNum === Infinity ? "" : `${Math.round((distNum / 35) * 60)} min`,
      }
    })

    parsed.sort((a, b) =>
      userCoords ? a.distanceNum - b.distanceNum : a.city.localeCompare(b.city)
    )

    setSortedLocations(parsed)
  }, [locations, searchQuery, userCoords])

  // -------------------------------------------------------------------------
  // 5. Map markers
  // -------------------------------------------------------------------------
  React.useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    sortedLocations.forEach((loc, index) => {
      if (!loc.location?.coordinates) return
      const [lng, lat] = loc.location.coordinates
      const isClosest = userCoords && index === 0
      const pinColor = isClosest ? "#16a34a" : "#3b82f6"

      const popup = new mapboxgl.Popup({ offset: 36, closeButton: false }).setHTML(
        `<div style="color:#18181b;padding:4px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${loc.name}${loc.city && loc.city !== loc.name ? ' – ' + loc.city : ''}</div>
          <div style="font-size:12px;color:#52525b;">${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}</div>
          <div style="font-size:12px;color:#52525b;margin-top:2px;">${loc.phone}</div>
          ${loc.distance ? `<div style="font-size:12px;font-weight:600;color:#16a34a;margin-top:4px;">${loc.distance} away</div>` : ''}
        </div>`
      )

      // Custom element: persistent label above + pin below
      const el = document.createElement('div')
      el.className = 'sn-marker-wrap'

      const labelText = loc.city && loc.city !== loc.name
        ? `${loc.name} – ${loc.city}`
        : loc.name

      el.innerHTML = `
        <div class="sn-marker-label${isClosest ? ' sn-marker-label--closest' : ''}">${labelText}</div>
        <div class="sn-marker-pin" style="background:${pinColor};"></div>
        <div class="sn-marker-stem" style="background:${pinColor};"></div>
      `

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [sortedLocations, userCoords])

  // -------------------------------------------------------------------------
  // 6. Handlers
  // -------------------------------------------------------------------------
  const handleLocateMe = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported."); return }
    setMapNotice("Locating…")
    navigator.geolocation.getCurrentPosition(pos => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserCoords(coords)
      setMapNotice(null)

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 12, duration: 2000 })

        if (userMarkerRef.current) userMarkerRef.current.remove()
        const el = document.createElement('div')
        el.className = 'w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white shadow-[0_0_10px_rgba(59,130,246,0.8)]'
        userMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([coords.lng, coords.lat])
          .addTo(mapInstanceRef.current)
      }
    }, () => setMapNotice("Failed to get location."))
  }

  const flyToLocation = (loc: any) => {
    if (!mapInstanceRef.current || !loc.location?.coordinates) return
    const [lng, lat] = loc.location.coordinates
    setSelectedLocationId(loc._id)
    mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })
  }

  // -------------------------------------------------------------------------
  // 7. Render
  // -------------------------------------------------------------------------
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Service Network</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Find an Action Auto partner location near you. Simply show your membership card to redeem exclusive service discounts.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter Zip, City, or Address…"
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

      {/* Geocoding progress banner */}
      {isGeocoding && (
        <div className="mb-3 shrink-0 flex items-center gap-2 text-xs text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          Geocoding locations in the background… ({geocodedCount}/{STATIC_UTAH_LOCATIONS.length} done) — map pins will appear as they resolve.
        </div>
      )}

      {/* Map & List Layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* Left: Location list */}
        <div className="w-full lg:w-100 flex flex-col gap-4 overflow-y-auto pr-2 pb-8 custom-scrollbar">
          <div className="flex justify-between items-end mt-2 mb-1 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {userCoords ? 'Nearest Locations' : 'All Locations'} · Jiffy Lube
            </h3>
            <span className="text-xs font-medium text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
              {sortedLocations.length} results
            </span>
          </div>

          <div className="flex flex-col gap-3 pb-4 shrink-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2 border border-dashed rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <p className="text-sm">Loading locations…</p>
              </div>
            ) : sortedLocations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No partner locations found matching your search.</p>
              </div>
            ) : sortedLocations.slice(0, 30).map((loc, i) => (
              <Card
                key={loc._id}
                onClick={() => flyToLocation(loc)}
                className={`p-4 transition-all cursor-pointer ${
                  userCoords && i === 0
                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 relative overflow-hidden'
                    : selectedLocationId === loc._id
                    ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/30'
                    : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {userCoords && i === 0 && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-bl-lg">
                    Closest
                  </div>
                )}

                <div className="flex justify-between items-start mb-1 pr-12">
                  <h4 className={`font-semibold text-sm ${userCoords && i === 0 ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                    {loc.name}
                  </h4>
                  {loc.distance && (
                    <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-600 dark:text-zinc-300 shrink-0">
                      {loc.distance}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground flex items-start gap-1.5 mb-1 leading-tight">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {loc.address}, {loc.city}, {loc.state} {loc.zipCode}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {loc.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ~{loc.time} drive
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {loc.phone || 'Not provided'}
                  </span>
                </div>

                <div className="mt-3">
                  <Button
                    variant={userCoords && i === 0 ? 'default' : 'outline'}
                    size="sm"
                    className={`w-full h-8 text-xs ${userCoords && i === 0 ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                    onClick={e => {
                      e.stopPropagation()
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(`${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}`)}`,
                        '_blank'
                      )
                    }}
                  >
                    <Navigation2 className="w-3 h-3 mr-1.5" /> Open in Maps
                  </Button>
                </div>
              </Card>
            ))}

            {sortedLocations.length > 30 && (
              <p className="text-xs text-center text-muted-foreground pt-2 font-medium">
                +{sortedLocations.length - 30} more — use search to filter.
              </p>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 min-h-125 flex flex-col">
          <Card className="flex-1 w-full h-full bg-zinc-100 dark:bg-zinc-900 border-border/50 shadow-inner overflow-hidden relative">
            {!mapboxgl.supported() ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
                <p className="text-sm text-muted-foreground bg-black/80 px-4 py-2 rounded-full">
                  Mapbox requires a WebGL-compatible browser.
                </p>
              </div>
            ) : mapboxToken ? (
              <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/20 dark:border-zinc-800 max-w-sm">
                  <Navigation className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Mapbox Token Missing</h3>
                  <p className="text-sm text-muted-foreground">
                    Set <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the interactive map.
                  </p>
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent !important; border-radius: 9999px !important; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #3f3f46 !important; border-radius: 9999px !important; border: 2px solid transparent !important; background-clip: padding-box !important; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #52525b !important; }
        html.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #27272a !important; }
        html.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #3f3f46 !important; }

        /* ── Service Network custom map markers ── */
        .sn-marker-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }
        .sn-marker-label {
          background: rgba(15, 15, 20, 0.82);
          color: #f4f4f5;
          font-size: 10px;
          font-weight: 600;
          line-height: 1.3;
          padding: 3px 7px;
          border-radius: 5px;
          white-space: nowrap;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.55);
          letter-spacing: 0.01em;
          pointer-events: none;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.12);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }
        .sn-marker-label--closest {
          background: rgba(22, 163, 74, 0.92);
          color: #fff;
          border-color: rgba(255,255,255,0.3);
        }
        .sn-marker-pin {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45);
          flex-shrink: 0;
        }
        .sn-marker-stem {
          width: 2px;
          height: 6px;
          border-radius: 1px;
          opacity: 0.7;
          flex-shrink: 0;
        }
        .sn-marker-wrap:hover .sn-marker-label {
          background: rgba(15, 15, 20, 0.95);
          box-shadow: 0 2px 10px rgba(0,0,0,0.65);
        }
        .sn-marker-wrap .mapboxgl-popup { pointer-events: auto; }
      `}</style>
    </div>
  )
}
