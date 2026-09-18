// Remember only the successful URL choice, not whether a new <img> is ready.
// Filtering unmounts cards; retrying a known-broken primary on every remount
// causes avoidable blank/loading flashes before the same fallback appears.
const choices = new Map<string, { source: string; at: number }>();
const MAX_CHOICES = 256;
const TTL_MS = 5 * 60_000;

export function rememberedPhotoIndex(candidates: string[]): number {
  const key = JSON.stringify(candidates);
  const choice = choices.get(key);
  if (!choice) return 0;
  if (Date.now() - choice.at > TTL_MS) {
    choices.delete(key);
    return 0;
  }
  return Math.max(0, candidates.indexOf(choice.source));
}

export function rememberPhoto(candidates: string[], source: string) {
  if (!source || !candidates.includes(source)) return;
  const key = JSON.stringify(candidates);
  choices.delete(key);
  choices.set(key, { source, at: Date.now() });
  while (choices.size > MAX_CHOICES) choices.delete(choices.keys().next().value!);
}