"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Q = { id: string; prompt: string; choices: string[] };
type ApiResp = { assessment_id: string; max_questions: number; questions: Q[] };

export default function ApplicantPage() {
  const params = useParams<{ aid: string }>();
  const aid = params?.aid;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [questions, setQuestions] = useState<Q[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answeredCount = useMemo(() => Object.keys(responses).length, [responses]);

  useEffect(() => {
    if (!aid) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/applicant/${aid}/questions`, { credentials: "include" });
        const data = (await res.json()) as ApiResp;

        if (!res.ok) throw new Error((data as any)?.detail ?? "Failed to load questions");

        setQuestions(data.questions ?? []);
        setResponses({});
      } catch (e: any) {
        setLoadError(e?.message ?? "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
  }, [aid]);

  function choose(qid: string, choice: string) {
    setResponses((prev) => ({ ...prev, [qid]: choice }));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!name.trim() || !email.trim()) throw new Error("Please enter your name and email.");
      if (answeredCount === 0) throw new Error("Please answer at least 1 question before submitting.");

      const res = await fetch(`/api/applicant/${aid}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, responses }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.status === 409) {
        // Already submitted: send them to done anyway (prevents repeats)
        router.replace(`/applicant/${aid}/done`);
        return;
      }

      if (!res.ok) throw new Error(data?.detail ?? "Submit failed");

      router.replace(`/applicant/${aid}/done`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={wrap}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Applicant Assessment</h1>

      {loading && <p style={{ marginTop: 12 }}>Loading…</p>}

      {!loading && loadError && (
        <div style={errBox}>
          <b>Error:</b> {loadError}
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <label>
              <div style={labT}>Name</div>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
            </label>

            <label>
              <div style={labT}>Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
            </label>
          </div>

          <div style={panel}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Questions ({answeredCount}/{questions.length} answered)
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {questions.map((q) => (
                <div key={q.id} style={qCard}>
                  <div style={{ fontWeight: 700 }}>
                    {q.id}. {q.prompt}
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {q.choices.map((c) => {
                      const selected = responses[q.id] === c;
                      return (
                        <button
                          key={c}
                          onClick={() => choose(q.id, c)}
                          type="button"
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 10,
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
              <button onClick={submit} disabled={submitting} style={btn}>
                {submitting ? "Submitting…" : "Submit"}
              </button>

              {submitError ? <span style={{ color: "#b00" }}>{submitError}</span> : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" };
const labT: React.CSSProperties = { fontSize: 13, color: "#555" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" };
const panel: React.CSSProperties = { marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 12 };
const qCard: React.CSSProperties = { padding: 12, border: "1px solid #eee", borderRadius: 12 };
const btn: React.CSSProperties = { padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff", fontWeight: 700, cursor: "pointer" };
const errBox: React.CSSProperties = { marginTop: 12, padding: 12, border: "1px solid #f99", background: "#fff5f5", borderRadius: 10 };