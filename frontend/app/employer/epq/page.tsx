"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EPQChoiceObj = { text?: string; label?: string; score?: number; value?: number; name?: string };
type EPQChoice = string | EPQChoiceObj;
type EPQQuestion = { id: string; text: string; choices: EPQChoice[] };

async function postJson(path: string, body: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  return { res, data };
}

export default function EmployerEPQPage() {
  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<EPQQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = qs.length > 0 && answeredCount >= qs.length;

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8001/employer/epq/questions", { credentials: "include" });
      const data = await res.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setQs(items);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load questions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      // Try the most likely API path first
      let { res, data } = await postJson("/api/employer/assessments", { answers });

      // If your project actually implemented a different path, fall back
      if (res.status === 404) {
        ({ res, data } = await postJson("/api/employer/assessments/create", { answers }));
      }

      if (!res.ok) {
        throw new Error(data?.detail ?? data?.message ?? `Create assessment failed (${res.status})`);
      }

      // Prefer employer dashboard route, fall back to /dashboard
      try {
        window.location.href = "/employer/dashboard";
      } catch {
        window.location.href = "/dashboard";
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Employer EPQ (20 Questions)</h1>
        <Link href="/employer/dashboard" style={{ color: "#111", textDecoration: "underline" }}>
          Back to dashboard
        </Link>
      </div>

      <p style={{ marginTop: 6, color: "#555" }}>
        Answer these to define the role environment. This determines which applicant questions are shown.
      </p>

      {/* Progress banner */}
      {!loading && !error && qs.length > 0 && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "white",
            padding: "10px 0",
            marginTop: 10,
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              Answered: <b>{answeredCount}</b> / <b>{qs.length}</b>
            </div>
            <div style={{ color: allAnswered ? "#0a0" : "#666", fontWeight: 600 }}>
              {allAnswered ? "Ready to create assessment ✅" : "Complete all questions to continue"}
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ marginTop: 16 }}>Loading…</p>}

      {!loading && error && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #f99", background: "#fff5f5" }}>
          <b>Error:</b> {error}
          <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
            If this says “Not logged in”, open <a href="/login">/login</a> in the browser and log in first.
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={loadQuestions} style={{ padding: "8px 12px" }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && qs.length > 0 && (
        <>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {qs.map((q, idx) => (
              <div key={q.id ?? String(idx)} style={{ padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
                <div style={{ fontWeight: 650 }}>
                  {idx + 1}. {q.text}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {(q.choices ?? []).map((c, cidx) => {
                    const text =
                      typeof c === "string"
                        ? c
                        : (c?.text ?? c?.label ?? c?.name ?? String(cidx + 1));

                    const score =
                      typeof c === "object" && c !== null && typeof (c as EPQChoiceObj).score === "number"
                        ? (c as EPQChoiceObj).score!
                        : typeof c === "object" && c !== null && typeof (c as EPQChoiceObj).value === "number"
                        ? (c as EPQChoiceObj).value!
                        : cidx + 1;

                    const selected = answers[q.id] === score;

                    return (
                      <label key={cidx} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: score }))}
                        />
                        <span>
                          <b>{score}.</b> {text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Button moved to bottom */}
          <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={submit}
              disabled={submitting || !allAnswered}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #333",
                background: !allAnswered ? "#eee" : "#111",
                color: !allAnswered ? "#666" : "#fff",
                cursor: !allAnswered ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {submitting ? "Creating…" : "Create Assessment"}
            </button>
          </div>
        </>
      )}

      {!loading && !error && qs.length === 0 && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", background: "#fafafa" }}>
          No questions returned.
          <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
            Check that <code>/api/employer/epq/questions</code> is working and you’re logged in.
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={loadQuestions} style={{ padding: "8px 12px" }}>
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

