import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../_proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ aid: string }> }) {
  const { aid } = await params;
  
  const backendUrl = getBackendBaseUrl();
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