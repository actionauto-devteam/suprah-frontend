export interface LicenseNameAddress {
  firstName: string;
  middleName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

export type LicenseField = keyof LicenseNameAddress;

export type LicenseParseResult =
  | { status: "complete" | "partial"; fields: LicenseNameAddress; missing: LicenseField[] }
  | { status: "unsupported" };

const REQUIRED_FIELDS: LicenseField[] = ["firstName", "lastName", "street", "city", "state", "postalCode"];
const ALLOWED_CODES = new Set(["DCS", "DAC", "DAD", "DCT", "DAA", "DAB", "DAG", "DAH", "DAI", "DAJ", "DAK"]);
const PLACEHOLDER = /^(NONE|UNAVL|UNAVAILABLE|UNKNOWN|N\/?A|NULL|X+|-+|\.+)$/i;
const DIRECTIONALS = new Set(["N", "S", "E", "W", "NE", "NW", "SE", "SW"]);
const UPPER_WORDS = new Set(["PO", "II", "III", "IV", "RR", "HC"]);
const MAX_PAYLOAD = 6000;
const CONTROL_MARKERS = /<(LF|CR|RS|GS)>/g;

export const emptyLicenseFields = (): LicenseNameAddress => ({
  firstName: "",
  middleName: "",
  lastName: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
});

const clean = (value: string | undefined, max: number) => {
  const text = String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || PLACEHOLDER.test(text)) return "";
  return text.slice(0, max).trim();
};

const titleWord = (word: string) => {
  const upper = word.toUpperCase();
  if (UPPER_WORDS.has(upper)) return upper;
  return word
    .toLowerCase()
    .replace(/(^|[-'’.])([a-z])/g, (_match, boundary: string, letter: string) => boundary + letter.toUpperCase());
};

const titleCase = (value: string) => value.split(" ").map(titleWord).join(" ");

const formatStreet = (value: string) =>
  value
    .split(" ")
    .map((word) => (DIRECTIONALS.has(word.toUpperCase()) ? word.toUpperCase() : titleWord(word)))
    .join(" ");

const formatState = (value: string) => {
  const state = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}$/.test(state) ? state : "";
};

const formatPostalCode = (value: string) => {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  const us = compact.replace(/-/g, "");
  if (/^\d{5}$/.test(us)) return us;
  if (/^\d{9}$/.test(us)) return us.endsWith("0000") ? us.slice(0, 5) : `${us.slice(0, 5)}-${us.slice(5)}`;
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  return "";
};

const splitNames = (value: string) => {
  if (!/[,$]/.test(value)) return null;
  return value
    .split(/[,$]/)
    .map((part) => clean(part, 60))
    .filter(Boolean);
};

const hasAamvaHeader = (payload: string) => /(ANSI ?|AAMVA)\d{6}/.test(payload.slice(0, 80));

const readElements = (payload: string) => {
  const elements = new Map<string, string>();
  for (const segment of payload.split(/[\n\r\u001e\u001d]+/)) {
    let code = "";
    let value = "";
    const direct = segment.match(/^(?:DL|ID)(D[A-Z]{2})([\s\S]*)$/) || segment.match(/^(D[A-Z]{2})([\s\S]*)$/);
    if (direct) {
      code = direct[1];
      value = direct[2];
    } else {
      const glued = [...segment.matchAll(/(?:DL|ID)(D[A-Z]{2})/g)].pop();
      if (glued && glued.index !== undefined) {
        code = glued[1];
        value = segment.slice(glued.index + glued[0].length);
      }
    }
    if (code && ALLOWED_CODES.has(code) && !elements.has(code)) elements.set(code, value);
  }
  return elements;
};

export function parseAamvaNameAddress(payload: unknown): LicenseParseResult {
  if (typeof payload !== "string" || payload.length < 20 || payload.length > MAX_PAYLOAD) return { status: "unsupported" };
  const text = payload.replace(CONTROL_MARKERS, "\n");
  if (!hasAamvaHeader(text)) return { status: "unsupported" };

  const elements = readElements(text);
  const value = (code: string, max = 60) => clean(elements.get(code), max);

  let firstName = value("DAC");
  let middleName = value("DAD");
  let lastName = value("DCS") || value("DAB");

  if (!firstName) {
    const given = value("DCT", 90);
    const parts = given ? splitNames(given) : null;
    if (parts && parts.length) {
      firstName = parts[0];
      if (!middleName) middleName = parts.slice(1).join(" ");
    } else if (given) {
      firstName = given;
    }
  }

  if (!firstName && !lastName) {
    const full = value("DAA", 120);
    const parts = full ? splitNames(full) : null;
    if (parts && parts.length >= 2) {
      lastName = parts[0];
      firstName = parts[1];
      middleName = middleName || parts.slice(2).join(" ");
    }
  }

  const streetParts = [value("DAG", 120), value("DAH", 60)].filter(Boolean);
  const fields: LicenseNameAddress = {
    firstName: titleCase(firstName),
    middleName: titleCase(middleName),
    lastName: titleCase(lastName),
    street: formatStreet(streetParts.join(", ")),
    city: titleCase(value("DAI")),
    state: formatState(value("DAJ", 10)),
    postalCode: formatPostalCode(value("DAK", 15)),
  };

  const found = REQUIRED_FIELDS.filter((field) => fields[field]);
  if (found.length === 0) return { status: "unsupported" };
  const missing = REQUIRED_FIELDS.filter((field) => !fields[field]);
  return { status: missing.length ? "partial" : "complete", fields, missing };
}

export function formatLicenseAddress(fields: Pick<LicenseNameAddress, "street" | "city" | "state" | "postalCode">) {
  const street = fields.street.trim();
  const city = fields.city.trim();
  const stateZip = [fields.state.trim(), fields.postalCode.trim()].filter(Boolean).join(" ");
  return [street, city, stateZip].filter(Boolean).join(", ");
}
