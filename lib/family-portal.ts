export function familyPortalOrigin(value = process.env.FAMILY_PORTAL_URL): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("FAMILY_PORTAL_URL must be an origin, such as https://reports.example.com.");
  }
  return url.origin;
}

export function familyLoginUrl() {
  return `${familyPortalOrigin() ?? ""}/family/login`;
}

export function familyHostPath(host: string, pathname: string, origin = familyPortalOrigin()) {
  if (!origin || host.toLowerCase() !== new URL(origin).host.toLowerCase()) return null;
  if (pathname === "/") return "/family";
  if (pathname === "/login") return "/family/login";
  if (pathname === "/change-password") return "/family/change-password";
  return null;
}

export function safeAuthRedirect(url: string, baseUrl: string) {
  try {
    const target = new URL(url, baseUrl);
    if (target.origin === new URL(baseUrl).origin || target.origin === familyPortalOrigin()) return target.href;
  } catch { /* Reject invalid redirect URLs. */ }
  return baseUrl;
}
