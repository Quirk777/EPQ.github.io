import { NextRequest } from "next/server";
import { proxyRaw } from "../../../_proxy";

export async function PATCH(req: NextRequest) {
  return proxyRaw(req, "/api/employer/branding/settings", { method: "PATCH" });
}
