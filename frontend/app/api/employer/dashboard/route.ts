// frontend/app/api/employer/dashboard/route.ts
import { NextRequest } from "next/server";
// import { proxyJson } from "../_proxy";
import { proxyJson } from "../../_proxy";

export async function GET(req: NextRequest) {
  return proxyJson(req, "/employer/dashboard", { method: "GET" });
}
