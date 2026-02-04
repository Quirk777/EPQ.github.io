"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type ViewMode = "day" | "week" | "month";

interface Interview {
  id: string;
  candidate_name: string;
  candidate_id: string;
  role_title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  interviewer_names: string[];
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  ai_suggested: boolean;
  notes?: string;
}

export default function CalendarClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getViewStartDate = useCallback((): Date => {
    const date = new Date(currentDate);
    if (viewMode === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
    } else if (viewMode === "month") {
      date.setDate(1);
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentDate, viewMode]);

  const getViewEndDate = useCallback((): Date => {
    const date = new Date(currentDate);
    if (viewMode === "day") {
      date.setHours(23, 59, 59, 999);
    } else if (viewMode === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
      date.setHours(23, 59, 59, 999);
    } else if (viewMode === "month") {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }, [currentDate, viewMode]);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      const res = await fetch(
        `/api/employer/calendar/interviews?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error("Failed to load interviews:", error);
    } finally {
      setLoading(false);
    }
  }, [getViewStartDate, getViewEndDate]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  function navigatePrevious() {
    const newDate = new Date(currentDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  }

  function navigateNext() {
    const newDate = new Date(currentDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  }

  function navigateToday() {
    setCurrentDate(new Date());
  }

  function getHeaderText(): string {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", { 
        weekday: "long", year: "numeric", month: "long", day: "numeric" 
      });
    } else if (viewMode === "week") {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }
  }

  const upcomingInterviews = interviews
    .filter(i => new Date(i.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const todayInterviews = interviews.filter(i => {
    const interviewDate = new Date(i.start_time);
    const today = new Date();
    return interviewDate.toDateString() === today.toDateString();
  });

  const aiSuggestedCount = interviews.filter(i => i.ai_suggested).length;

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>CA</span>
              </div>
              <div>
                <h1 style={s.title}>AI Interview Calendar</h1>
                <p style={s.subtitle}>Smart scheduling & conflict detection</p>
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

      {/* Main Content */}
      <div style={s.container}>
        {/* Stats Cards */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div>
              <div style={s.statValue}>{interviews.length}</div>
              <div style={s.statLabel}>Total Interviews</div>
            </div>
          </div>
          <div style={s.statCard}>
            <div>
              <div style={s.statValue}>{todayInterviews.length}</div>
              <div style={s.statLabel}>Today</div>
            </div>
          </div>
          <div style={s.statCard}>
            <div>
              <div style={s.statValue}>{upcomingInterviews.length}</div>
              <div style={s.statLabel}>Upcoming</div>
            </div>
          </div>
          <div style={s.statCard}>
            <div>
              <div style={s.statValue}>{aiSuggestedCount}</div>
              <div style={s.statLabel}>AI Suggested</div>
            </div>
          </div>
        </div>

        {/* Search & Controls */}
        <div style={s.controlsCard}>
          {/* Search */}
          <div style={s.searchContainer}>
            <input
              type="text"
              placeholder="Search interviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={s.searchInput}
            />
          </div>

          {/* View Mode Buttons */}
          <div style={s.viewModeContainer}>
            <button
              onClick={() => setViewMode("day")}
              style={{
                ...s.viewModeBtn,
                ...(viewMode === "day" ? s.viewModeBtnActive : {})
              }}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode("week")}
              style={{
                ...s.viewModeBtn,
                ...(viewMode === "week" ? s.viewModeBtnActive : {})
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("month")}
              style={{
                ...s.viewModeBtn,
                ...(viewMode === "month" ? s.viewModeBtnActive : {})
              }}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div style={s.navContainer}>
            <button onClick={navigatePrevious} style={s.navBtn}>◀</button>
            <button onClick={navigateToday} style={s.todayBtn}>Today</button>
            <button onClick={navigateNext} style={s.navBtn}>▶</button>
          </div>

          {/* Schedule Button */}
          <button onClick={() => setShowScheduleModal(true)} style={s.scheduleBtn}>
            Schedule Interview
          </button>
        </div>

        {/* Current View Title */}
        <div style={s.viewTitle}>
          <h2 style={s.viewTitleText}>{getHeaderText()}</h2>
        </div>

        {/* Upcoming Interviews Panel */}
        {upcomingInterviews.length > 0 && (
          <div style={s.upcomingSection}>
            <h3 style={s.upcomingTitle}>Upcoming Interviews</h3>
            <div style={s.upcomingGrid}>
              {upcomingInterviews.map(interview => (
                <button
                  key={interview.id}
                  onClick={() => setSelectedInterview(interview)}
                  style={s.upcomingCard}
                >
                  <div style={s.upcomingHeader}>
                    <div style={s.upcomingName}>{interview.candidate_name}</div>
                    {interview.ai_suggested && (
                      <div style={s.aiBadge}>AI</div>
                    )}
                  </div>
                  <div style={s.upcomingRole}>{interview.role_title}</div>
                  <div style={s.upcomingTime}>
                    {new Date(interview.start_time).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {interviews.length === 0 && !loading && (
          <div style={s.emptyState}>
            <div style={s.emptyTitle}>No Interviews Scheduled</div>
            <div style={s.emptyText}>Click "Schedule Interview" to add your first interview</div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={s.loadingState}>
            <div style={s.loadingSpinner}></div>
            <div style={s.loadingText}>Loading interviews...</div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={s.modalOverlay} onClick={() => setShowScheduleModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Schedule Interview</h3>
              <button onClick={() => setShowScheduleModal(false)} style={s.closeBtn}>
                ✕
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={s.aiSuggestion}>
                <div>
                  <div style={s.aiSuggestionTitle}>AI Suggestion</div>
                  <div style={s.aiSuggestionText}>
                    Based on your calendar, we recommend scheduling between 2-4 PM on Tuesday for optimal availability
                  </div>
                </div>
              </div>
              <p style={s.comingSoon}>Advanced scheduling interface coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {/* Interview Details Modal */}
      {selectedInterview && (
        <div style={s.modalOverlay} onClick={() => setSelectedInterview(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Interview Details</h3>
              <button onClick={() => setSelectedInterview(null)} style={s.closeBtn}>
                ✕
              </button>
            </div>
            <div style={s.modalBody}>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Candidate</div>
                <div style={s.detailValue}>{selectedInterview.candidate_name}</div>
              </div>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Role</div>
                <div style={s.detailValue}>{selectedInterview.role_title}</div>
              </div>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Date & Time</div>
                <div style={s.detailValue}>
                  {new Date(selectedInterview.start_time).toLocaleString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
              {selectedInterview.meeting_link && (
                <div style={s.detailRow}>
                  <div style={s.detailLabel}>Meeting Link</div>
                  <a
                    href={selectedInterview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.meetingLink}
                  >
                    Join Video Call
                  </a>
                </div>
              )}
              {selectedInterview.ai_suggested && (
                <div style={s.aiSuggestion}>
                  <div>
                    <div style={s.aiSuggestionTitle}>AI Optimized Slot</div>
                    <div style={s.aiSuggestionText}>
                      This time was selected based on interviewer availability, candidate preferences, and historical success rates
                    </div>
                  </div>
                </div>
              )}
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
    padding: "0 32px",
    position: "relative" as const,
    zIndex: 1,
  },

  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "var(--surface-1)",
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
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--border-default)",
    display: "grid",
    placeItems: "center",
  },

  icon: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text-primary)",
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
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 24,
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  statValue: {
    fontSize: 32,
    fontWeight: 600,
    color: "var(--text-primary)",
    lineHeight: 1,
  },

  statLabel: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginTop: 4,
  },

  controlsCard: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap" as const,
    alignItems: "center",
    padding: 24,
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    marginBottom: 32,
  },

  searchContainer: {
    flex: "1 1 300px",
    display: "flex",
    alignItems: "center",
    background: "var(--surface-3)",
    borderRadius: 8,
    padding: "12px 16px",
    border: "1px solid var(--border-default)",
  },

  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text-primary)",
    fontSize: 15,
  },

  viewModeContainer: {
    display: "flex",
    gap: 8,
    background: "var(--surface-3)",
    borderRadius: 8,
    padding: 4,
  },

  viewModeBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  viewModeBtnActive: {
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
  },

  navContainer: {
    display: "flex",
    gap: 8,
  },

  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: 16,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  todayBtn: {
    padding: "0 16px",
    height: 40,
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  scheduleBtn: {
    padding: "10px 24px",
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  viewTitle: {
    marginBottom: 24,
  },

  viewTitleText: {
    fontSize: 28,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },

  upcomingSection: {
    marginBottom: 32,
  },

  upcomingTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 16,
  },

  upcomingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 16,
  },

  upcomingCard: {
    padding: 20,
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    textAlign: "left" as const,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    color: "var(--text-primary)",
  },

  upcomingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  upcomingName: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  aiBadge: {
    padding: "4px 8px",
    borderRadius: 6,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    fontSize: 11,
    fontWeight: 600,
  },

  upcomingRole: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 12,
  },

  upcomingTime: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },

  emptyState: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },

  emptyText: {
    fontSize: 16,
    color: "var(--text-secondary)",
  },

  loadingState: {
    textAlign: "center" as const,
    padding: "80px 20px",
  },

  loadingSpinner: {
    width: 48,
    height: 48,
    border: "4px solid var(--surface-3)",
    borderTop: "4px solid var(--accent-blue)",
    borderRadius: "50%",
    margin: "0 auto 20px",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    fontSize: 16,
    color: "var(--text-secondary)",
  },

  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: 8,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottom: "1px solid var(--border-subtle)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
  },

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    fontSize: 18,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  modalBody: {
    padding: 24,
  },

  aiSuggestion: {
    display: "flex",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    marginBottom: 20,
  },

  aiSuggestionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--accent-blue)",
    marginBottom: 4,
  },

  aiSuggestionText: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },

  comingSoon: {
    textAlign: "center" as const,
    color: "var(--text-secondary)",
    fontSize: 15,
    padding: 40,
  },

  detailRow: {
    marginBottom: 20,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 8,
  },

  detailValue: {
    fontSize: 16,
    color: "var(--text-primary)",
    fontWeight: 600,
  },

  meetingLink: {
    display: "inline-block",
    padding: "10px 20px",
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
};
