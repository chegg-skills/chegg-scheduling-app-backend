// Strips the `t=` session-token query param from a URL before it reaches logs —
// the token grants standing access to a booking's join link, so it must never be
// persisted in plaintext in access logs, APM traces, or error trackers.
export const redactSessionToken = (url: string): string => url.replace(/([?&]t=)[^&]*/, "$1[redacted]");
