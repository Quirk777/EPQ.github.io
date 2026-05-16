import { NextRequest } from "next/server";
import { getBackendBaseUrl } from "../../../_proxy";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const cookieHeader = req.headers.get('cookie') || '';
    
    const res = await fetch(`${getBackendBaseUrl()}/api/employer/branding/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader
        // Don't set Content-Type - let fetch set it with the boundary
      },
      body: formData
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Upload proxy error:', error);
    return Response.json({ detail: message }, { status: 500 });
  }
}
