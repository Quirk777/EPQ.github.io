"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireEmployerLogin } from "../../../_lib/requireLogin";

type Q = { id: string; prompt?: string; text?: string; choices: string[] };

function pickPrompt(q: Q) {
  return (q.prompt || q.text || "").toString();
}

function scoreChoice(idx: number, totalChoices: number) {
  // Map choice index to 1..4 score
  if (totalChoices <= 1) return 2.0;
  const scaled = (idx / (totalChoices - 1)) * 3 + 1; // 1..4
  return Math.max(1, Math.min(4, scaled));
}

function classifyEnvironment(avg: number) {
  // Creative but simple: higher avg => higher load tolerance environment
  if (avg >= 3.1) return { env: "Advanced", plan: "Scale", price: "$99/mo", tagline: "High-velocity teams with deeper analytics + automation." };
  if (avg >= 2.3) return { env: "Standard", plan: "Growth", price: "$49/mo", tagline: "Balanced hiring pipeline with reports + dashboard." };
  return { env: "Core", plan: "Starter", price: "$19/mo", tagline: "Lean workflow with clear, practical summaries." };
}

export default function EmployerOnboardingEPQ() {
  useRequireEmployerLogin();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Try your backend route first (commonly exists in your project)
        const res = await fetch("http://127.0.0.1:8001/employer/epq/questions", { credentials: "include" });
        if (!res.ok) {
          // fallback to Next proxy if you already have it; if not, it will still show a clean message
          const res2 = await fetch("http://127.0.0.1:8001/employer/epq/questions", { credentials: "include" });
          if (!res2.ok) throw new Error("Could not load employer EPQ questions.");
          const data2 = await res2.json();
          setQuestions(Array.isArray(data2?.questions) ? data2.questions : Array.isArray(data2) ? data2 : []);
        } else {
          const data = await res.json();
          setQuestions(Array.isArray(data?.questions) ? data.questions : Array.isArray(data) ? data : []);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);

  function choose(qid: string, choiceIndex: number, totalChoices: number) {
    const score = scoreChoice(choiceIndex, totalChoices);
    setAnswers((prev) => ({ ...prev, [qid]: score }));
  }

  function finish() {
    const vals = Object.values(answers);
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const rec = classifyEnvironment(avg);

    try {
      localStorage.setItem("employer_onboarding_done", "1");
      localStorage.setItem("employer_environment", rec.env);
      localStorage.setItem("employer_plan", rec.plan);
      localStorage.setItem("employer_plan_price", rec.price);
      localStorage.setItem("employer_plan_tagline", rec.tagline);
      localStorage.setItem("employer_epq_avg", avg.toFixed(2));
    } catch {}

    router.replace("/employer/onboarding/recommendation");
  }

  return (
    <div style={wrap}>
      <div style={topBar}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 950, margin: 0 }}>Employer Environment EPQ</h1>
          <div style={{ color: "#555", marginTop: 6 }}>
            Complete this to unlock your dashboard. We use it to tailor your reports and hiring insights.
          </div>
        </div>
        <Link href="/" style={{ color: "#111", textDecoration: "underline" }}>Home</Link>
      </div>

      {loading && <p style={{ marginTop: 14 }}>Loadingâ€¦</p>}
      {!loading && err && <div style={errBox}><b>Error:</b> {err}</div>}

      {!loading && !err && (
        <div style={panel}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            Questions ({answered}/{questions.length})
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {questions.map((q) => (
              <div key={q.id} style={qCard}>
                <div style={{ fontWeight: 800 }}>{q.id}. {pickPrompt(q) || "Question"}</div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {(q.choices || []).map((c, idx) => {
                    const selected = (answers[q.id] !== undefined) && Math.round(answers[q.id] * 100) === Math.round(scoreChoice(idx, q.choices.length) * 100);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => choose(q.id, idx, q.choices.length)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: selected ? "2px solid #111" : "1px solid #ccc",
                          background: selected ? "#f3f3ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={finish}
              disabled={answered < Math.min(5, questions.length)}  // small minimum so the demo can't be "empty"
              style={btn}
            >
              Finish & Get Recommendation
            </button>

            <span style={{ color: "#666", fontSize: 13 }}>
              Answer at least {Math.min(5, questions.length)} questions to continue.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", background: "#fbfbfd", minHeight: "100vh" };
const topBar: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const panel: React.CSSProperties = { marginTop: 16, padding: 14, border: "1px solid #ddd", borderRadius: 18, background: "#fff", boxShadow: "0 12px 30px rgba(0,0,0,0.06)" };
const qCard: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 14, background: "#fff" };
const btn: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", fontWeight: 900, cursor: "pointer" };
const errBox: React.CSSProperties = { marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid #f99", background: "#fff5f5", color: "#900" };
