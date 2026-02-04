"use client";

import { useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SUB_KEY = "epq_subscribed";

function SubscribePageContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = sp?.get("next");
    return n && n.startsWith("/") ? n : "/employer/dashboard";
  }, [sp]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SUB_KEY) === "true") router.replace(nextUrl);
    } catch {}
  }, [nextUrl, router]);

  function activate(plan: "starter" | "pro" | "enterprise") {
    try {
      window.localStorage.setItem(SUB_KEY, "true");
      window.localStorage.setItem("epq_plan", plan);
    } catch {}
    router.replace(nextUrl);
  }

  const card: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 34px rgba(0,0,0,0.10)",
    padding: 16,
  };

  const btn: React.CSSProperties = {
    display: "inline-flex",
    justifyContent: "center",
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "#111",
    color: "#fff",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = { ...btn, background: "#fff", color: "#111" };

  return (
    <div style={{
      maxWidth: 1050,
      margin: "0 auto",
      padding: 22,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#0b1220"
    }}>
      <div style={{ maxWidth: 760 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 850 }}>Subscription</div>
        <h1 style={{ margin: "6px 0 10px", fontSize: 32, letterSpacing: -0.4 }}>
          Choose a plan to continue 🔒
        </h1>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
          Prototype subscription gate. Later you’ll connect Stripe and replace this local activation with real billing.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 18 }}>
        <div style={card}>
          <div style={{ fontWeight: 950 }}>Starter</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>$0</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>For demos and testing</div>
          <ul style={{ marginTop: 12, paddingLeft: 18, color: "#334155", lineHeight: 1.9, fontSize: 13 }}>
            <li>Basic dashboard</li>
            <li>PDF generation</li>
            <li>1 active assessment</li>
          </ul>
          <button style={{ ...btnGhost, marginTop: 14 }} onClick={() => activate("starter")}>
            Activate Starter
          </button>
        </div>

        <div style={{ ...card, border: "1px solid rgba(37,99,235,0.35)" }}>
          <div style={{ fontWeight: 950 }}>Pro</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>$49</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>For small teams</div>
          <ul style={{ marginTop: 12, paddingLeft: 18, color: "#334155", lineHeight: 1.9, fontSize: 13 }}>
            <li>Unlimited assessments</li>
            <li>Recency grouping</li>
            <li>Priority queue</li>
          </ul>
          <button style={{ ...btn, marginTop: 14 }} onClick={() => activate("pro")}>
            Activate Pro
          </button>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 950 }}>Enterprise</div>
          <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 8 }}>Talk to us</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>Custom</div>
          <ul style={{ marginTop: 12, paddingLeft: 18, color: "#334155", lineHeight: 1.9, fontSize: 13 }}>
            <li>Custom workflows</li>
            <li>Support + SLA</li>
            <li>Advanced reporting</li>
          </ul>
          <button style={{ ...btnGhost, marginTop: 14 }} onClick={() => activate("enterprise")}>
            Activate Enterprise
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SubscribePageContent />
    </Suspense>
  );
}