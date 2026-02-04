import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  
  // In production, this would be handled by rewrites in next.config.ts
  // This is a fallback implementation
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8001";
  const url = `${backendUrl}/applicant/${encodeURIComponent(aid)}/submit`;
  
  try {
    const body = await req.text();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}