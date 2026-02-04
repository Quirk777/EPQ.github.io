import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8001";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ candidate_id: string }> }
) {
  const { candidate_id } = await context.params;
  
  try {
    // Forward cookies for authentication
    const cookieHeader = req.headers.get("cookie") || "";
    
    const backendUrl = `${BACKEND}/reports/by-candidate/${encodeURIComponent(candidate_id)}`;
    
    const response = await fetch(backendUrl, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { detail: "PDF not found" },
        { status: response.status }
      );
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // Return with inline display headers to prevent auto-download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="candidate_${candidate_id}_report.pdf"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}
