import { proxyRaw } from "../../_proxy";

export async function GET(req: Request) {
  return proxyRaw(req as any, "/api/employer/roles");
}

export async function POST(req: Request) {
  return proxyRaw(req as any, "/api/employer/roles");
}