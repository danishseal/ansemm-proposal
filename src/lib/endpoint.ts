// Mixed-content guard for chain endpoints.
//
// The app is served over HTTPS in production (Vercel). A browser blocks any
// plain http:// subresource on an https:// page as "mixed content", surfacing
// to the user as a bare "Failed to fetch" the moment the wallet tries to
// broadcast. The clone's own defaults are already https, but the Vercel project
// has historically injected raw http://<ip>:<port> endpoints via env vars
// (NEXT_PUBLIC_BWICK_RPC / _REST etc.), which override those defaults and
// reintroduce the failure on every redeploy.
//
// So: whenever the document itself is https, force any http endpoint onto the
// Caddy TLS proxy. The two known ports map to their proxied domains; anything
// else is best-effort scheme-upgraded. On an http page (local dev) nothing is
// rewritten, so a local chain at http://localhost:26657 still works.
export function secureEndpoint(url: string | undefined | null): string {
  const u = (url ?? "").trim();
  if (!u) return u;
  const pageIsHttps =
    typeof window !== "undefined" && window.location?.protocol === "https:";
  if (!pageIsHttps) return u;
  if (!u.startsWith("http://")) return u;
  if (u.includes(":26657")) return "https://rpc.ansemchain.fun";
  if (u.includes(":1317")) return "https://rest.ansemchain.fun";
  return "https://" + u.slice("http://".length);
}
