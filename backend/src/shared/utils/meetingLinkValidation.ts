// Meeting links are emailed to students behind our own domain (the join-redirect
// endpoint), so our domain is effectively vouching for wherever they point. Restrict
// them to an allow-listed set of video-conferencing domains so a compromised or
// malicious coach/admin account can't turn a trusted-looking email into a phishing
// redirect to an arbitrary destination.
// Default includes skills.chegg.com — Chegg's white-labeled "Zoom ISV" domain
// (coach zoomIsvLink values are typically https://students.skills.chegg.com/...,
// not zoom.us directly), alongside plain Zoom for orgs that use it unbranded.
const ALLOWED_MEETING_LINK_HOSTS = (process.env.ALLOWED_MEETING_LINK_DOMAINS ?? "zoom.us,zoomgov.com,skills.chegg.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const isAllowedMeetingLinkHost = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    const host = hostname.toLowerCase();
    return ALLOWED_MEETING_LINK_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
};
