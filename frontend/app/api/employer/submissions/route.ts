import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function GET(req: NextRequest) {
  // Backend: GET /employer/submissions
  return proxyRaw(req, "/employer/submissions");
}