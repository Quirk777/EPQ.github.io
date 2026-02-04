"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface FunnelStage {
  stage: string;
  stage_name: string;
  count: number;
  conversion_from_previous: number;
  conversion_from_start: number;
}

interface ABVariant {
  id: string;
  name: string;
  title: string;
  views: number;
  applications: number;
  completions: number;
  conversion_rate: number;
}

export default function AnalyticsClient() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [roles, setRoles] = useState<Array<{ id: string; title: string }>>([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);

  useEffect(() => {
    loadRoles();
    // Mock funnel data for demo
    setFunnelData([
      { stage: "viewed", stage_name: "Job Viewed", count: 1250, conversion_from_previous: 100, conversion_from_start: 100 },
      { stage: "started", stage_name: "Started Application", count: 486, conversion_from_previous: 38.9, conversion_from_start: 38.9 },
      { stage: "completed", stage_name: "Completed Assessment", count: 189, conversion_from_previous: 38.9, conversion_from_start: 15.1 },
      { stage: "interviewed", stage_name: "Interviewed", count: 47, conversion_from_previous: 24.9, conversion_from_start: 3.8 },
      { stage: "offered", stage_name: "Offer Extended", count: 12, conversion_from_previous: 25.5, conversion_from_start: 1.0 },
      { stage: "hired", stage_name: "Hired", count: 9, conversion_from_previous: 75.0, conversion_from_start: 0.7 },
    ]);
  }, []);

  async function loadRoles() {
    try {
      const res = await fetch("/api/employer/roles", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    }
  }

  // Mock stats
  const stats = [
    { label: "Total Applications", value: "486", change: "+12.5%", trend: "up" },
    { label: "Avg Time to Hire", value: "14 days", change: "-2 days", trend: "up" },
    { label: "Offer Acceptance", value: "75%", change: "+8.3%", trend: "up" },
    { label: "Drop-off Rate", value: "23.4%", change: "-5.2%", trend: "up" },
  ];

  // Mock team performance
  const teamPerformance = [
    { name: "Sarah Chen", interviews: 24, hires: 6, rating: 4.8, efficiency: 92 },
    { name: "Mike Rodriguez", interviews: 19, hires: 4, rating: 4.6, efficiency: 87 },
    { name: "Lisa Wang", interviews: 21, hires: 5, rating: 4.9, efficiency: 95 },
    { name: "David Kim", interviews: 16, hires: 3, rating: 4.5, efficiency: 82 },
  ];

  // Mock source breakdown
  const sourceData = [
    { source: "LinkedIn", count: 156, conversion: 18.2 },
    { source: "Indeed", count: 142, conversion: 14.8 },
    { source: "Referral", count: 89, conversion: 28.1 },
    { source: "Company Site", count: 67, conversion: 22.4 },
    { source: "Other", count: 32, conversion: 9.4 },
  ];

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div>
                <h1 style={s.title}>Analytics Dashboard</h1>
                <p style={s.subtitle}>Real-time hiring insights & predictive analytics</p>
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
        {/* Filters */}
        <div style={s.filtersCard}>
          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={s.select}
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.title}</option>
              ))}
            </select>
          </div>

          <div style={s.filterGroup}>
            <label style={s.filterLabel}>Time Range</label>
            <div style={s.timeRangeBtns}>
              {["7d", "30d", "90d", "1y"].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  style={{
                    ...s.timeRangeBtn,
                    ...(timeRange === range ? s.timeRangeBtnActive : {})
                  }}
                >
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "1 Year"}
                </button>
              ))}
            </div>
          </div>

          <button style={s.refreshBtn}>
            Refresh
          </button>
        </div>

        {/* Key Metrics */}
        <div style={s.statsGrid}>
          {stats.map((stat, idx) => (
            <div key={idx} style={s.statCard}>
              <div style={s.statHeader}>
                <div style={{
                  ...s.trendBadge,
                  background: stat.trend === "up" ? "rgba(133, 182, 156, 0.15)" : "rgba(196, 137, 137, 0.15)",
                  border: stat.trend === "up" ? "1px solid var(--color-success)" : "1px solid var(--color-error)",
                  color: stat.trend === "up" ? "var(--color-success)" : "var(--color-error)"
                }}>
                  {stat.change}
                </div>
              </div>
              <div style={s.statValue}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Conversion Funnel */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <h2 style={s.cardTitle}>Conversion Funnel</h2>
              <p style={s.cardSubtitle}>Track candidate journey from view to hire</p>
            </div>
          </div>
          
          <div style={s.funnelContainer}>
            {funnelData.map((stage, idx) => {
              const width = (stage.count / funnelData[0].count) * 100;
              const getStageColor = (index: number) => {
                const colors = [
                  "var(--accent-blue-glow)",
                  "var(--accent-mint-glow)",
                  "var(--accent-lavender-glow)",
                  "var(--accent-peach-glow)",
                  "rgba(133, 182, 156, 0.15)",
                  "rgba(137, 163, 196, 0.15)"
                ];
                return colors[index] || colors[0];
              };
              return (
                <div key={stage.stage} style={s.funnelStage}>
                  <div style={s.funnelBar}>
                    <div 
                      style={{
                        ...s.funnelBarFill,
                        width: `${width}%`,
                        background: getStageColor(idx),
                        border: "1px solid var(--border-default)"
                      }}
                    >
                      <div style={s.funnelInfo}>
                        <span style={s.funnelStageName}>{stage.stage_name}</span>
                        <span style={s.funnelCount}>{stage.count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={s.funnelConversion}>
                    {stage.conversion_from_start.toFixed(1)}% conversion
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Performance & Team Performance */}
        <div style={s.twoColumnGrid}>
          {/* Source Performance */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Source Performance</h2>
            </div>
            <div style={s.sourceList}>
              {sourceData.map((source, idx) => (
                <div key={idx} style={s.sourceItem}>
                  <div style={s.sourceHeader}>
                    <span style={s.sourceName}>{source.source}</span>
                    <span style={s.sourceCount}>{source.count}</span>
                  </div>
                  <div style={s.progressBar}>
                    <div 
                      style={{
                        ...s.progressFill,
                        width: `${source.conversion}%`,
                        background: idx === 2 ? "var(--color-success)" : "var(--accent-blue)",
                        border: "1px solid var(--border-default)"
                      }}
                    ></div>
                  </div>
                  <div style={s.sourceConversion}>{source.conversion}% conversion</div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Performance */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Team Performance</h2>
            </div>
            <div style={s.teamList}>
              {teamPerformance.map((member, idx) => (
                <div key={idx} style={s.teamMember}>
                  <div style={s.teamMemberHeader}>
                    <div style={s.teamAvatar}>
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div style={s.teamInfo}>
                      <div style={s.teamName}>{member.name}</div>
                      <div style={s.teamStats}>
                        {member.interviews} interviews · {member.hires} hires
                      </div>
                    </div>
                  </div>
                  <div style={s.teamMetrics}>
                    <div style={s.teamMetric}>
                      <span style={s.teamMetricLabel}>Rating</span>
                      <span style={s.teamMetricValue}>{member.rating}</span>
                    </div>
                    <div style={s.teamMetric}>
                      <span style={s.teamMetricLabel}>Efficiency</span>
                      <div style={s.efficiencyBar}>
                        <div style={{
                          ...s.efficiencyFill,
                          width: `${member.efficiency}%`,
                          background: member.efficiency >= 90 ? "var(--color-success)" : "var(--color-warning)"
                        }}></div>
                      </div>
                      <span style={s.teamMetricValue}>{member.efficiency}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div style={s.insightsCard}>
          <div style={s.insightHeader}>
            <div>
              <h3 style={s.insightTitle}>AI-Powered Insights</h3>
              <p style={s.insightSubtitle}>Predictive analytics & recommendations</p>
            </div>
          </div>
          <div style={s.insightsList}>
            <div style={s.insightItem}>
              <div style={{...s.insightBadge, background: "rgba(133, 182, 156, 0.15)", border: "1px solid var(--color-success)", color: "var(--color-success)"}}>High Impact</div>
              <div style={s.insightText}>
                <strong>Referrals performing 54% better</strong> - Consider increasing referral bonus from $1,000 to $2,000
              </div>
            </div>
            <div style={s.insightItem}>
              <div style={{...s.insightBadge, background: "rgba(196, 176, 137, 0.15)", border: "1px solid var(--color-warning)", color: "var(--color-warning)"}}>Alert</div>
              <div style={s.insightText}>
                <strong>Drop-off spike at assessment stage</strong> - 23% higher than average. Consider shortening assessment duration.
              </div>
            </div>
            <div style={s.insightItem}>
              <div style={{...s.insightBadge, background: "var(--accent-blue-glow)", border: "1px solid var(--accent-blue-dim)", color: "var(--accent-blue)"}}>Suggestion</div>
              <div style={s.insightText}>
                <strong>Peak application times: Tue-Thu, 2-4 PM</strong> - Schedule job posts and emails during these windows for 31% higher engagement.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative" as const,
    overflow: "auto" as const,
    paddingBottom: 80,
  },

  container: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 var(--space-8)",
    position: "relative" as const,
    zIndex: 1,
  },

  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "var(--surface-1)",
    borderBottom: "1px solid var(--border-subtle)",
    padding: "var(--space-5) 0",
    marginBottom: "var(--space-8)",
  },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-6)",
    flexWrap: "wrap" as const,
  },

  branding: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
  },

  title: {
    fontSize: "var(--text-xl)",
    fontWeight: 600,
    margin: 0,
    color: "var(--text-primary)",
  },

  subtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    margin: "var(--space-1) 0 0 0",
  },

  headerActions: {
    display: "flex",
    gap: "var(--space-3)",
  },

  btnGlass: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },

  btnPrimary: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    border: "1px solid var(--accent-blue-dim)",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  filtersCard: {
    display: "flex",
    gap: "var(--space-5)",
    flexWrap: "wrap" as const,
    alignItems: "flex-end",
    padding: "var(--space-6)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    marginBottom: "var(--space-8)",
  },

  filterGroup: {
    flex: "1 1 200px",
  },

  filterLabel: {
    display: "block",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "var(--space-2)",
  },

  select: {
    width: "100%",
    padding: "var(--space-3) var(--space-4)",
    borderRadius: 8,
    background: "var(--surface-1)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    outline: "none",
  },

  timeRangeBtns: {
    display: "flex",
    gap: "var(--space-2)",
    background: "var(--surface-1)",
    borderRadius: 8,
    padding: "var(--space-1)",
  },

  timeRangeBtn: {
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  timeRangeBtnActive: {
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    border: "1px solid var(--accent-blue-dim)",
  },

  refreshBtn: {
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "var(--space-5)",
    marginBottom: "var(--space-8)",
  },

  statCard: {
    padding: "var(--space-6)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  statHeader: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "var(--space-4)",
  },

  trendBadge: {
    padding: "var(--space-1) var(--space-3)",
    borderRadius: 999,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
  },

  statValue: {
    fontSize: "var(--text-3xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "var(--space-2)",
  },

  statLabel: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },

  card: {
    padding: "var(--space-8)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    marginBottom: "var(--space-8)",
  },

  cardHeader: {
    marginBottom: "var(--space-6)",
  },

  cardTitle: {
    fontSize: "var(--text-xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 var(--space-1) 0",
  },

  cardSubtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    margin: 0,
  },

  funnelContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-3)",
  },

  funnelStage: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-2)",
  },

  funnelBar: {
    height: 60,
    borderRadius: 8,
    background: "var(--surface-1)",
    overflow: "hidden",
  },

  funnelBarFill: {
    height: "100%",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    padding: "0 var(--space-5)",
    transition: "width 1s ease-out",
  },

  funnelInfo: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
  },

  funnelStageName: {
    fontSize: "var(--text-base)",
    fontWeight: 500,
    color: "var(--text-primary)",
  },

  funnelCount: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  funnelConversion: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: 500,
    paddingLeft: "var(--space-5)",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "var(--space-8)",
    marginBottom: "var(--space-8)",
  },

  sourceList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-5)",
  },

  sourceItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-2)",
  },

  sourceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sourceName: {
    fontSize: "var(--text-base)",
    fontWeight: 500,
    color: "var(--text-primary)",
  },

  sourceCount: {
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    background: "var(--surface-1)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1s ease-out",
  },

  sourceConversion: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: 500,
  },

  teamList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-5)",
  },

  teamMember: {
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-1)",
    border: "1px solid var(--border-subtle)",
  },

  teamMemberHeader: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
    marginBottom: "var(--space-4)",
  },

  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    display: "grid",
    placeItems: "center",
    fontSize: "var(--text-lg)",
    fontWeight: 600,
    color: "var(--accent-blue)",
  },

  teamInfo: {
    flex: 1,
  },

  teamName: {
    fontSize: "var(--text-lg)",
    fontWeight: 500,
    color: "var(--text-primary)",
    marginBottom: "var(--space-1)",
  },

  teamStats: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
  },

  teamMetrics: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "var(--space-4)",
  },

  teamMetric: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-2)",
  },

  teamMetricLabel: {
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
  },

  teamMetricValue: {
    fontSize: "var(--text-base)",
    fontWeight: 500,
    color: "var(--text-primary)",
  },

  efficiencyBar: {
    height: 8,
    borderRadius: 999,
    background: "var(--surface-2)",
    overflow: "hidden",
    marginTop: "var(--space-1)",
  },

  efficiencyFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 1s ease-out",
  },

  insightsCard: {
    padding: "var(--space-8)",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
  },

  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
    marginBottom: "var(--space-6)",
  },

  insightTitle: {
    fontSize: "var(--text-xl)",
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: "0 0 var(--space-1) 0",
  },

  insightSubtitle: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    margin: 0,
  },

  insightsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--space-4)",
  },

  insightItem: {
    display: "flex",
    gap: "var(--space-4)",
    padding: "var(--space-5)",
    borderRadius: 8,
    background: "var(--surface-1)",
    border: "1px solid var(--border-subtle)",
  },

  insightBadge: {
    padding: "var(--space-2) var(--space-3)",
    borderRadius: 6,
    fontSize: "var(--text-xs)",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    height: "fit-content",
  },

  insightText: {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
};
