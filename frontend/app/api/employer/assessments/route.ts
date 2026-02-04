// frontend/app/api/employer/assessments/route.ts
import { NextRequest } from "next/server";
import { proxyJson } from "../../_proxy";

export async function POST(req: NextRequest) {
  return proxyJson(req, "/employer/assessments", { method: "POST" });
}

export async function GET(req: NextRequest) {
  return proxyJson(req, "/employer/assessments", { method: "GET" });
}
