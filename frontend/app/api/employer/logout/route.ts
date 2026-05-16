import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../_proxy";

export async function POST(req: Request) {
  try {
    const upstream = await fetch(`${getBackendBaseUrl()}/auth/logout`, {
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
