import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

function joinUrl(base: string, path: string) {
  const b = (base || "").replace(/\/+$/, "");
  const raw = path || "";
  const p = raw.startsWith("/") ? raw : ("/" + raw);
  return b + p;
}

// Raw pass-through proxy: forwards status/body/headers and NEVER throws on non-2xx
export async function proxyRaw(req: Request, backendPath: string, init?: RequestInit) {
  const base =
    (process.env.BACKEND_BASE_URL ||
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://127.0.0.1:8001").replace(/\/+$/, "");

  const url = base + backendPath;

  // Forward session cookies so FastAPI's SessionMiddleware can read employer_id
  const inHeaders = req.headers || new Headers();

  const headers = new Headers(init && init.headers ? (init.headers as any) : undefined);

  const cookie = inHeaders.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const auth = inHeaders.get("authorization");
  if (auth) headers.set("authorization", auth);

  const ct = inHeaders.get("content-type");
  if (ct && !headers.get("content-type")) headers.set("content-type", ct);

  const ua = inHeaders.get("user-agent");
  if (ua) headers.set("user-agent", ua);

  const method = (init && init.method) ? init.method : (req as any).method;

  let body: any = undefined;
  if (init && "body" in init) {
    body = (init as any).body;
  } else {
    if (method && method !== "GET" && method !== "HEAD") {
      try {
        body = await (req as any).text();
      } catch (e) {
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

