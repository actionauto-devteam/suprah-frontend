export function isRecordingApiUrl(url: URL): boolean {
  return url.pathname.startsWith('/api/crm/communications/record')
    || /^\/api\/crm\/communications\/calls\/[^/]+\/recording(?:\/|$)/.test(url.pathname);
}
