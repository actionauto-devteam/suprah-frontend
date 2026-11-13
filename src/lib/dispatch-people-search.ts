/**
 * Who Dispatch Chat's people search can find, in the person's own words. It
 * matches the server's rules (2026-11-13): each person finds only the people
 * they work with, never everyone on Suprah AI.
 */
export function peopleSearchReach(role: string | null | undefined): string {
  if (role === "super_admin") return "You can find any driver or staff member on Suprah AI.";
  if (role === "driver") {
    return "You can find staff and drivers from dealerships you've hauled loads for, and people you share a channel with.";
  }
  return "You can find drivers, your dealership's staff, and people you share a channel with.";
}
