/*
 * A car's "Installed Options & Equipment" as a list (2026-11-09).
 *
 * Inventory feeds send a car's features as one text field. Most separate them
 * with commas, semicolons or new lines, but some send them run together with
 * no separator at all ("A/C FrontAlloy WheelsAnti-Lock Brakes...") or with an
 * invisible character between them. The Vehicle Inspector used to show those
 * as one long line. This splits every feed the same way, so each feature is
 * its own entry.
 */

/** Visible and invisible separators feeds use between features. */
const SEPARATORS =
  /[\n\r\t,;|\u2022\u00B7\u0000-\u0008\u000B\u000C\u000E-\u001F\u0085\u200B\u2028\u2029\u2060\u2063\uFEFF]+/;

/**
 * Feature and brand names that are written with a capital in the middle, so
 * they're never cut in two when run-together text is split at word starts.
 */
const KEEP_WHOLE = [
  "CarPlay", "OnStar", "HomeLink", "SiriusXM", "MyKey", "MyLink", "MyFord", "iPod", "iPhone", "iDrive",
  "eAssist", "UConnect", "BlueLink", "SmartKey", "IntelliBeam", "IntelliLink", "StabiliTrak", "EyeSight",
  "CoPilot", "HondaLink", "FordPass", "AutoStick", "AdvanceTrac", "WiFi", "XMRadio",
];

/** A piece this long with several word starts glued together is a run-together list. */
const RUN_TOGETHER_MIN_LENGTH = 40;

const GLUED_WORD_START = /[a-z][A-Z]/g;

function looksRunTogether(piece: string): boolean {
  if (piece.length < RUN_TOGETHER_MIN_LENGTH) return false;
  // A kept name counts as one ordinary word ("Kk"), so the word starts around it still count.
  let protectedText = piece;
  for (const word of KEEP_WHOLE) protectedText = protectedText.split(word).join("Kk");
  return (protectedText.match(GLUED_WORD_START) ?? []).length >= 2;
}

/**
 * Splits run-together features where a new one starts: a lower-case letter
 * followed by a capital ("FrontAlloy"), a word followed by a number
 * ("Player3rd"), an abbreviation followed by a word ("A/CSteering") or after
 * "A/C" or "/AC" ("Heat/ACDVD"). Names in KEEP_WHOLE stay whole.
 */
function splitRunTogether(piece: string): string[] {
  const kept: string[] = [];
  // Private-use characters stand in for kept names while splitting.
  let text = piece;
  KEEP_WHOLE.forEach((word, index) => {
    if (text.includes(word)) {
      kept[index] = word;
      text = text.split(word).join(`\uE000${index}\uE001`);
    }
  });
  text = text
    .replace(/(\/AC|A\/C)(?=[A-Z])/g, "$1\n")
    .replace(/([a-z])(?=[A-Z\uE000])/g, "$1\n")
    .replace(/([a-z])(?=\d)/g, "$1\n")
    .replace(/([A-Z])(?=[A-Z][a-z])/g, "$1\n")
    .replace(/(\uE001)(?=[A-Z\uE000])/g, "$1\n");
  text = text.replace(/\uE000(\d+)\uE001/g, (_, index: string) => kept[Number(index)] ?? "");
  return text.split("\n");
}

/** Each installed option once, in the feed's order. */
export function splitVehicleOptions(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const piece of String(raw ?? "").split(SEPARATORS)) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    for (const part of looksRunTogether(trimmed) ? splitRunTogether(trimmed) : [trimmed]) {
      const option = part.replace(/\s+/g, " ").trim();
      const key = option.toLowerCase();
      if (!option || seen.has(key)) continue;
      seen.add(key);
      options.push(option);
    }
  }
  return options;
}
