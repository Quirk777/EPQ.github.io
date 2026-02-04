import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

export async function POST(req: Request) {
  try {
    const body = await req.text();

    const upstream = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body,
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const text = await upstream.text();

    const res = new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { detail: "Login proxy error", error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
