import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function POST(req: NextRequest) {
  return proxyRaw(req, "/auth/reset-password", { method: "POST" });
}
