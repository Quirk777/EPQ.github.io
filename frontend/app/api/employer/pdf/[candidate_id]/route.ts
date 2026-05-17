import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../_proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dispositionFor(req: NextRequest, candidateId: string) {
  const mode = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  return `${mode}; filename="candidate_${candidateId}_report.pdf"`;
}

function cookieHeaderFromRequest(req: NextRequest): string {
  try {
    const parts: string[] = [];
    for (const c of req.cookies.getAll()) {
      if (!c?.name) continue;
      parts.push(`${c.name}=${c.value}`);
    }
    return parts.join("; ");
  } catch {
    return req.headers.get("cookie") || "";
  }
}

async function backendFetch(req: NextRequest, backendUrl: string) {
  const cookieHeader = cookieHeaderFromRequest(req) || req.headers.get("cookie") || "";
  const authorization = req.headers.get("authorization") || "";

  const headers: Record<string, string> = {
    Accept: "application/pdf",
  };

  if (cookieHeader) headers.Cookie = cookieHeader;
  if (authorization) headers.Authorization = authorization;

  return fetch(backendUrl, {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}

async function toPlainTextError(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try {
      const j = await res.json();
      const detail = j?.detail;
      if (typeof detail === "string" && detail.trim()) return detail;
    } catch {
      // fall through
    }
  }
  try {
    const text = await res.text();
    if (text && text.trim()) return text.trim();
  } catch {
    // ignore
  }
  return res.statusText || "Request failed";
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ candidate_id: string }> }
) {
  const { candidate_id } = await context.params;
  const backendUrl = `${getBackendBaseUrl()}/reports/by-candidate/${encodeURIComponent(candidate_id)}`;

  try {
    const response = await backendFetch(req, backendUrl);
    if (!response.ok) {
      const msg = await toPlainTextError(response);
      return new NextResponse(msg, {
        status: response.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": dispositionFor(req, candidate_id),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF proxy HEAD error:", error);
    return new NextResponse("Failed to check PDF", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ candidate_id: string }> }
) {
  const { candidate_id } = await context.params;

  try {
    const backendUrl = `${getBackendBaseUrl()}/reports/by-candidate/${encodeURIComponent(candidate_id)}`;

    const response = await backendFetch(req, backendUrl);

    if (!response.ok) {
      const msg = await toPlainTextError(response);
      return new NextResponse(msg, {
        status: response.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // Return with inline display headers to prevent auto-download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": dispositionFor(req, candidate_id),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return new NextResponse("Failed to fetch PDF", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  }
}
