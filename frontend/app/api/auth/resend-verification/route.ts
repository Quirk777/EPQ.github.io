import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function GET(req: NextRequest) {
  return proxyRaw(req, "/auth/resend-verification", { method: "GET" });
}
