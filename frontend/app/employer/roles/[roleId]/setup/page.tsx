"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type EpqQuestion = {
  id?: string;
  prompt?: string;
  text?: string;
  question?: string;
  choices?: string[];
  options?: string[];
};

function pickPrompt(q: EpqQuestion): string {
  return (q.prompt || q.text || q.question || "").trim();
}

function pickChoices(q: EpqQuestion): string[] {
  const c = (q.choices || q.options || []) as any;
  return Array.isArray(c) ? c.map(String) : [];
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        marginTop: 14,
        border: "1px solid #fca5a5",
        background: "#fef2f2",
        color: "#991b1b",
        padding: 14,
        borderRadius: 12,
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
      <div>{msg}</div>
    </div>
  );
}

export default function RoleSetupPage() {
  const params = useParams() as { roleId?: string };
  const roleId = params?.roleId ? String(params.roleId) : "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [questions, setQuestions] = useState<EpqQuestion[]>([]);
  const [idx, setIdx] = useState(0);

  // answers[qIndex] = selected choice value (string)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const current = questions[idx];
  const prompt = current ? pickPrompt(current) : "";
  const choices = current ? pickChoices(current) : [];

  const currentValue = answers[String(idx)] ?? "";

  const canGoPrev = idx > 0;
  const canGoNext = idx < questions.length - 1;
  const currentAnswered = Boolean(currentValue);

  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        // Keep using the Next API route (it should proxy to FastAPI and include cookies)
        const res = await fetch("/api/employer/epq/questions", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Failed to load EPQ questions (${res.status}). ${t || ""}`.trim());
        }

        const data = await res.json();
        const items = Array.isArray(data) ? data : (data?.items ?? data?.questions ?? []);
        if (!Array.isArray(items) || items.length < 1) {
          throw new Error("No EPQ questions returned.");
        }

        if (!ignore) {
          setQuestions(items);
          setIdx(0);
        }
      } catch (e: any) {
        if (!ignore) setErr(e?.message || "Failed to load questions.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  function selectChoice(v: string) {
    setAnswers((prev) => ({ ...prev, [String(idx)]: v }));
  }

  function goPrev() {
    if (idx > 0) setIdx((x) => x - 1);
  }

  function goNext() {
    if (idx < questions.length - 1) setIdx((x) => x + 1);
  }

  async function createConfig() {
    setSubmitting(true);
    setErr(null);

    try {
      if (!roleId) throw new Error("Missing roleId in URL.");
      if (!allAnswered) throw new Error("Please answer all questions before creating the role config.");

      const payload = { answers };

      const res = await fetch(`/api/employer/roles/${roleId}/assessment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail || `Create assessment failed (${res.status})`;
        throw new Error(detail);
      }

      const assessmentId = data?.assessment_id || data?.assessmentId || data?.id;
      if (!assessmentId) {
        throw new Error("Created assessment but response did not include assessment_id.");
      }

      const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const link = `${base}/applicant/${assessmentId}`;

      // Show link + copy UI
      const holder = document.getElementById("applicant-link");
      if (holder) holder.textContent = link;

      try {
        await navigator.clipboard.writeText(link);
        const toast = document.getElementById("copy-toast");
        if (toast) {
          toast.textContent = "Link copied!";
          (toast as any).style.opacity = "1";
          setTimeout(() => ((toast as any).style.opacity = "0"), 1200);
        }
      } catch {
        // ignore clipboard errors
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to create config.");
    } finally {
      setSubmitting(false);
    }
  }

  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "22px 16px" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#0b1220" }}>Role Environment Setup</div>
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>
          Answer the 20 EPQ questions once. This config creates the applicant link for this role.
        </div>
      </div>

      {err && <ErrorBox msg={err} />}

      <div style={{ ...card, marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading questions...</div>
        ) : questions.length < 1 ? (
          <div style={{ color: "#6b7280" }}>No questions found.</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111" }}>
                Question {idx + 1} of {questions.length}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{answeredCount}/{questions.length} answered</div>
            </div>

            <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
              <div
                style={{
                  height: "100%",
                  width: `${(Math.max(answeredCount, idx + 1) / questions.length) * 100}%`,
                  background: "#111",
                  transition: "width 0.2s ease",
                }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 850, lineHeight: 1.25, color: "#0b1220" }}>
                {prompt || `Question ${idx + 1}`}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {choices.map((c, j) => {
                  const v = String(c);
                  const checked = currentValue === v;
                  const inputId = `q${idx}_c${j}`;

                  return (
                    <label
                      key={`${idx}-${j}`}
                      htmlFor={inputId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 12px",
                        borderRadius: 14,
                        border: checked ? "1px solid #111" : "1px solid #e5e7eb",
                        background: checked ? "#f9fafb" : "#fff",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`q_${idx}`}
                        checked={checked}
                        onChange={() => selectChoice(v)}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: "#111",
                        }}
                      />
                      <span style={{ fontSize: 14, color: "#111" }}>{v}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 18 }}>
              <button onClick={goPrev} disabled={!canGoPrev} style={{ ...btn, opacity: canGoPrev ? 1 : 0.45 }}>
                Previous
              </button>

              {canGoNext ? (
                <button
                  onClick={goNext}
                  disabled={!currentAnswered}
                  style={{ ...btnPrimary, opacity: currentAnswered ? 1 : 0.45 }}
                  title={currentAnswered ? "" : "Select an answer to continue"}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={createConfig}
                  disabled={submitting || !allAnswered}
                  style={{ ...btnPrimary, opacity: !allAnswered ? 0.45 : 1 }}
                  title={allAnswered ? "" : "Answer all questions to create the role config"}
                >
                  {submitting ? "Creating..." : "Create role config"}
                </button>
              )}
            </div>

            <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 14 }}>
              <div style={{ fontWeight: 900, color: "#111", marginBottom: 8 }}>Applicant link</div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <code
                  id="applicant-link"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: "#fafafa",
                    color: "#111",
                    minWidth: 320,
                  }}
                >
                  Complete all questions and click "Create role config".
                </code>

                <button
                  style={btn}
                  onClick={async () => {
                    const el = document.getElementById("applicant-link");
                    const txt = el ? (el.textContent || "") : "";
                    if (!txt || txt.includes("Complete all questions")) return;
                    try {
                      await navigator.clipboard.writeText(txt);
                      const toast = document.getElementById("copy-toast");
                      if (toast) {
                        toast.textContent = "Link copied!";
                        (toast as any).style.opacity = "1";
                        setTimeout(() => ((toast as any).style.opacity = "0"), 1200);
                      }
                    } catch {}
                  }}
                >
                  Copy
                </button>

                <span id="copy-toast" style={{ color: "#16a34a", fontWeight: 800, opacity: 0, transition: "opacity 0.2s" }}>
                  Link copied!
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

