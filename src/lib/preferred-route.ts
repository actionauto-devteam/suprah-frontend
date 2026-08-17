export type PreferredRouteDirection = "one_way" | "two_way";
export type PreferredRouteMatchLevel = "city" | "mixed" | "state";

export interface PreferredRouteEndpoint {
  city: string | null;
  state: string | null;
}

export interface ParsedPreferredRoute {
  raw: string;
  origin: PreferredRouteEndpoint;
  destination: PreferredRouteEndpoint;
  bidirectional: boolean;
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

const VALID_STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));
const STATE_NAMES_LONGEST_FIRST = Object.keys(STATE_NAME_TO_CODE).sort(
  (a, b) => b.length - a.length,
);

export function normalizePreferredRouteState(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (VALID_STATE_CODES.has(upper)) return upper;

  return STATE_NAME_TO_CODE[raw.toLowerCase()] ?? null;
}

export function normalizePreferredRouteCity(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^,+|,+$/g, "")
    .trim();
  return normalized || null;
}

function cityKey(value: unknown): string | null {
  const city = normalizePreferredRouteCity(value);
  if (!city) return null;
  return city
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEndpoint(rawEndpoint: string): PreferredRouteEndpoint {
  const endpoint = rawEndpoint.trim();
  if (!endpoint) return { city: null, state: null };

  const commaParts = endpoint
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaParts.length >= 2) {
    const state = normalizePreferredRouteState(commaParts[commaParts.length - 1]);
    if (state) {
      return {
        city: normalizePreferredRouteCity(commaParts.slice(0, -1).join(", ")),
        state,
      };
    }
  }

  const directState = normalizePreferredRouteState(endpoint);
  if (directState) return { city: null, state: directState };

  const abbreviationMatch = endpoint.match(/^(.*?)[\s,]+([A-Za-z]{2})$/);
  if (abbreviationMatch) {
    const state = normalizePreferredRouteState(abbreviationMatch[2]);
    if (state) {
      return {
        city: normalizePreferredRouteCity(abbreviationMatch[1]),
        state,
      };
    }
  }

  const lower = endpoint.toLowerCase();
  for (const stateName of STATE_NAMES_LONGEST_FIRST) {
    if (lower === stateName) {
      return { city: null, state: STATE_NAME_TO_CODE[stateName] };
    }
    if (lower.endsWith(` ${stateName}`) || lower.endsWith(`, ${stateName}`)) {
      const cityPart = endpoint.slice(0, endpoint.length - stateName.length);
      return {
        city: normalizePreferredRouteCity(cityPart.replace(/[\s,]+$/, "")),
        state: STATE_NAME_TO_CODE[stateName],
      };
    }
  }

  return { city: null, state: null };
}

export function parsePreferredRoute(route: string): ParsedPreferredRoute {
  const raw = String(route ?? "").trim();
  const bidirectional = /↔|<->|⇄/.test(raw);
  const parts = raw
    .split(/\s*(?:↔|<->|⇄|→|->|\bto\b|\s[-–—]\s)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      raw,
      origin: parseEndpoint(parts[0]),
      destination: parseEndpoint(parts[1]),
      bidirectional,
    };
  }

  // Legacy fallback: keep supporting routes that only contain two state codes.
  const stateTokens = raw.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? [];
  return {
    raw,
    origin: { city: null, state: normalizePreferredRouteState(stateTokens[0]) },
    destination: {
      city: null,
      state: normalizePreferredRouteState(stateTokens[1]),
    },
    bidirectional,
  };
}

function endpointMatches(
  routeEndpoint: PreferredRouteEndpoint,
  loadState: unknown,
  loadCity: unknown,
) {
  const normalizedLoadState = normalizePreferredRouteState(loadState);
  if (!routeEndpoint.state || routeEndpoint.state !== normalizedLoadState) {
    return false;
  }

  if (!routeEndpoint.city) return true;
  const wantedCity = cityKey(routeEndpoint.city);
  const actualCity = cityKey(loadCity);
  return Boolean(wantedCity && actualCity && wantedCity === actualCity);
}

export function matchPreferredRoute(
  route: string,
  load: {
    originState?: unknown;
    originCity?: unknown;
    destinationState?: unknown;
    destinationCity?: unknown;
  },
): {
  matches: boolean;
  matchLevel: PreferredRouteMatchLevel | null;
  parsed: ParsedPreferredRoute;
} {
  const parsed = parsePreferredRoute(route);
  const validRoute = Boolean(parsed.origin.state && parsed.destination.state);

  if (!validRoute) {
    return { matches: false, matchLevel: null, parsed };
  }

  const forward =
    endpointMatches(parsed.origin, load.originState, load.originCity) &&
    endpointMatches(
      parsed.destination,
      load.destinationState,
      load.destinationCity,
    );

  const reverse =
    parsed.bidirectional &&
    endpointMatches(parsed.origin, load.destinationState, load.destinationCity) &&
    endpointMatches(parsed.destination, load.originState, load.originCity);

  const cityCount = Number(Boolean(parsed.origin.city)) + Number(Boolean(parsed.destination.city));
  const matchLevel: PreferredRouteMatchLevel =
    cityCount === 2 ? "city" : cityCount === 1 ? "mixed" : "state";

  return {
    matches: forward || reverse,
    matchLevel: forward || reverse ? matchLevel : null,
    parsed,
  };
}

export function formatPreferredRoute(input: {
  fromState: string;
  fromCity?: string | null;
  toState: string;
  toCity?: string | null;
  direction: PreferredRouteDirection;
}): string | null {
  const fromState = normalizePreferredRouteState(input.fromState);
  const toState = normalizePreferredRouteState(input.toState);
  if (!fromState || !toState) return null;

  const fromCity = normalizePreferredRouteCity(input.fromCity);
  const toCity = normalizePreferredRouteCity(input.toCity);
  const fromLabel = fromCity ? `${fromCity}, ${fromState}` : fromState;
  const toLabel = toCity ? `${toCity}, ${toState}` : toState;
  const arrow = input.direction === "two_way" ? "↔" : "→";

  return `${fromLabel} ${arrow} ${toLabel}`;
}

export function preferredRouteIdentity(route: string): string | null {
  const parsed = parsePreferredRoute(route);
  if (!parsed.origin.state || !parsed.destination.state) return null;

  const endpointKey = (endpoint: PreferredRouteEndpoint) =>
    `${cityKey(endpoint.city) ?? "*"}|${endpoint.state}`;

  const originKey = endpointKey(parsed.origin);
  const destinationKey = endpointKey(parsed.destination);

  if (parsed.bidirectional) {
    return [originKey, destinationKey].sort().join("<->");
  }

  return `${originKey}->${destinationKey}`;
}