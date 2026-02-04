import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

export async function POST(req: Request) {
  try {
    const upstream = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    });

    const text = await upstream.text();

    const res = new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });

    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) res.headers.set("set-cookie", setCookie);

    return res;
  } catch (err) {
    return NextResponse.json(
      { detail: "Logout proxy error" },
      { status: 500 }
    );
  }
}
