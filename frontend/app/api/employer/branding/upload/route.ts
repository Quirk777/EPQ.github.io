import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const cookieHeader = req.headers.get('cookie') || '';
    
    const res = await fetch(`${BACKEND_URL}/api/employer/branding/upload`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader
        // Don't set Content-Type - let fetch set it with the boundary
      },
      body: formData
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Upload proxy error:', error);
    return Response.json({ detail: error.message || 'Upload failed' }, { status: 500 });
  }
}
