import { NextRequest } from "next/server";
import { proxyRaw } from "../../../_proxy";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyRaw(req, `/employer/candidates/${id}`);
}
