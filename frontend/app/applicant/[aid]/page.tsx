"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

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
    if (submitError) setSubmitError(null);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!name.trim() || !email.trim()) throw new Error("Please enter your name and email.");
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Please enter a valid email address.");
      if (answeredCount === 0) throw new Error("Please answer at least 1 question before submitting.");

      const res = await fetch(`/api/applicant/${aid}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, responses }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.status === 409) {
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
    <main className="surface-texture-fine" style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Candidate assessment</p>
            <h1 style={styles.title}>Applicant Assessment</h1>
          </div>
          {!loading && !loadError ? (
            <div style={styles.progressText}>{answeredCount}/{questions.length} answered</div>
          ) : null}
        </header>

        {loading && (
          <div style={styles.stateBox}>
            <div style={styles.spinner} aria-label="Loading assessment" />
            <p style={styles.stateText}>Loading assessment...</p>
          </div>
        )}

        {!loading && loadError && (
          <div style={styles.errorBox} role="alert">
            <strong>Unable to load assessment</strong>
            <span>{loadError}</span>
          </div>
        )}

        {!loading && !loadError && (
          <>
            <div style={styles.progressTrack} aria-hidden="true">
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            <div style={styles.identityGrid}>
              <label style={styles.label}>
                <span style={styles.labelText}>Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  autoComplete="name"
                />
              </label>

              <label style={styles.label}>
                <span style={styles.labelText}>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  autoComplete="email"
                />
              </label>
            </div>

            <div style={styles.panel}>
              <div style={styles.questionList}>
                {questions.map((q) => (
                  <section key={q.id} style={styles.questionCard}>
                    <h2 style={styles.questionTitle}>
                      <span style={styles.questionNumber}>{q.id}</span>
                      {q.prompt}
                    </h2>

                    <div style={styles.choiceGrid}>
                      {q.choices.map((c) => {
                        const selected = responses[q.id] === c;
                        return (
                          <button
                            key={c}
                            onClick={() => choose(q.id, c)}
                            type="button"
                            aria-pressed={selected}
                            style={{
                              ...styles.choiceButton,
                              ...(selected ? styles.choiceButtonSelected : null),
                            }}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div style={styles.submitBar}>
                <button onClick={submit} disabled={submitting} style={styles.submitButton}>
                  {submitting ? "Submitting..." : "Submit assessment"}
                </button>

                {submitError ? <span style={styles.submitError} role="alert">{submitError}</span> : null}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    padding: "var(--space-8) var(--space-4)",
  },
  shell: {
    width: "min(920px, 100%)",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "var(--space-4)",
    alignItems: "flex-end",
    marginBottom: "var(--space-5)",
    flexWrap: "wrap",
  },
  kicker: {
    margin: "0 0 var(--space-2) 0",
    color: "var(--accent-blue)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "var(--text-2xl)",
    lineHeight: 1.2,
    fontWeight: 600,
    letterSpacing: "-0.03em",
  },
  progressText: {
    padding: "var(--space-2) var(--space-3)",
    borderRadius: 6,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    overflow: "hidden",
    marginBottom: "var(--space-5)",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent-blue)",
    transition: "width 180ms ease",
  },
  identityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "var(--space-4)",
    marginBottom: "var(--space-5)",
  },
  label: {
    display: "grid",
    gap: "var(--space-2)",
  },
  labelText: {
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  input: {
    width: "100%",
    padding: "var(--space-3) var(--space-4)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    fontSize: "var(--text-base)",
    outline: "none",
  },
  panel: {
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    background: "var(--surface-1)",
    overflow: "hidden",
  },
  questionList: {
    display: "grid",
    gap: "var(--space-4)",
    padding: "var(--space-5)",
  },
  questionCard: {
    padding: "var(--space-5)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    background: "var(--surface-2)",
  },
  questionTitle: {
    display: "flex",
    gap: "var(--space-3)",
    margin: "0 0 var(--space-4) 0",
    color: "var(--text-primary)",
    fontSize: "var(--text-base)",
    lineHeight: 1.5,
    fontWeight: 600,
  },
  questionNumber: {
    color: "var(--accent-blue)",
    flex: "0 0 auto",
  },
  choiceGrid: {
    display: "grid",
    gap: "var(--space-2)",
  },
  choiceButton: {
    textAlign: "left",
    padding: "var(--space-3) var(--space-4)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-1)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    lineHeight: 1.5,
    transition: "all 160ms ease",
  },
  choiceButtonSelected: {
    border: "1px solid var(--accent-blue-dim)",
    background: "var(--accent-blue-glow)",
    color: "var(--text-primary)",
  },
  submitBar: {
    position: "sticky",
    bottom: 0,
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    flexWrap: "wrap",
    padding: "var(--space-4) var(--space-5)",
    borderTop: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
  },
  submitButton: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 6,
    border: "1px solid var(--accent-blue-dim)",
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitError: {
    color: "var(--color-error)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
  },
  stateBox: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-5)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    background: "var(--surface-1)",
  },
  stateText: {
    margin: 0,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2px solid var(--border-strong)",
    borderTopColor: "var(--accent-blue)",
    animation: "spin 0.7s linear infinite",
  },
  errorBox: {
    display: "grid",
    gap: "var(--space-2)",
    padding: "var(--space-5)",
    border: "1px solid rgba(196, 137, 137, 0.35)",
    borderRadius: 8,
    background: "rgba(196, 137, 137, 0.12)",
    color: "var(--color-error)",
  },
};
