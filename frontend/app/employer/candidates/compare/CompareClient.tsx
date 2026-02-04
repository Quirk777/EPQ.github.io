"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Candidate = {
  candidate_id: string;
  name: string;
  email: string;
  scores?: Record<string, number>;
  responses?: Record<string, { score: number; text: string }>;
  created_at?: string;
};

const ENVIRONMENT_DIMENSIONS = [
  { id: "autonomy", label: "Decision-Making Autonomy" },
  { id: "pace", label: "Work Pace" },
  { id: "structure", label: "Process Structure" },
  { id: "collaboration", label: "Collaboration Style" },
  { id: "innovation", label: "Innovation vs. Execution" },
  { id: "ambiguity", label: "Ambiguity Tolerance" }
];

export default function CompareClient() {
  const searchParams = useSearchParams();
  
  // Memoize candidateIds to prevent re-creating the array on every render
  const candidateIds = useMemo(() => {
    return searchParams?.get("ids")?.split(",") || [];
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roleEnvironment, setRoleEnvironment] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (candidateIds.length === 0) return;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Load all candidates in parallel
        const candidatePromises = candidateIds.map(id =>
          fetch(`/api/employer/candidates/${id}`, { credentials: "include" }).then(r => r.json())
        );

        const candidateData = await Promise.all(candidatePromises);
        
        // Mock: Extract scores from responses (you'll compute these from actual assessment data)
        // Use candidate_id as seed to generate consistent scores (prevents flickering)
        const processedCandidates = candidateData.map(c => ({
          ...c,
          scores: extractEnvironmentScores(c.candidate_id)
        }));

        setCandidates(processedCandidates);

        // Mock: Load role environment settings (you'll fetch from actual role)
        setRoleEnvironment({
          autonomy: 70,
          pace: 60,
          structure: 45,
          collaboration: 75,
          innovation: 55,
          ambiguity: 50
        });

      } catch (e: unknown) {
        const error = e as Error;
        setError(error.message || "Failed to load candidates");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [candidateIds]);

  function extractEnvironmentScores(candidateId: string): Record<string, number> {
    // Use candidateId as seed to generate consistent scores (prevents flickering)
    // This is a mock - replace with actual psychometric calculation
    const seed = candidateId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    function seededRandom(index: number) {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    }

    return {
      autonomy: Math.floor(seededRandom(1) * 40) + 50,
      pace: Math.floor(seededRandom(2) * 40) + 50,
      structure: Math.floor(seededRandom(3) * 40) + 50,
      collaboration: Math.floor(seededRandom(4) * 40) + 50,
      innovation: Math.floor(seededRandom(5) * 40) + 50,
      ambiguity: Math.floor(seededRandom(6) * 40) + 50
    };
  }

  function calculateAlignment(roleValue: number, candidateValue: number): number {
    const diff = Math.abs(roleValue - candidateValue);
    return Math.max(0, 100 - diff);
  }

  function getAlignmentColor(alignment: number): string {
    if (alignment >= 80) return "#16a34a";
    if (alignment >= 60) return "#3b82f6";
    if (alignment >= 40) return "#f59e0b";
    return "#dc2626";
  }

  function getTradeoffInsights(candidates: Candidate[]): string[] {
    if (candidates.length < 2) return [];

    const insights: string[] = [];
    const [c1, c2] = candidates;

    ENVIRONMENT_DIMENSIONS.forEach(dim => {
      const score1 = c1.scores?.[dim.id] || 0;
      const score2 = c2.scores?.[dim.id] || 0;
      const diff = Math.abs(score1 - score2);

      if (diff > 25) {
        const higher = score1 > score2 ? c1.name : c2.name;
        const lower = score1 > score2 ? c2.name : c1.name;
        
        if (dim.id === "autonomy") {
          insights.push(`${higher} prefers independent decision-making, while ${lower} works better with guidance.`);
        } else if (dim.id === "pace") {
          insights.push(`${higher} thrives in intense environments, while ${lower} prefers steady progress.`);
        } else if (dim.id === "collaboration") {
          insights.push(`${higher} is team-oriented, while ${lower} excels in solo work.`);
        }
      }
    });

    return insights;
  }

  const tradeoffs = getTradeoffInsights(candidates);

  if (candidateIds.length === 0) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <div style={s.empty}>
            <h1 style={s.emptyTitle}>No Candidates Selected</h1>
            <p style={s.emptyText}>
              Go back to the dashboard and select candidates to compare.
            </p>
            <Link href="/employer/dashboard" style={s.btnPrimary}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <div style={s.loading}>Loading comparison...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <div style={s.error}>{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <header style={s.header}>
          <div>
            <h1 style={s.title}>Candidate Comparison</h1>
            <p style={s.subtitle}>
              Environment alignment analysis for {candidates.length} candidates
            </p>
          </div>
          <Link href="/employer/dashboard" style={s.btnOutline}>
            ← Back to Dashboard
          </Link>
        </header>

        {/* Comparison Grid */}
        <div style={s.compareGrid}>
          {/* Role Column */}
          <div style={s.roleColumn}>
            <div style={s.candidateHeader}>
              <div style={s.roleTitle}>Role Requirements</div>
              <div style={s.roleBadge}>Target Environment</div>
            </div>
            <div style={s.metricsWrap}>
              {ENVIRONMENT_DIMENSIONS.map(dim => (
                <div key={dim.id} style={s.metricRow}>
                  <div style={s.metricLabel}>{dim.label}</div>
                  <div style={s.metricBar}>
                    <div style={{...s.metricBarFill, width: `${roleEnvironment[dim.id]}%`, background: "#94a3b8"}} />
                  </div>
                  <div style={s.metricValue}>{roleEnvironment[dim.id]}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate Columns */}
          {candidates.map((candidate) => (
            <div key={candidate.candidate_id} style={s.candidateColumn}>
              <div style={s.candidateHeader}>
                <div style={s.candidateName}>{candidate.name}</div>
                <div style={s.candidateEmail}>{candidate.email}</div>
              </div>

              <div style={s.metricsWrap}>
                {ENVIRONMENT_DIMENSIONS.map(dim => {
                  const candidateScore = candidate.scores?.[dim.id] || 0;
                  const roleScore = roleEnvironment[dim.id] || 0;
                  const alignment = calculateAlignment(roleScore, candidateScore);
                  const color = getAlignmentColor(alignment);

                  return (
                    <div key={dim.id} style={s.metricRow}>
                      <div style={s.metricLabel}>{dim.label}</div>
                      <div style={s.metricBar}>
                        <div style={{...s.metricBarFill, width: `${candidateScore}%`, background: color}} />
                      </div>
                      <div style={{...s.metricValue, color}}>
                        {candidateScore}% <span style={s.alignment}>({alignment}% match)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall Alignment Score */}
              <div style={s.overallScore}>
                <div style={s.overallLabel}>Overall Alignment</div>
                <div style={s.overallValue}>
                  {Math.round(
                    ENVIRONMENT_DIMENSIONS.reduce((sum, dim) => {
                      const candidateScore = candidate.scores?.[dim.id] || 0;
                      const roleScore = roleEnvironment[dim.id] || 0;
                      return sum + calculateAlignment(roleScore, candidateScore);
                    }, 0) / ENVIRONMENT_DIMENSIONS.length
                  )}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Strength Analysis */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Strength Analysis</h2>
          <div style={s.strengthGrid}>
            {candidates.map((candidate) => (
              <div key={candidate.candidate_id} style={s.strengthCard}>
                <div style={s.strengthHeader}>{candidate.name}</div>
                <div style={s.strengthList}>
                  {ENVIRONMENT_DIMENSIONS.map(dim => {
                    const candidateScore = candidate.scores?.[dim.id] || 0;
                    const roleScore = roleEnvironment[dim.id] || 0;
                    const alignment = calculateAlignment(roleScore, candidateScore);

                    if (alignment >= 80) {
                      return (
                        <div key={dim.id} style={s.strengthItem}>
                          <span style={s.strengthIcon}>✓</span>
                          <span style={s.strengthText}>Strong {dim.label.toLowerCase()} match</span>
                        </div>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                  
                  {ENVIRONMENT_DIMENSIONS.every(dim => {
                    const candidateScore = candidate.scores?.[dim.id] || 0;
                    const roleScore = roleEnvironment[dim.id] || 0;
                    return calculateAlignment(roleScore, candidateScore) < 80;
                  }) && (
                    <div style={s.strengthItem}>
                      <span style={s.strengthIcon}>⚠️</span>
                      <span style={s.strengthText}>Consider management adaptations</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade-off Insights */}
        {tradeoffs.length > 0 && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Trade-off Insights</h2>
            <div style={s.insightsCard}>
              <p style={s.insightsIntro}>
                These candidates have different strengths. Here&apos;s what to consider:
              </p>
              {tradeoffs.map((insight, i) => (
                <div key={i} style={s.insightItem}>
                  <span style={s.insightBullet}>→</span>
                  <span style={s.insightText}>{insight}</span>
                </div>
              ))}
              <div style={s.insightsFooter}>
                💡 <strong>Remember:</strong> Different doesn&apos;t mean worse. Consider which trade-offs
                align with your team&apos;s current needs and what management support you can provide.
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Hiring Recommendations</h2>
          <div style={s.recommendCard}>
            <p style={s.recommendText}>
              <strong>This is not a &quot;hire/no hire&quot; decision.</strong> Instead, use this comparison to:
            </p>
            <ul style={s.recommendList}>
              <li>Understand which candidate fits your <em>current</em> environment better</li>
              <li>Identify what management adaptations might be needed</li>
              <li>Facilitate better hiring discussions with your team</li>
              <li>Plan onboarding strategies for the first 90 days</li>
            </ul>
            <p style={s.recommendText}>
              Consider: &quot;If we hired Candidate A, what would we need to change in how we work?&quot;
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <Link href="/employer/dashboard" style={s.btnOutline}>
            ← Back to All Candidates
          </Link>
          <button style={s.btnPrimary}>
            Download Comparison Report
          </button>
        </div>
      </div>
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px 0 64px",
  } as const,

  container: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 24px",
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
    fontSize: 32,
    fontWeight: 900,
    color: "#0f172a",
  } as const,

  subtitle: {
    margin: "8px 0 0 0",
    fontSize: 16,
    color: "#64748b",
  } as const,

  btnOutline: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    background: "#fff",
    color: "#1e293b",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 14,
    display: "inline-block",
    cursor: "pointer",
  } as const,

  btnPrimary: {
    padding: "12px 24px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  } as const,

  loading: {
    padding: 48,
    textAlign: "center" as const,
    fontSize: 18,
    color: "#64748b",
  },

  error: {
    padding: 24,
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontWeight: 600,
  } as const,

  empty: {
    padding: 64,
    textAlign: "center" as const,
  },

  emptyTitle: {
    margin: "0 0 12px 0",
    fontSize: 28,
    fontWeight: 900,
  } as const,

  emptyText: {
    margin: "0 0 24px 0",
    fontSize: 16,
    color: "#64748b",
  } as const,

  compareGrid: {
    display: "grid",
    gridTemplateColumns: "300px repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    marginBottom: 40,
  } as const,

  roleColumn: {
    background: "#f1f5f9",
    borderRadius: 16,
    border: "2px solid #cbd5e1",
    padding: 24,
  } as const,

  candidateColumn: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 24,
  } as const,

  candidateHeader: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: "1px solid #e2e8f0",
  } as const,

  roleTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 8,
  } as const,

  roleBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 12,
    background: "#cbd5e1",
    color: "#1e293b",
    fontSize: 12,
    fontWeight: 800,
  } as const,

  candidateName: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 4,
  } as const,

  candidateEmail: {
    fontSize: 13,
    color: "#64748b",
  } as const,

  metricsWrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },

  metricRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  } as const,

  metricLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
  } as const,

  metricBar: {
    height: 12,
    borderRadius: 6,
    background: "#e2e8f0",
    overflow: "hidden",
  } as const,

  metricBarFill: {
    height: "100%",
    transition: "width 0.3s",
  } as const,

  metricValue: {
    fontSize: 14,
    fontWeight: 900,
  } as const,

  alignment: {
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.7,
  } as const,

  overallScore: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
    textAlign: "center" as const,
  },

  overallLabel: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    opacity: 0.9,
  } as const,

  overallValue: {
    fontSize: 36,
    fontWeight: 900,
  } as const,

  section: {
    marginBottom: 40,
  } as const,

  sectionTitle: {
    margin: "0 0 20px 0",
    fontSize: 24,
    fontWeight: 900,
    color: "#0f172a",
  } as const,

  strengthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
  } as const,

  strengthCard: {
    padding: 24,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #e2e8f0",
  } as const,

  strengthHeader: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 16,
  } as const,

  strengthList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  strengthItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as const,

  strengthIcon: {
    fontSize: 16,
  } as const,

  strengthText: {
    fontSize: 14,
    color: "#475569",
  } as const,

  insightsCard: {
    padding: 28,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #e2e8f0",
  } as const,

  insightsIntro: {
    margin: "0 0 20px 0",
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.6,
  } as const,

  insightItem: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    background: "#f8fafc",
  } as const,

  insightBullet: {
    fontSize: 18,
    color: "#3b82f6",
    fontWeight: 900,
    flexShrink: 0,
  } as const,

  insightText: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 1.6,
  } as const,

  insightsFooter: {
    marginTop: 20,
    padding: 16,
    borderRadius: 10,
    background: "#fef3c7",
    border: "1px solid #fde047",
    fontSize: 14,
    color: "#78350f",
    lineHeight: 1.6,
  } as const,

  recommendCard: {
    padding: 28,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #e2e8f0",
  } as const,

  recommendText: {
    margin: "0 0 16px 0",
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.6,
  } as const,

  recommendList: {
    margin: "0 0 16px 0",
    paddingLeft: 24,
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.8,
  } as const,

  actions: {
    display: "flex",
    gap: 16,
    justifyContent: "flex-end",
    marginTop: 40,
  } as const,
};
