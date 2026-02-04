import { NextRequest } from "next/server";
import { proxyRaw } from "../../_proxy";

export async function GET(req: NextRequest) {
  return proxyRaw(req, "/api/employer/branding", { method: "GET" });
}

export async function DELETE(req: NextRequest) {
  return proxyRaw(req, "/api/employer/branding", { method: "DELETE" });
}
