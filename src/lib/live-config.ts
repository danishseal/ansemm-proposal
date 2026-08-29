// Runtime config-registry resolver (proposals).
//
// Launch model: the two baked anchors are the config-registry ADDRESS and the
// REST endpoint - both genesis-stable. Proposals is a memo/treasury system: it
// reads proposals from tx history filtered by the treasury recipient and holds
// NO registry-managed contract addresses. So the registry's only role here is
// the OPTIONAL REST endpoint override (a single admin UpdateConfig can retarget
// the REST domain for every app at once). The treasury address + chain-id stay
// baked env anchors (both stable across a regenesis when the same keys are used;
// the registry has no treasury field).

// The mutable-address anchor baked at build (with the REST endpoint). Default =
// the current live ansem registry. Genesis-proof launch value (instantiate2 +
// fixed salt): ansem1uruc2ue7wqvy83yysspe6afrwu02fuz4g0mxffuz3tssljakxu0qt57u4l
const REGISTRY_CONTRACT =
  process.env.NEXT_PUBLIC_ANSEM_REGISTRY ??
  "ansem1vguuxez2h5ekltfj9gjd62fs5k4rl2zy5hfrncasykzw08rezpfs766uxe";

const BAKED_REST =
  process.env.NEXT_PUBLIC_BWICK_REST ??
  process.env.NEXT_PUBLIC_REST_ENDPOINT ??
  // HTTPS via val1's Caddy TLS proxy (fronts LCD :1317). A plain http:// or
  // :port endpoint is blocked as mixed content on an HTTPS deploy ("failed to
  // fetch").
  "https://rest.ansemchain.fun";

interface RegistryConfig {
  ansemRestUrlOverride: string;
}

const CACHE_TTL_MS = 60_000;
let cache: { value: RegistryConfig; fetchedAt: number } | null = null;
let inFlight: Promise<RegistryConfig> | null = null;

function b64(s: string): string {
  if (typeof btoa === "function") return btoa(s);
  return Buffer.from(s, "utf-8").toString("base64");
}

async function fetchRegistry(): Promise<RegistryConfig> {
  const query = b64(JSON.stringify({ config: {} }));
  const url = `${BAKED_REST.replace(/\/$/, "")}/cosmwasm/wasm/v1/contract/${REGISTRY_CONTRACT}/smart/${query}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`config registry HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return { ansemRestUrlOverride: String(json.data?.ansem_rest_url_override ?? "") };
}

async function loadRegistry(): Promise<RegistryConfig> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const value = await fetchRegistry();
      cache = { value, fetchedAt: Date.now() };
      return value;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** REST endpoint: registry override wins, else the baked anchor (which is what
 *  reaches the registry in the first place). Never throws. */
export async function getRestEndpoint(): Promise<string> {
  try {
    const o = (await loadRegistry()).ansemRestUrlOverride;
    if (o) return o.replace(/\/$/, "");
  } catch {
    /* fall through */
  }
  return BAKED_REST.replace(/\/$/, "");
}
