import { NextRequest } from "next/server";
import { proxyRaw } from "../../../../_proxy";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await context.params;
  return proxyRaw(req, `/api/employer/roles/${roleId}/submissions`);
}
