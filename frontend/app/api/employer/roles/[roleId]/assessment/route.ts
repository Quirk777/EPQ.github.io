import { NextRequest } from "next/server";
import { proxyRaw } from "../../../../_proxy";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await context.params;
  return proxyRaw(req, `/api/employer/roles/${roleId}/assessment`);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await context.params;
  return proxyRaw(req, `/api/employer/roles/${roleId}/assessment`);
}
