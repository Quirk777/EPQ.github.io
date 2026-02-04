"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RiskCandidate {
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  risk_score: number;
  risk_level: string;
  assessed_at: string;
  factors_count?: number;
}

interface RiskFactor {
  factor: string;
  severity: string;
  description: string;
  value?: string | number | boolean;
}

interface RiskAssessment {
  candidate_id: number;
  candidate_name: string;
  risk_score: number;
  risk_level: string;
  factors: RiskFactor[];
  recommendations: string[];
  assessed_at: string;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
}

interface Statistics {
  total_assessed?: number;
  high_risk_count?: number;
  medium_risk_count?: number;
  low_risk_count?: number;
}

export default function AttritionClientNew() {
  const [highRiskCandidates, setHighRiskCandidates] = useState<RiskCandidate[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [detailedAssessment, setDetailedAssessment] = useState<RiskAssessment | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  useEffect(() => {
    loadHighRiskCandidates();
    loadStatistics();
    loadCandidates();
  }, []);

  const loadHighRiskCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/attrition/high-risk-candidates?limit=20", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setHighRiskCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error("Failed to load high-risk candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await fetch("/api/employer/attrition/statistics", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (err) {
      console.error("Failed to load statistics:", err);
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await fetch("/api/employer/candidates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    }
  };

  const handleCalculateRisk = async () => {
    if (!selectedCandidateId) return;

    setCalculating(true);
    try {
      const res = await fetch("/api/employer/attrition/calculate-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ candidate_id: selectedCandidateId })
      });

      if (res.ok) {
        await res.json();
        await loadDetailedAssessment(selectedCandidateId);
        await loadHighRiskCandidates();
        await loadStatistics();
        alert("Risk assessment completed successfully!");
      } else {
        alert("Failed to calculate risk");
      }
    } catch (err) {
      console.error("Failed to calculate risk:", err);
    } finally {
      setCalculating(false);
    }
  };

  const loadDetailedAssessment = async (candidateId: number) => {
    try {
      const res = await fetch(
        `/api/employer/attrition/risk-assessment/${candidateId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setDetailedAssessment(data);
        setShowAssessmentModal(true);
      }
    } catch (err) {
      console.error("Failed to load detailed assessment:", err);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return {
          bg: "var(--color-error)",
          text: "var(--text-primary)",
          border: "var(--border-subtle)",
          glow: "transparent"
        };
      case "medium":
        return {
          bg: "var(--color-warning)",
          text: "var(--text-primary)",
          border: "var(--border-subtle)",
          glow: "transparent"
        };
      case "low":
        return {
          bg: "var(--color-success)",
          text: "var(--text-primary)",
          border: "var(--border-subtle)",
          glow: "transparent"
        };
      default:
        return {
          bg: "var(--surface-4)",
          text: "var(--text-primary)",
          border: "var(--border-subtle)",
          glow: "transparent"
        };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "var(--color-error)";
      case "high":
        return "var(--color-warning)";
      case "medium":
        return "var(--accent-blue)";
      case "low":
        return "var(--color-success)";
      default:
        return "var(--surface-4)";
    }
  };

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>AR</span>
              </div>
              <div>
                <h1 style={s.title}>Attrition Risk Prediction</h1>
                <p style={s.subtitle}>AI-powered retention insights & risk analytics</p>
              </div>
            </div>

            <div style={s.headerActions}>
              <Link href="/employer/dashboard" style={s.btnGlass}>
                Dashboard
              </Link>
              <Link href="/employer/modules" style={s.btnGlass}>
                Modules
              </Link>
              <button style={s.btnPrimary}>
                Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={s.container}>
        {/* Statistics Dashboard */}
        {statistics && (
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>CA</span>
                <div style={{
                  ...s.badge,
                  background: "var(--accent-blue-glow)"
                }}>
                  Total
                </div>
              </div>
              <div style={s.statValue}>{statistics.total_assessed || 0}</div>
              <div style={s.statLabel}>Candidates Assessed</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: "100%",
                  background: "var(--accent-blue)"
                }}></div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>HR</span>
                <div style={{
                  ...s.badge,
                  background: "color-mix(in srgb, var(--color-error) 8%, transparent)"
                }}>
                  Alert
                </div>
              </div>
              <div style={s.statValue}>{statistics.high_risk_count || 0}</div>
              <div style={s.statLabel}>High Risk</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${((statistics.high_risk_count || 0) / Math.max(statistics.total_assessed || 1, 1)) * 100}%`,
                  background: "var(--color-error)"
                }}></div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>MR</span>
                <div style={{
                  ...s.badge,
                  background: "color-mix(in srgb, var(--color-warning) 8%, transparent)"
                }}>
                  Watch
                </div>
              </div>
              <div style={s.statValue}>{statistics.medium_risk_count || 0}</div>
              <div style={s.statLabel}>Medium Risk</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${((statistics.medium_risk_count || 0) / Math.max(statistics.total_assessed || 1, 1)) * 100}%`,
                  background: "var(--color-warning)"
                }}></div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>LR</span>
                <div style={{
                  ...s.badge,
                  background: "color-mix(in srgb, var(--color-success) 8%, transparent)"
                }}>
                  Stable
                </div>
              </div>
              <div style={s.statValue}>{statistics.low_risk_count || 0}</div>
              <div style={s.statLabel}>Low Risk</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${((statistics.low_risk_count || 0) / Math.max(statistics.total_assessed || 1, 1)) * 100}%`,
                  background: "var(--color-success)"
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Calculate New Risk */}
        <div style={s.calculateCard}>
          <div style={s.calculateHeader}>
            <div>
              <h2 style={s.calculateTitle}>Calculate New Risk Assessment</h2>
              <p style={s.calculateSubtitle}>Select a candidate to analyze attrition risk using AI</p>
            </div>
          </div>

          <div style={s.calculateContent}>
            <select
              value={selectedCandidateId || ""}
              onChange={(e) => setSelectedCandidateId(Number(e.target.value))}
              style={s.select}
            >
              <option value="">Select a candidate...</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>

            <button
              onClick={handleCalculateRisk}
              disabled={!selectedCandidateId || calculating}
              style={{
                ...s.btnPrimary,
                opacity: !selectedCandidateId || calculating ? 0.5 : 1,
                cursor: !selectedCandidateId || calculating ? "not-allowed" : "pointer"
              }}
            >
              {calculating ? (
                <>
                  <div style={s.spinner}></div>
                  Calculating Risk...
                </>
              ) : (
                <>Calculate Risk Score</>
              )}
            </button>
          </div>
        </div>

        {/* High Risk Candidates */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <h2 style={s.cardTitle}>High-Risk Candidates</h2>
              <p style={s.cardSubtitle}>Top {highRiskCandidates.length} candidates at risk of leaving</p>
            </div>
            <button onClick={loadHighRiskCandidates} style={s.btnGlass}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={s.loadingContainer}>
              <div style={s.spinnerLarge}></div>
              <p style={s.loadingText}>Loading risk assessments...</p>
            </div>
          ) : highRiskCandidates.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>OK</div>
              <div style={s.emptyText}>No high-risk candidates</div>
              <div style={s.emptyHint}>All candidates are within acceptable risk levels</div>
            </div>
          ) : (
            <div style={s.candidatesGrid}>
              {highRiskCandidates.map((candidate) => {
                const riskColor = getRiskColor(candidate.risk_level);
                const circumference = 2 * Math.PI * 45;
                const progress = (candidate.risk_score / 100) * circumference;

                return (
                  <div
                    key={candidate.candidate_id}
                    style={{
                      ...s.riskCard,
                      borderColor: riskColor.border,
                      boxShadow: `0 8px 32px ${riskColor.glow}`
                    }}
                  >
                    <div style={s.riskHeader}>
                      <div>
                        <div style={s.candidateName}>{candidate.candidate_name}</div>
                        <div style={s.candidateEmail}>{candidate.candidate_email}</div>
                      </div>
                      <div style={{
                        ...s.riskBadge,
                        background: riskColor.bg,
                        color: riskColor.text
                      }}>
                        {candidate.risk_level}
                      </div>
                    </div>

                    <div style={s.riskScoreContainer}>
                      <svg width="120" height="120" style={s.progressCircle}>
                        <circle
                          cx="60"
                          cy="60"
                          r="45"
                          fill="none"
                          stroke="var(--surface-3)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="45"
                          fill="none"
                          stroke={riskColor.text}
                          strokeWidth="8"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - progress}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                          style={{ transition: "stroke-dashoffset 1s ease-out" }}
                        />
                      </svg>
                      <div style={s.scoreOverlay}>
                        <div style={s.scoreValue}>{candidate.risk_score}</div>
                        <div style={s.scoreLabel}>Risk Score</div>
                      </div>
                    </div>

                    <div style={s.riskMeta}>
                      <div style={s.metaItem}>
                        <span style={s.metaIcon}>FC</span>
                        <span style={s.metaText}>{candidate.factors_count || 0} factors</span>
                      </div>
                      <div style={s.metaItem}>
                        <span style={s.metaIcon}>DT</span>
                        <span style={s.metaText}>
                          {new Date(candidate.assessed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => loadDetailedAssessment(candidate.candidate_id)}
                      style={s.btnViewDetails}
                    >
                      View Full Assessment
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Assessment Modal */}
      {showAssessmentModal && detailedAssessment && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Risk Assessment Details</h3>
                <p style={s.modalSubtitle}>{detailedAssessment.candidate_name}</p>
              </div>
              <button onClick={() => setShowAssessmentModal(false)} style={s.closeBtn}>
                ✕
              </button>
            </div>

            <div style={s.modalBody}>
              {/* Risk Score Display */}
              <div style={s.assessmentHeader}>
                <div style={s.scoreDisplay}>
                  <div style={s.scoreCircle}>
                    <div style={s.scoreLarge}>{detailedAssessment.risk_score}</div>
                    <div style={s.scoreText}>Risk Score</div>
                  </div>
                  <div style={{
                    ...s.levelBadgeLarge,
                    background: getRiskColor(detailedAssessment.risk_level).bg
                  }}>
                    {detailedAssessment.risk_level} Risk
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              <div style={s.section}>
                <h4 style={s.sectionTitle}>Risk Factors ({detailedAssessment.factors.length})</h4>
                <div style={s.factorsList}>
                  {detailedAssessment.factors.map((factor, idx) => (
                    <div key={idx} style={s.factorCard}>
                      <div style={s.factorHeader}>
                        <div style={s.factorName}>{factor.factor}</div>
                        <div style={{
                          ...s.severityBadge,
                          background: getSeverityColor(factor.severity)
                        }}>
                          {factor.severity}
                        </div>
                      </div>
                      <div style={s.factorDescription}>{factor.description}</div>
                      {factor.value !== undefined && (
                        <div style={s.factorValue}>
                          Value: <strong>{JSON.stringify(factor.value)}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div style={s.section}>
                <h4 style={s.sectionTitle}>AI Recommendations ({detailedAssessment.recommendations.length})</h4>
                <div style={s.recommendationsList}>
                  {detailedAssessment.recommendations.map((rec, idx) => (
                    <div key={idx} style={s.recommendationItem}>
                      <div style={s.recNumber}>{idx + 1}</div>
                      <div style={s.recText}>{rec}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment Metadata */}
              <div style={s.metadataFooter}>
                <div style={s.metadataItem}>
                  <span style={s.metaIcon}>DT</span>
                  <span>Assessed: {new Date(detailedAssessment.assessed_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative" as const,
    overflow: "auto" as const,
    paddingBottom: 80,
  },

  container: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 32px",
    position: "relative" as const,
    zIndex: 1,
  },

  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "var(--surface-2)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "20px 0",
    marginBottom: 32,
  },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap" as const,
  },

  branding: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
    display: "grid",
    placeItems: "center",
    border: "1px solid var(--border-subtle)",
  },

  icon: {
    fontSize: 14,
    fontWeight: 600,
  },

  title: {
    fontSize: 24,
    fontWeight: 600,
    margin: 0,
    color: "var(--text-primary)",
  },

  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    margin: "4px 0 0 0",
  },

  headerActions: {
    display: "flex",
    gap: 12,
  },

  btnGlass: {
    padding: "10px 20px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 180ms ease",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  btnPrimary: {
    padding: "10px 20px",
    borderRadius: 12,
    background: "var(--accent-blue)",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 24,
    marginBottom: 32,
  },

  statCard: {
    padding: 24,
    borderRadius: 20,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  statHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  statIcon: {
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 12px",
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  badge: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  statValue: {
    fontSize: 40,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },

  statLabel: {
    fontSize: 14,
    color: "var(--text-secondary)",
    fontWeight: 600,
    marginBottom: 12,
  },

  progressBar: {
    height: 8,
    borderRadius: 999,
    background: "var(--surface-3)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 180ms ease-out",
  },

  calculateCard: {
    padding: 32,
    borderRadius: 24,
    background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 32,
  },

  calculateHeader: {
    marginBottom: 24,
  },

  calculateTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 4px 0",
  },

  calculateSubtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    margin: 0,
  },

  calculateContent: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },

  select: {
    flex: 1,
    minWidth: 300,
    padding: "12px 16px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },

  card: {
    padding: 32,
    borderRadius: 24,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 32,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap" as const,
    gap: 16,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 4px 0",
  },

  cardSubtitle: {
    fontSize: 14,
    color: "var(--text-tertiary)",
    margin: 0,
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
    padding: 40,
  },

  spinner: {
    width: 20,
    height: 20,
    border: "3px solid var(--surface-3)",
    borderTop: "3px solid var(--accent-blue)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  spinnerLarge: {
    width: 48,
    height: 48,
    border: "4px solid var(--surface-3)",
    borderTop: "4px solid var(--color-error)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    fontSize: 15,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  emptyState: {
    padding: 60,
    textAlign: "center" as const,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "2px dashed var(--border-subtle)",
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },

  emptyHint: {
    fontSize: 14,
    color: "var(--text-tertiary)",
  },

  candidatesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
  },

  riskCard: {
    padding: 24,
    borderRadius: 20,
    background: "var(--surface-2)",
    border: "2px solid",
    transition: "all 180ms ease",
  },

  riskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  candidateName: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 4,
  },

  candidateEmail: {
    fontSize: 13,
    color: "var(--text-tertiary)",
  },

  riskBadge: {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },

  riskScoreContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative" as const,
    marginBottom: 20,
  },

  progressCircle: {
    filter: "drop-shadow(0 0 10px currentColor)",
  },

  scoreOverlay: {
    position: "absolute" as const,
    textAlign: "center" as const,
  },

  scoreValue: {
    fontSize: 32,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  scoreLabel: {
    fontSize: 11,
    color: "var(--text-secondary)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },

  riskMeta: {
    display: "flex",
    justifyContent: "space-around",
    gap: 12,
    marginBottom: 16,
    padding: "12px 0",
    borderTop: "1px solid var(--border-subtle)",
    borderBottom: "1px solid var(--border-subtle)",
  },

  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  metaIcon: {
    fontSize: 14,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 6,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  metaText: {
    fontSize: 13,
    color: "var(--text-primary)",
    fontWeight: 600,
  },

  btnViewDetails: {
    width: "100%",
    padding: "12px",
    borderRadius: 12,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  modal: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.8)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  modalContent: {
    width: "100%",
    maxWidth: 900,
    maxHeight: "90vh",
    borderRadius: 24,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column" as const,
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottom: "1px solid var(--border-subtle)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 4px 0",
  },

  modalSubtitle: {
    fontSize: 14,
    color: "var(--text-tertiary)",
    margin: 0,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 20,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },

  modalBody: {
    padding: 24,
    overflowY: "auto" as const,
    flex: 1,
  },

  assessmentHeader: {
    marginBottom: 32,
  },

  scoreDisplay: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    padding: 32,
    borderRadius: 16,
    background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
    border: "1px solid var(--border-subtle)",
  },

  scoreCircle: {
    textAlign: "center" as const,
  },

  scoreLarge: {
    fontSize: 64,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },

  scoreText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },

  levelBadgeLarge: {
    padding: "12px 24px",
    borderRadius: 999,
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
  },

  section: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 16,
  },

  factorsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  factorCard: {
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  factorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  factorName: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  severityBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
  },

  factorDescription: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    marginBottom: 8,
  },

  factorValue: {
    fontSize: 12,
    color: "var(--text-tertiary)",
  },

  recommendationsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  recommendationItem: {
    display: "flex",
    gap: 16,
    padding: 16,
    borderRadius: 12,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
  },

  recNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "var(--color-success)",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },

  recText: {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },

  metadataFooter: {
    display: "flex",
    gap: 24,
    paddingTop: 16,
    borderTop: "1px solid var(--border-subtle)",
  },

  metadataItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--text-secondary)",
  },
};
