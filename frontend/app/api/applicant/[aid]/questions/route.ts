import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  
  // In production, this would be handled by rewrites in next.config.ts
  // This is a fallback implementation
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8001";
  const url = `${backendUrl}/applicant/${encodeURIComponent(aid)}/questions`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}