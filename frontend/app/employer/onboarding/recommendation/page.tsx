"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireEmployerLogin } from "../../../_lib/requireLogin";

function get(k: string, fallback = "") {
  try { return localStorage.getItem(k) || fallback; } catch { return fallback; }
}

export default function RecommendationPage() {
  useRequireEmployerLogin();
  const router = useRouter();

  const rec = useMemo(() => {
    const env = get("employer_environment", "Standard");
    const plan = get("employer_plan", "Growth");
    const price = get("employer_plan_price", "$49/mo");
    const tagline = get("employer_plan_tagline", "");
    const avg = get("employer_epq_avg", "—");
    return { env, plan, price, tagline, avg };
  }, []);

  useEffect(() => {
    // If they somehow hit this without completing onboarding, send them back.
    const done = get("employer_onboarding_done", "0");
    if (done !== "1") router.replace("/employer/onboarding/epq");
  }, [router]);

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>Your Environment Profile</h1>
            <p style={{ marginTop: 6, color: "#555" }}>
              Based on your EPQ responses, here is your recommended environment and subscription.
            </p>
          </div>
          <Link href="/" style={{ textDecoration: "underline", color: "#111" }}>Home</Link>
        </div>

        <div style={grid}>
          <div style={box}>
            <div style={label}>Environment</div>
            <div style={big}>{rec.env}</div>
            <div style={small}>EPQ average: <code>{rec.avg}</code></div>
          </div>

          <div style={box}>
            <div style={label}>Recommended Plan</div>
            <div style={big}>{rec.plan}</div>
            <div style={small}>{rec.price} {rec.tagline ? "• " + rec.tagline : ""}</div>
          </div>
        </div>

        <div style={ctaRow}>
          <button
            onClick={() => router.replace("/employer/dashboard")}
            style={primaryBtn}
          >
            Continue to Dashboard
          </button>

          <button
            onClick={() => alert("Subscription checkout is a next step. For the demo, we recommend showing this page as the paywall decision point.")}
            style={secondaryBtn}
          >
            Subscribe now
          </button>
        </div>

        <div style={{ marginTop: 14, color: "#666", fontSize: 13 }}>
          Next upgrades you can add later: Stripe checkout, plan entitlements, and storing employer environment in SQLite.
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { minHeight: "100vh", background: "#fbfbfd", padding: 24, fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center" };
const card: React.CSSProperties = { width: "min(920px, 94vw)", borderRadius: 18, border: "1px solid #ddd", background: "#fff", padding: 18, boxShadow: "0 12px 30px rgba(0,0,0,0.06)" };
const grid: React.CSSProperties = { marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 16, padding: 14, background: "#fff" };
const label: React.CSSProperties = { color: "#666", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 };
const big: React.CSSProperties = { fontSize: 22, fontWeight: 950, marginTop: 6 };
const small: React.CSSProperties = { marginTop: 8, color: "#555", fontSize: 13 };
const ctaRow: React.CSSProperties = { marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" };
const primaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", fontWeight: 900, cursor: "pointer" };
const secondaryBtn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc", background: "#fff", color: "#111", fontWeight: 900, cursor: "pointer" };