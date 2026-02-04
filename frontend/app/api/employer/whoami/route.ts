import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function GET(req: NextRequest) {
  // Backend: GET /employer/whoami
  return proxyRaw(req, "/employer/whoami");
}