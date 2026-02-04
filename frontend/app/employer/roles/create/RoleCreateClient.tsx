"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EnvironmentSlider = {
  id: string;
  label: string;
  left: string;
  right: string;
  value: number;
  description: string;
  tradeoffs: { low: string; high: string };
};

export default function RoleCreateClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add mobile-responsive styles to document head
  if (typeof window !== "undefined" && !document.getElementById("role-create-mobile-styles")) {
    const style = document.createElement("style");
    style.id = "role-create-mobile-styles";
    style.textContent = `
      @media (max-width: 768px) {
        input[type="range"] {
          height: 24px !important;
          touch-action: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          width: 36px !important;
          height: 36px !important;
        }
        input[type="range"]::-moz-range-thumb {
          width: 36px !important;
          height: 36px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Step 1: Basic Info
  const [roleTitle, setRoleTitle] = useState("");
  const [team, setTeam] = useState("");
  const [level, setLevel] = useState("");
  const [hiringManager, setHiringManager] = useState("");

  // Step 2: Environment Definition (the twist!)
  const [environment, setEnvironment] = useState<EnvironmentSlider[]>([
    {
      id: "autonomy",
      label: "Decision-Making Autonomy",
      left: "Guided",
      right: "Independent",
      value: 50,
      description: "How much independent decision-making is expected?",
      tradeoffs: {
        low: "More supervision required, slower ramp-up",
        high: "Less oversight, potential for misalignment"
      }
    },
    {
      id: "pace",
      label: "Work Pace",
      left: "Steady",
      right: "Intense",
      value: 50,
      description: "What's the expected speed and intensity?",
      tradeoffs: {
        low: "Lower stress, potentially slower results",
        high: "Faster delivery, risk of burnout"
      }
    },
    {
      id: "structure",
      label: "Process Structure",
      left: "Flexible",
      right: "Structured",
      value: 50,
      description: "How defined are the workflows?",
      tradeoffs: {
        low: "Creative freedom, less predictability",
        high: "Clear expectations, less innovation"
      }
    },
    {
      id: "collaboration",
      label: "Collaboration Style",
      left: "Solo",
      right: "Team-Heavy",
      value: 50,
      description: "How much teamwork vs. independent work?",
      tradeoffs: {
        low: "More focus time, potential silos",
        high: "Better alignment, more meetings"
      }
    },
    {
      id: "innovation",
      label: "Innovation vs. Execution",
      left: "Execution",
      right: "Innovation",
      value: 50,
      description: "Should they optimize existing processes or create new ones?",
      tradeoffs: {
        low: "Stable output, less disruption",
        high: "Breakthrough ideas, more uncertainty"
      }
    },
    {
      id: "ambiguity",
      label: "Ambiguity Tolerance",
      left: "Clear Goals",
      right: "Ambiguous",
      value: 50,
      description: "How well-defined are the objectives?",
      tradeoffs: {
        low: "Easier onboarding, limited growth",
        high: "High growth, more stress"
      }
    }
  ]);

  // Step 3: Review & Conflicts
  const [conflicts, setConflicts] = useState<string[]>([]);

  function updateEnvironment(id: string, value: number) {
    setEnvironment(prev =>
      prev.map(env => (env.id === id ? { ...env, value } : env))
    );
  }

  function detectConflicts() {
    const conf: string[] = [];
    const vals = Object.fromEntries(environment.map(e => [e.id, e.value]));

    // Example conflicts
    if (vals.autonomy > 70 && vals.structure > 70) {
      conf.push("High autonomy + high structure may create frustration");
    }
    if (vals.pace > 75 && vals.collaboration > 70) {
      conf.push("Intense pace + heavy collaboration often leads to meeting overload");
    }
    if (vals.innovation > 70 && vals.pace > 75) {
      conf.push("High innovation + intense pace can cause rushed decisions");
    }
    if (vals.ambiguity > 70 && vals.structure > 70) {
      conf.push("⚠️ High ambiguity + structured processes is contradictory");
    }

    setConflicts(conf);
  }

  function handleStep2Next() {
    detectConflicts();
    setStep(3);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: roleTitle,
        team,
        level,
        hiring_manager: hiringManager,
        environment: Object.fromEntries(environment.map(e => [e.id, e.value])),
        environment_confidence: conflicts.length === 0 ? "high" : "medium",
        environment_conflicts: conflicts
      };

      const res = await fetch("/api/employer/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create role");
      }

      router.push("/employer/modules");
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.container}>
      {/* Header */}
        <header style={s.header}>
          <div>
            <h1 style={s.title}>Create New Role</h1>
            <p style={s.subtitle}>
              Define your role with an environment-first approach
            </p>
          </div>
          <Link href="/employer/modules" style={s.btnOutline}>
            ← Back to Modules
          </Link>
        </header>

        {/* Progress Steps */}
        <div style={s.progress}>
          <div style={step >= 1 ? {...s.progressStep, ...s.progressStepActive} : s.progressStep}>
            <div style={s.progressNumber}>1</div>
            <div style={s.progressLabel}>Basic Info</div>
          </div>
          <div style={s.progressLine} />
          <div style={step >= 2 ? {...s.progressStep, ...s.progressStepActive} : s.progressStep}>
            <div style={s.progressNumber}>2</div>
            <div style={s.progressLabel}>Environment</div>
          </div>
          <div style={s.progressLine} />
          <div style={step >= 3 ? {...s.progressStep, ...s.progressStepActive} : s.progressStep}>
            <div style={s.progressNumber}>3</div>
            <div style={s.progressLabel}>Review</div>
          </div>
        </div>

        {error && (
          <div style={s.error}>
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={s.card} className="texture-surface-2">
            <h2 style={s.cardTitle}>Role Information</h2>
            <div style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Role Title *</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  style={s.input}
                />
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label}>Team</label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="e.g., Engineering"
                    style={s.input}
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} style={s.input}>
                    <option value="">Select level</option>
                    <option value="Entry">Entry Level</option>
                    <option value="Mid">Mid Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Executive">Executive</option>
                  </select>
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Hiring Manager</label>
                <input
                  type="text"
                  value={hiringManager}
                  onChange={(e) => setHiringManager(e.target.value)}
                  placeholder="Name or email"
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.actions}>
              <button
                onClick={() => setStep(2)}
                disabled={!roleTitle}
                style={!roleTitle ? {...s.btnPrimary, opacity: 0.5, cursor: "not-allowed"} : s.btnPrimary}
              >
                Next: Define Environment →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Environment Sliders */}
        {step === 2 && (
          <div style={s.card} className="texture-surface-2">
            <h2 style={s.cardTitle}>Define the Work Environment</h2>
            <p style={s.cardDesc}>
              Use the sliders below to define what this role actually requires. 
              This helps identify candidates who&apos;ll thrive in this specific environment.
            </p>

            <div style={s.sliders}>
              {environment.map((env) => (
                <div key={env.id} style={s.sliderCard}>
                  <div style={s.sliderHeader}>
                    <div style={s.sliderLabel}>{env.label}</div>
                    <div style={s.sliderValue}>{env.value}%</div>
                  </div>
                  <div style={s.sliderDesc}>{env.description}</div>

                  <div style={s.sliderWrap}>
                    <div style={s.sliderLeft}>{env.left}</div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={env.value}
                      onChange={(e) => updateEnvironment(env.id, parseInt(e.target.value))}
                      style={s.slider}
                    />
                    <div style={s.sliderRight}>{env.right}</div>
                  </div>

                  <div style={s.tradeoffs}>
                    <div style={s.tradeoff}>
                      <div style={s.tradeoffLabel}>If LOW:</div>
                      <div style={s.tradeoffText}>{env.tradeoffs.low}</div>
                    </div>
                    <div style={s.tradeoff}>
                      <div style={s.tradeoffLabel}>If HIGH:</div>
                      <div style={s.tradeoffText}>{env.tradeoffs.high}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={s.actions}>
              <button onClick={() => setStep(1)} style={s.btnOutline}>
                ← Back
              </button>
              <button onClick={handleStep2Next} style={s.btnPrimary}>
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div style={s.card} className="texture-surface-2">
            <h2 style={s.cardTitle}>Review & Create</h2>
            
            {/* Role Summary */}
            <div style={s.summary}>
              <h3 style={s.summaryTitle}>Role Summary</h3>
              <div style={s.summaryGrid}>
                <div style={s.summaryItem}>
                  <div style={s.summaryLabel}>Title</div>
                  <div style={s.summaryValue}>{roleTitle}</div>
                </div>
                <div style={s.summaryItem}>
                  <div style={s.summaryLabel}>Team</div>
                  <div style={s.summaryValue}>{team || "—"}</div>
                </div>
                <div style={s.summaryItem}>
                  <div style={s.summaryLabel}>Level</div>
                  <div style={s.summaryValue}>{level || "—"}</div>
                </div>
                <div style={s.summaryItem}>
                  <div style={s.summaryLabel}>Hiring Manager</div>
                  <div style={s.summaryValue}>{hiringManager || "—"}</div>
                </div>
              </div>
            </div>

            {/* Environment Profile */}
            <div style={s.summary}>
              <h3 style={s.summaryTitle}>Environment Profile</h3>
              <div style={s.envGrid}>
                {environment.map(env => (
                  <div key={env.id} style={s.envItem}>
                    <div style={s.envItemLabel}>{env.label}</div>
                    <div style={s.envBar}>
                      <div style={{...s.envBarFill, width: `${env.value}%`}} />
                    </div>
                    <div style={s.envItemValue}>{env.value}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <div style={s.conflictsWrap}>
                <div style={s.conflictsTitle}>Potential Conflicts Detected</div>
                {conflicts.map((c, i) => (
                  <div key={i} style={s.conflictItem}>{c}</div>
                ))}
                <div style={s.conflictsNote}>
                  These aren&apos;t errors—they&apos;re insights. Consider adjusting sliders or planning management adaptations.
                </div>
              </div>
            )}

            <div style={s.actions}>
              <button onClick={() => setStep(2)} style={s.btnOutline}>
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={s.btnPrimary}
              >
                {loading ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        )}
      </div>
  );
}

const s = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "var(--space-8) var(--space-6)",
  } as const,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    gap: 16,
    flexWrap: "wrap" as const,
  },

  title: {
    margin: 0,
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.03em",
  } as const,

  subtitle: {
    margin: "var(--space-2) 0 0 0",
    fontSize: "var(--text-base)",
    color: "var(--text-secondary)",
  } as const,

  btnOutline: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    display: "inline-block",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  } as const,

  btnPrimary: {
    padding: "var(--space-3) var(--space-6)",
    borderRadius: 6,
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    border: "1px solid var(--accent-blue-dim)",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  } as const,

  progress: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    gap: 16,
  } as const,

  progressStep: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    opacity: 0.4,
  },

  progressStepActive: {
    opacity: 1,
  } as const,

  progressNumber: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#64748b",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: 16,
  } as const,

  progressLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
  } as const,

  progressLine: {
    width: 80,
    height: 2,
    background: "#e2e8f0",
  } as const,

  error: {
    padding: 16,
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    marginBottom: 24,
    fontWeight: 600,
  } as const,

  card: {
    background: "var(--surface-2)",
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
    padding: "var(--space-8)",
  } as const,

  cardTitle: {
    margin: "0 0 var(--space-2) 0",
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: "-0.01em",
  } as const,

  cardDesc: {
    margin: "0 0 28px 0",
    fontSize: 15,
    color: "#64748b",
    lineHeight: 1.6,
  } as const,

  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },

  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    flex: 1,
  } as const,

  fieldRow: {
    display: "flex",
    gap: 16,
  } as const,

  label: {
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--text-primary)",
  } as const,

  input: {
    padding: "var(--space-3) var(--space-4)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    fontSize: "var(--text-sm)",
    fontFamily: "inherit",
    outline: "none",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
  } as const,

  sliders: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },

  sliderCard: {
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-1)",
    border: "1px solid var(--border-subtle)",
  } as const,

  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  } as const,

  sliderLabel: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  sliderValue: {
    fontSize: 18,
    fontWeight: 900,
    color: "#3b82f6",
  } as const,

  sliderDesc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  } as const,

  sliderWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  } as const,

  sliderLeft: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    minWidth: 80,
    textAlign: "right" as const,
  },

  sliderRight: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    minWidth: 80,
  } as const,

  slider: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    background: "#e2e8f0",
    outline: "none",
    appearance: "none" as const,
  } as const,

  tradeoffs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  } as const,

  tradeoff: {
    padding: 12,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid #e2e8f0",
  } as const,

  tradeoffLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },

  tradeoffText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.4,
  } as const,

  summary: {
    marginBottom: 28,
    padding: 20,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  } as const,

  summaryTitle: {
    margin: "0 0 16px 0",
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  } as const,

  summaryItem: {} as const,

  summaryLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
    marginBottom: 4,
  } as const,

  summaryValue: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  envGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  envItem: {
    display: "grid",
    gridTemplateColumns: "180px 1fr 60px",
    gap: 12,
    alignItems: "center",
  } as const,

  envItemLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
  } as const,

  envBar: {
    height: 10,
    borderRadius: 5,
    background: "#e2e8f0",
    overflow: "hidden",
  } as const,

  envBarFill: {
    height: "100%",
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    transition: "width 0.3s",
  } as const,

  envItemValue: {
    fontSize: 14,
    fontWeight: 900,
    color: "#3b82f6",
    textAlign: "right" as const,
  },

  conflictsWrap: {
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--color-warning-bg, rgba(196, 176, 137, 0.1))",
    border: "1px solid var(--color-warning, #c4b089)",
    marginBottom: "var(--space-7)",
  } as const,

  conflictsTitle: {
    fontSize: "var(--text-base)",
    fontWeight: 600,
    color: "var(--color-warning, #c4b089)",
    marginBottom: "var(--space-3)",
  } as const,

  conflictItem: {
    fontSize: "var(--text-sm)",
    color: "var(--color-warning, #c4b089)",
    marginBottom: "var(--space-2)",
    paddingLeft: "var(--space-5)",
  } as const,

  conflictsNote: {
    marginTop: "var(--space-3)",
    fontSize: "var(--text-xs)",
    color: "var(--text-secondary)",
    fontStyle: "italic" as const,
  },

  actions: {
    display: "flex",
    gap: "var(--space-3)",
    justifyContent: "flex-end",
    marginTop: "var(--space-7)",
  } as const,
};
