import { NextRequest } from "next/server";

const DEFAULT_BACKEND_URL = process.env.NODE_ENV === "production"
  ? "http://backend:8001"
  : "http://127.0.0.1:8001";

export function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, "");
}

// Raw pass-through proxy: forwards status/body/headers and NEVER throws on non-2xx
export async function proxyRaw(req: Request, backendPath: string, init?: RequestInit) {
  const url = getBackendBaseUrl() + backendPath;

  // Forward session cookies so FastAPI's SessionMiddleware can read employer_id
  const inHeaders = req.headers || new Headers();

  const headers = new Headers(init?.headers);

  const cookie = inHeaders.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const auth = inHeaders.get("authorization");
  if (auth) headers.set("authorization", auth);

  const ct = inHeaders.get("content-type");
  if (ct && !headers.get("content-type")) headers.set("content-type", ct);

  const ua = inHeaders.get("user-agent");
  if (ua) headers.set("user-agent", ua);

  const method = init?.method ?? req.method;

  let body: BodyInit | null | undefined = undefined;
  if (init && "body" in init) {
    body = init.body ?? undefined;
  } else {
    if (method && method !== "GET" && method !== "HEAD") {
      try {
        body = await req.text();
      } catch {
        body = undefined;
      }
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    cache: "no-store"
  });

  const buf = await res.arrayBuffer();

// Manually copy headers; explicitly forward Set-Cookie so browser keeps session
const outHeaders = new Headers();
res.headers.forEach((v, k) => {
  // set-cookie handling is special; skip here and handle below
  if (k.toLowerCase() !== "set-cookie") {
    outHeaders.set(k, v);
  }
});

// Forward Set-Cookie (may be absent)
const setCookie = res.headers.get("set-cookie");
if (setCookie) {
  // Note: if backend returns multiple cookies, they may be combined depending on runtime.
  // Still better than dropping them entirely.
  outHeaders.set("set-cookie", setCookie);
}

const out = new Response(buf, { status: res.status, headers: outHeaders });
return out;
}

export async function proxyJson(req: NextRequest, path: string, init?: RequestInit) {
  return proxyRaw(req, path, init);
}

// Back-compat: lots of routes import { proxy } from "../_proxy"
export const proxy = proxyRaw;

