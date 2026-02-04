import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await context.params;
  return NextResponse.json({ 
    message: "Test route works", 
    roleId,
    timestamp: new Date().toISOString()
  });
}
