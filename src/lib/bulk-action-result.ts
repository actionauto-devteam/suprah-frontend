import { toast } from "sonner";

// Promise.allSettled + a summary toast, in place of the Promise.all pattern
// that used to report one all-or-nothing success/error with no indication
// of which items in a bulk action actually failed.
export async function runBulkSettled<T>(
  ids: T[],
  action: (id: T) => Promise<unknown>,
  labels: { verb: string; noun: string },
): Promise<{ succeeded: T[]; failed: T[] }> {
  const results = await Promise.allSettled(ids.map((id) => action(id)));

  const succeeded: T[] = [];
  const failed: T[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") succeeded.push(ids[index]);
    else failed.push(ids[index]);
  });

  if (failed.length === 0) {
    toast.success(`${succeeded.length} ${labels.noun}${succeeded.length === 1 ? "" : "s"} ${labels.verb}`);
  } else if (succeeded.length === 0) {
    toast.error(`Failed to ${labels.verb} ${failed.length} ${labels.noun}${failed.length === 1 ? "" : "s"}`);
  } else {
    toast.warning(
      `${succeeded.length} ${labels.noun}${succeeded.length === 1 ? "" : "s"} ${labels.verb}, ${failed.length} failed`,
    );
  }

  return { succeeded, failed };
}
