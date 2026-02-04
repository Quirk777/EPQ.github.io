import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8001";

function inferCompanyName(email: string): string {
  const domain = (email.split("@")[1] || "").trim();
  return domain || "Company";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ detail: "Missing email or password" }, { status: 400 });
    }

    const payload = {
      email,
      password,
      company_name: inferCompanyName(email),
    };

    const upstream = await fetch(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(payload),
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
      { detail: "Signup proxy error", error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
