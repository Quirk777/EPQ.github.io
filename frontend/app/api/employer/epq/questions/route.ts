import { NextRequest } from "next/server";
import { proxyRaw } from "../../../_proxy";

// GET /api/employer/epq/questions  ->  FastAPI GET /employer/epq/questions
export async function GET(req: NextRequest) {
  return proxyRaw(req as any, "/employer/epq/questions", { method: "GET" });
}
