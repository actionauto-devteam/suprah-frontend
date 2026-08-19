// Thin re-export — this is the "SupraSpace as a page within the main Suprah
// dashboard" entry point (full sidebar/chrome, same as it always was). The
// actual chat UI lives at (chat)/supraspace/page.tsx, which is ALSO the
// dedicated standalone/installable app's own page — same component, two
// different entry points/layouts, exactly like /crm/conversations already
// does for its own embedded case. Do not duplicate the real implementation
// here; edit (chat)/supraspace/page.tsx instead.
export { default } from "@/app/(chat)/supraspace/page";
