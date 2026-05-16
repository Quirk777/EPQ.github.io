import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../_proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  
  const backendUrl = getBackendBaseUrl();
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