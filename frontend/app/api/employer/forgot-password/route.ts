import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function POST(req: NextRequest) {
  return proxyRaw(req, "/api/employer/forgot-password");
}
