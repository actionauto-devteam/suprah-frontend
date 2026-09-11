export type LocatorMapTheme = "light" | "dark";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
const mapboxStyles: Record<LocatorMapTheme, string> = {
  light: "mapbox/light-v11",
  dark: "mapbox/dark-v11",
};

export const hasLocatorMapTiles = Boolean(mapboxToken?.startsWith("pk."));

export function getLocatorTileUrl(theme: LocatorMapTheme) {
  if (!hasLocatorMapTiles) return null;
  return `https://api.mapbox.com/styles/v1/${mapboxStyles[theme]}/tiles/256/{z}/{x}/{y}{r}?access_token=${mapboxToken}`;
}

export const LOCATOR_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
