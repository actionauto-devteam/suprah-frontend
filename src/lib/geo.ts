const EARTH_RADIUS_MI = 3958.8;

export function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineMi(a, b) * 1609.344;
}

/** "0.3 mi" / "1.2 mi" style distance label, rounded to one decimal for readability. */
export function formatDistanceMi(mi: number): string {
  if (mi < 0.1) return "< 0.1 mi";
  return `${mi.toFixed(1)} mi`;
}
