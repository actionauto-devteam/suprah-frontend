export interface Quote {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleId?: {
    _id: string;
    year: number;
    make: string;
    modelName: string;
    vin: string;
    stockNumber: string;
  };
  vehicleName?: string;
  vehicleImage?: string;
  vin?: string;
  stockNumber?: string;
  vehicleLocation?: string;
  fromZip: string;
  toZip: string;
  fromAddress: string;
  toAddress: string;
  fromLocation?: QuoteStructuredLocation | null;
  toLocation?: QuoteStructuredLocation | null;
  units: number;
  enclosedTrailer: boolean;
  vehicleInoperable: boolean;
  miles: number;
  rate: number;
  eta: { min: number; max: number };
  status: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string | null;
  };
  organization?: {
    name: string;
    logoUrl?: string;
  };
}

export interface QuoteStructuredLocation {
  name?: string;
  streetAddress?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface QuoteLoadLocationInput {
  name?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface QuoteLoadRouteDetails {
  pickupLocation: QuoteLoadLocationInput;
  deliveryLocation: QuoteLoadLocationInput;
}

export interface QuoteLoadRouteDraft {
  routeDetails: QuoteLoadRouteDetails;
  missingFields: string[];
  needsCompletion: boolean;
}

const QUOTE_LOAD_ZIP_RE = /^\d{5}(-\d{4})?$/;
const QUOTE_US_STATE_CODES = new Set<string>(["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"]);

/**
 * Best-effort parser used only to prefill Quote -> Load conversion.
 *
 * Important: this parser does NOT block conversion just because the original
 * quote address is loosely formatted. Missing structured fields are returned
 * as empty strings so the completion dialog can ask only for what is missing.
 */
function inferQuoteLoadLocation(
  address: string,
  zip: string,
): QuoteLoadLocationInput {
  const normalizedAddress = String(address || "").trim();
  const normalizedZip = String(zip || "").trim();

  const result: QuoteLoadLocationInput = {
    name: "",
    address: normalizedAddress,
    city: "",
    state: "",
    zip: normalizedZip,
    country: "US",
  };

  if (!normalizedAddress) return result;

  const withoutTrailingZip = normalizedAddress
    .replace(/\s+\d{5}(?:-\d{4})?\s*$/, "")
    .trim();

  const stateMatch = withoutTrailingZip.match(
    /(,\s*|\s)([A-Za-z]{2})\s*$/,
  );

  // Loose quote text such as "123 MABIN ST" is allowed. Do not confuse a
  // street suffix with a state code. Only real U.S. state codes qualify.
  if (!stateMatch || stateMatch.index == null) return result;

  const stateCandidate = stateMatch[2].toUpperCase();
  if (!QUOTE_US_STATE_CODES.has(stateCandidate)) return result;

  const beforeState = withoutTrailingZip
    .slice(0, stateMatch.index)
    .replace(/,\s*$/, "")
    .trim();

  // Without a comma, a digit-bearing value is probably still a street
  // address (for example "123 Main CT"), not "City ST". Ask the dispatcher
  // instead of guessing.
  const delimiter = stateMatch[1];
  if (!delimiter.includes(",") && /\d/.test(beforeState)) return result;

  result.state = stateCandidate;

  if (!beforeState) return result;

  const commaParts = beforeState
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let city = commaParts[commaParts.length - 1] || "";

  // Handles "Action Auto - Orem, UT" without treating the business name as
  // the city.
  if (commaParts.length === 1 && city.includes(" - ")) {
    const dashParts = city
      .split(/\s+-\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (dashParts.length >= 2) {
      city = dashParts[dashParts.length - 1];
      result.name = dashParts.slice(0, -1).join(" - ");
    }
  }

  result.city = city;
  return result;
}

/**
 * Builds the structured route we can derive from the quote.
 *
 * A quote may contain only a street/location label + ZIP. That is valid at the
 * quote stage. If City/State (or another required Load field) cannot be
 * inferred, needsCompletion=true and the UI asks for only those missing
 * details before creating the Load.
 */
export function getQuoteLoadRouteDraft(
  quote: Pick<
    Quote,
    | "fromAddress"
    | "fromZip"
    | "toAddress"
    | "toZip"
    | "fromLocation"
    | "toLocation"
  >,
): QuoteLoadRouteDraft {
  const legacyPickup = inferQuoteLoadLocation(
    quote.fromAddress,
    quote.fromZip,
  );
  const legacyDelivery = inferQuoteLoadLocation(
    quote.toAddress,
    quote.toZip,
  );

  const pickupLocation: QuoteLoadLocationInput = quote.fromLocation
    ? {
        name: quote.fromLocation.name || "",
        address: quote.fromLocation.streetAddress || "",
        city: quote.fromLocation.city || "",
        state: quote.fromLocation.state || "",
        zip: quote.fromLocation.zip || quote.fromZip,
        country: quote.fromLocation.country || "US",
      }
    : legacyPickup;

  const deliveryLocation: QuoteLoadLocationInput = quote.toLocation
    ? {
        name: quote.toLocation.name || "",
        address: quote.toLocation.streetAddress || "",
        city: quote.toLocation.city || "",
        state: quote.toLocation.state || "",
        zip: quote.toLocation.zip || quote.toZip,
        country: quote.toLocation.country || "US",
      }
    : legacyDelivery;

  const missingFields: string[] = [];

  const checkLocation = (
    prefix: "pickupLocation" | "deliveryLocation",
    location: QuoteLoadLocationInput,
  ) => {
    // Final Load still requires an exact address. A Quote may omit Street;
    // the conversion completion dialog asks for it only when needed.
    if (!location.address.trim()) missingFields.push(`${prefix}.address`);
    if (!location.city.trim()) missingFields.push(`${prefix}.city`);
    if (!location.state.trim()) missingFields.push(`${prefix}.state`);
    if (!QUOTE_LOAD_ZIP_RE.test(location.zip.trim())) {
      missingFields.push(`${prefix}.zip`);
    }
  };

  checkLocation("pickupLocation", pickupLocation);
  checkLocation("deliveryLocation", deliveryLocation);

  return {
    routeDetails: {
      pickupLocation,
      deliveryLocation,
    },
    missingFields,
    needsCompletion: missingFields.length > 0,
  };
}