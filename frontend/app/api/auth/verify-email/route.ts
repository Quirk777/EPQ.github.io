import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return proxyRaw(req, `/auth/verify-email${qs}`, { method: "GET" });
}
