"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TeamProfile {
  team_size: number;
  averages: Record<string, number>;
  std_devs: Record<string, number>;
  members: Array<{
    id: string;
    name: string;
    scores: Record<string, number>;
  }>;
}

interface FitAnalysis {
  fit_score: number;
  candidate_name: string;
  team_size: number;
  construct_comparison: Record<string, {
    candidate_score: number;
    team_average: number;
    team_std_dev: number;
    difference: number;
    fit_score: number;
    interpretation: string;
  }>;
  diversity_impact: Record<string, {
    current_avg: number;
    new_avg: number;
    shift: number;
    direction: string;
    magnitude: string;
  }>;
  insights: {
    overall_assessment: string;
    strengths: Array<{ construct: string; message: string }>;
    concerns: Array<{ construct: string; message: string }>;
    diversity_note: string;
  };
}

const CONSTRUCT_NAMES: Record<string, string> = {
  SCL: "Structure",
  CCD: "Collaboration",
  CIL: "Innovation",
  CVL: "Communication",
  ERL: "Emotional Expression",
  MSD: "Values",
  ICI: "Work Style",
  AJL: "Autonomy"
};

const CONSTRUCT_ICONS: Record<string, string> = {
  SCL: "ST",
  CCD: "CO",
  CIL: "IN",
  CVL: "CM",
  ERL: "EM",
  MSD: "VA",
  ICI: "WS",
  AJL: "AU"
};

export default function TeamFitClientNew() {
  const [teamProfile, setTeamProfile] = useState<TeamProfile | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamProfile();
    loadCandidates();
  }, []);

  async function loadTeamProfile() {
    try {
      const res = await fetch("/api/employer/team-fit/profile", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTeamProfile(data);
      }
    } catch (error) {
      console.error("Failed to load team profile:", error);
    }
  }

  async function loadCandidates() {
    try {
      const res = await fetch("/api/employer/candidates", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error("Failed to load candidates:", error);
    }
  }

  async function analyzeCandidateFit(candidateId: string) {
    if (!candidateId) return;
    
    setLoading(true);
    setSelectedCandidate(candidateId);
    try {
      const res = await fetch(`/api/employer/team-fit/candidate/${candidateId}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setFitAnalysis(data);
      }
    } catch (error) {
      console.error("Failed to analyze fit:", error);
    } finally {
      setLoading(false);
    }
  }

  function getFitColor(score: number): { bg: string; text: string; label: string } {
    if (score >= 85) return { bg: "var(--color-success)", text: "var(--color-success)", label: "Excellent Fit" };
    if (score >= 70) return { bg: "var(--accent-blue)", text: "var(--accent-blue)", label: "Good Fit" };
    if (score >= 55) return { bg: "var(--color-warning)", text: "var(--color-warning)", label: "Moderate Fit" };
    return { bg: "var(--color-error)", text: "var(--color-error)", label: "Low Fit" };
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>TF</span>
              </div>
              <div>
                <h1 style={s.title}>Team Fit Prediction</h1>
                <p style={s.subtitle}>AI-powered compatibility & cultural alignment analysis</p>
              </div>
            </div>

            <div style={s.headerActions}>
              <Link href="/employer/dashboard" style={s.btnGlass}>
                Dashboard
              </Link>
              <Link href="/employer/modules" style={s.btnGlass}>
                Modules
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div style={s.container}>
        {/* Team Overview Stats */}
        {teamProfile && teamProfile.team_size > 0 ? (
          <>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>TM</span>
                  <div style={{
                    ...s.badge,
                    background: "var(--accent-blue-glow)"
                  }}>
                    Active
                  </div>
                </div>
                <div style={s.statValue}>{teamProfile.team_size}</div>
                <div style={s.statLabel}>Team Members</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "85%",
                    background: "var(--accent-blue)"
                  }}></div>
                </div>
              </div>

              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>DA</span>
                  <div style={{
                    ...s.badge,
                    background: "var(--color-success)",
                    opacity: 0.15
                  }}>
                    Complete
                  </div>
                </div>
                <div style={s.statValue}>{Object.keys(teamProfile.averages).length}</div>
                <div style={s.statLabel}>Dimensions Analyzed</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "100%",
                    background: "var(--color-success)"
                  }}></div>
                </div>
              </div>

              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>CA</span>
                  <div style={{
                    ...s.badge,
                    background: "var(--accent-lavender-glow)"
                  }}>
                    AI Ready
                  </div>
                </div>
                <div style={s.statValue}>{candidates.length}</div>
                <div style={s.statLabel}>Candidates Available</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "92%",
                    background: "var(--accent-lavender)"
                  }}></div>
                </div>
              </div>
            </div>

            {/* Candidate Selection */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <h2 style={s.cardTitle}>Analyze Candidate Fit</h2>
                  <p style={s.cardSubtitle}>Select a candidate to predict team compatibility</p>
                </div>
              </div>

              <div style={s.selectContainer}>
                <label style={s.label}>Select Candidate</label>
                <select
                  value={selectedCandidate}
                  onChange={(e) => analyzeCandidateFit(e.target.value)}
                  style={s.select}
                  disabled={loading}
                >
                  <option value="">-- Choose a candidate --</option>
                  {candidates.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </div>

              {loading && (
                <div style={s.loadingContainer}>
                  <div style={s.spinner}></div>
                  <p style={s.loadingText}>Analyzing team fit with AI...</p>
                </div>
              )}
            </div>

            {/* Fit Analysis Results */}
            {fitAnalysis && (
              <>
                {/* Overall Fit Score */}
                <div style={{
                  ...s.fitScoreCard,
                  background: getFitColor(fitAnalysis.fit_score).bg,
                  opacity: 0.15
                }}>
                  <div style={s.fitScoreContent}>
                    <div>
                      <div style={s.fitScoreLabel}>Overall Team Fit Score</div>
                      <div style={s.fitScoreName}>{fitAnalysis.candidate_name}</div>
                    </div>
                    <div style={s.fitScoreCircle}>
                      <svg style={s.fitScoreSvg} viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="var(--surface-3)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="8"
                          strokeDasharray={`${fitAnalysis.fit_score * 2.83} 283`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div style={s.fitScoreNumber}>{Math.round(fitAnalysis.fit_score)}</div>
                    </div>
                  </div>
                  <div style={s.fitScoreFooter}>
                    <span style={s.fitScoreBadge}>{getFitColor(fitAnalysis.fit_score).label}</span>
                    <span style={s.fitScoreTeam}>Team of {fitAnalysis.team_size} members</span>
                  </div>
                </div>

                {/* Dimension Comparison */}
                <div style={s.card}>
                  <div style={s.cardHeader}>
                    <h2 style={s.cardTitle}>8-Dimension Compatibility Analysis</h2>
                    <p style={s.cardSubtitle}>Detailed breakdown of work environment preferences</p>
                  </div>

                  <div style={s.dimensionsGrid}>
                    {Object.keys(CONSTRUCT_NAMES).map((construct) => {
                      const comparison = fitAnalysis.construct_comparison[construct];
                      if (!comparison) return null;

                      const fitColor = getFitColor(comparison.fit_score);
                      const isAbove = comparison.candidate_score > comparison.team_average;

                      return (
                        <div key={construct} style={s.dimensionCard}>
                          <div style={s.dimensionHeader}>
                            <div style={s.dimensionIcon}>{CONSTRUCT_ICONS[construct]}</div>
                            <div style={s.dimensionInfo}>
                              <div style={s.dimensionName}>{CONSTRUCT_NAMES[construct]}</div>
                              <div style={s.dimensionCode}>{construct}</div>
                            </div>
                            <div style={{
                              ...s.dimensionScore,
                              color: fitColor.text
                            }}>
                              {Math.round(comparison.fit_score)}%
                            </div>
                          </div>

                          <div style={s.dimensionBars}>
                            <div style={s.barRow}>
                              <span style={s.barLabel}>Candidate</span>
                              <div style={s.barContainer}>
                                <div style={{
                                  ...s.bar,
                                  width: `${(comparison.candidate_score / 10) * 100}%`,
                                  background: "var(--accent-lavender)"
                                }}></div>
                              </div>
                              <span style={s.barValue}>{comparison.candidate_score.toFixed(1)}</span>
                            </div>

                            <div style={s.barRow}>
                              <span style={s.barLabel}>Team Avg</span>
                              <div style={s.barContainer}>
                                <div style={{
                                  ...s.bar,
                                  width: `${(comparison.team_average / 10) * 100}%`,
                                  background: "var(--accent-blue)"
                                }}></div>
                              </div>
                              <span style={s.barValue}>{comparison.team_average.toFixed(1)}</span>
                            </div>
                          </div>

                          <div style={s.dimensionInterpretation}>
                            <span style={s.arrow}>{isAbove ? "↑" : "↓"}</span>
                            {comparison.interpretation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Insights */}
                <div style={s.insightsCard}>
                  <div style={s.insightHeader}>
                    <span style={s.insightIcon}>AI</span>
                    <div>
                      <h3 style={s.insightTitle}>AI-Powered Insights</h3>
                      <p style={s.insightSubtitle}>Predictive recommendations & risk analysis</p>
                    </div>
                  </div>

                  {/* Overall Assessment */}
                  <div style={s.assessmentBox}>
                    <div style={s.assessmentLabel}>Overall Assessment</div>
                    <div style={s.assessmentText}>{fitAnalysis.insights.overall_assessment}</div>
                  </div>

                  {/* Strengths */}
                  {fitAnalysis.insights.strengths.length > 0 && (
                    <div style={s.insightSection}>
                      <div style={s.insightSectionTitle}>Strengths</div>
                      <div style={s.insightsList}>
                        {fitAnalysis.insights.strengths.map((strength, idx) => (
                          <div key={idx} style={s.insightItem}>
                            <div style={{
                              ...s.insightBadge,
                              background: "var(--color-success)",
                              opacity: 0.15
                            }}>
                              {CONSTRUCT_ICONS[strength.construct]}
                            </div>
                            <div style={s.insightText}>
                              <strong>{CONSTRUCT_NAMES[strength.construct]}:</strong> {strength.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concerns */}
                  {fitAnalysis.insights.concerns.length > 0 && (
                    <div style={s.insightSection}>
                      <div style={s.insightSectionTitle}>Areas to Watch</div>
                      <div style={s.insightsList}>
                        {fitAnalysis.insights.concerns.map((concern, idx) => (
                          <div key={idx} style={s.insightItem}>
                            <div style={{
                              ...s.insightBadge,
                              background: "var(--color-warning)",
                              opacity: 0.15
                            }}>
                              {CONSTRUCT_ICONS[concern.construct]}
                            </div>
                            <div style={s.insightText}>
                              <strong>{CONSTRUCT_NAMES[concern.construct]}:</strong> {concern.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Diversity Note */}
                  {fitAnalysis.insights.diversity_note && (
                    <div style={s.diversityNote}>
                      <span style={s.diversityIcon}>DI</span>
                      <div style={s.diversityText}>{fitAnalysis.insights.diversity_note}</div>
                    </div>
                  )}
                </div>

                {/* Team Members */}
                {teamProfile.members && teamProfile.members.length > 0 && (
                  <div style={s.card}>
                    <div style={s.cardHeader}>
                      <h2 style={s.cardTitle}>Current Team Members</h2>
                      <p style={s.cardSubtitle}>Environmental preference profiles</p>
                    </div>

                    <div style={s.membersGrid}>
                      {teamProfile.members.map((member) => (
                        <div key={member.id} style={s.memberCard}>
                          <div style={s.memberAvatar}>
                            {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <div style={s.memberName}>{member.name}</div>
                          <div style={s.memberDimensions}>
                            {Object.keys(CONSTRUCT_NAMES).slice(0, 4).map((construct) => {
                              const score = member.scores[construct];
                              return score ? (
                                <div key={construct} style={s.memberDimension}>
                                  <span style={s.memberDimensionIcon}>{CONSTRUCT_ICONS[construct]}</span>
                                  <span style={s.memberDimensionValue}>{score.toFixed(1)}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>TM</div>
            <h2 style={s.emptyTitle}>No Team Data Available</h2>
            <p style={s.emptyText}>
              Build your first team profile by hiring team members to enable intelligent fit analysis
            </p>
            <button style={s.btnPrimary}>
              Get Started
            </button>
          </div>
        )}
      </div>
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
    background: "var(--accent-blue-glow)",
    display: "grid",
    placeItems: "center",
    border: "1px solid var(--border-subtle)",
  },

  icon: {
    fontSize: 28,
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
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },

  btnPrimary: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "var(--accent-blue)",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 32,
  },

  statCard: {
    padding: 24,
    borderRadius: 20,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
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
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "4px 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
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
    transition: "width 1s ease-out",
  },

  card: {
    padding: 32,
    borderRadius: 24,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 32,
  },

  cardHeader: {
    marginBottom: 24,
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

  selectContainer: {
    marginBottom: 24,
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  select: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 15,
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 16,
    padding: 40,
  },

  spinner: {
    width: 48,
    height: 48,
    border: "4px solid var(--surface-3)",
    borderTop: "4px solid var(--accent-blue)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    fontSize: 15,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  fitScoreCard: {
    padding: 32,
    borderRadius: 24,
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
    marginBottom: 32,
  },

  fitScoreContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  fitScoreLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  fitScoreName: {
    fontSize: 28,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  fitScoreCircle: {
    position: "relative" as const,
    width: 120,
    height: 120,
  },

  fitScoreSvg: {
    width: "100%",
    height: "100%",
  },

  fitScoreNumber: {
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 36,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  fitScoreFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fitScoreBadge: {
    padding: "8px 16px",
    borderRadius: 999,
    background: "var(--surface-3)",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  fitScoreTeam: {
    fontSize: 14,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  dimensionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 20,
  },

  dimensionCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  dimensionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  dimensionIcon: {
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-4)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "4px 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  dimensionInfo: {
    flex: 1,
  },

  dimensionName: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 2,
  },

  dimensionCode: {
    fontSize: 12,
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },

  dimensionScore: {
    fontSize: 24,
    fontWeight: 600,
  },

  dimensionBars: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    marginBottom: 12,
  },

  barRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  barLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    width: 80,
  },

  barContainer: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    background: "var(--surface-4)",
    overflow: "hidden",
  },

  bar: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1s ease-out",
  },

  barValue: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    width: 40,
    textAlign: "right" as const,
  },

  dimensionInterpretation: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    paddingTop: 12,
    borderTop: "1px solid var(--border-subtle)",
  },

  arrow: {
    fontSize: 16,
    marginRight: 8,
  },

  insightsCard: {
    padding: 32,
    borderRadius: 24,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-strong)",
    marginBottom: 32,
  },

  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },

  insightIcon: {
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "4px 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  insightTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 4px 0",
  },

  insightSubtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    margin: 0,
  },

  assessmentBox: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 24,
  },

  assessmentLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },

  assessmentText: {
    fontSize: 15,
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },

  insightSection: {
    marginBottom: 24,
  },

  insightSectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },

  insightsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  insightItem: {
    display: "flex",
    gap: 16,
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  insightBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    flexShrink: 0,
  },

  insightText: {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },

  diversityNote: {
    display: "flex",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    background: "var(--accent-lavender-glow)",
    border: "1px solid var(--border-strong)",
  },

  diversityIcon: {
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "4px 8px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  diversityText: {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.6,
  },

  membersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 20,
  },

  memberCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    textAlign: "center" as const,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  memberAvatar: {
    width: 64,
    height: 64,
    margin: "0 auto 12px",
    borderRadius: 16,
    background: "var(--accent-blue-glow)",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  memberName: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },

  memberDimensions: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
  },

  memberDimension: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 4,
  },

  memberDimensionIcon: {
    fontSize: 16,
  },

  memberDimensionValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },

  emptyState: {
    padding: 80,
    textAlign: "center" as const,
    borderRadius: 24,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  emptyIcon: {
    fontSize: 80,
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    color: "var(--text-secondary)",
    marginBottom: 32,
    maxWidth: 500,
    margin: "0 auto 32px",
  },
};
