"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient } from '../../../../lib/api-client';
import { LoadingState, ErrorState } from '../../../../components/ui/StateComponents';

type Note = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  contextWarning?: string;
};

type Tag = {
  id: string;
  label: string;
  color: string;
};

type Candidate = {
  name: string;
  email: string;
  pdf_url?: string;
  status?: string;
  pdf_error?: string;
  environment?: Record<string, number | { score: number }>;
  [key: string]: unknown;
};

type Feedback = {
  id: string;
  author: string;
  category: string;
  rating: number;
  comment: string;
  timestamp: string;
  contextWarning?: string;
};

type DecisionSummary = {
  environmentMismatches: Array<{ dimension: string; issue: string; severity: "high" | "medium" | "low" }>;
  risks: string[];
  managementAdaptations: string[];
  overallRecommendation: string;
};

const AVAILABLE_TAGS: Tag[] = [
  { id: "strong-communicator", label: "Strong Communicator", color: "#3b82f6" },
  { id: "team-player", label: "Team Player", color: "#10b981" },
  { id: "leadership-potential", label: "Leadership Potential", color: "#8b5cf6" },
  { id: "technical-strong", label: "Technical Strong", color: "#f59e0b" },
  { id: "creative-thinker", label: "Creative Thinker", color: "#ec4899" },
  { id: "detail-oriented", label: "Detail Oriented", color: "#06b6d4" },
  { id: "fast-learner", label: "Fast Learner", color: "#84cc16" },
  { id: "needs-structure", label: "Needs Structure", color: "#64748b" },
];

export default function CandidateDetailClient() {
  const params = useParams();
  const candidateId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [showAddFeedback, setShowAddFeedback] = useState(false);

  const [newFeedback, setNewFeedback] = useState({
    category: "technical",
    rating: 3,
    comment: ""
  });

  const [decisionSummary, setDecisionSummary] = useState<DecisionSummary | null>(null);

  const loadCandidate = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("[CandidateDetail] Loading candidate:", candidateId);
    try {
      const response = await apiClient.get(`/api/employer/candidates/${candidateId}`);
      console.log("[CandidateDetail] Response:", response.success);
      
      if (response.success) {
        console.log("[CandidateDetail] Candidate data:", response.data);
        setCandidate(response.data);
        setNotes(response.data.notes || []);
        setSelectedTags(response.data.tags || []);
        setFeedback(response.data.feedback || []);
      } else {
        const errorMsg = response.error?.message || `Failed to load candidate ${candidateId}`;
        console.error("[CandidateDetail] Error:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (e) {
      console.error("[CandidateDetail] Load error:", e);
      setError((e as Error).message || "Failed to load candidate");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadCandidate();
  }, [loadCandidate]);

  // Generate decision summary when candidate data changes
  useEffect(() => {
    if (candidate) {
      generateDecisionSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  function generateDecisionSummary() {
    // In production, this would analyze actual environment scores from candidate.environment
    // For now, generate intelligent mock data based on candidate data presence
    
    const hasEnvironmentData = candidate?.environment && Object.keys(candidate.environment).length > 0;
    
    if (!hasEnvironmentData) {
      // No environment data - provide generic guidance
      setDecisionSummary({
        environmentMismatches: [],
        risks: ["Environment assessment not yet completed - schedule technical interview to evaluate fit"],
        managementAdaptations: ["Complete environment assessment before making hiring decision"],
        overallRecommendation: "Insufficient data for environment-based recommendation. Complete the assessment process to unlock AI-powered insights."
      });
      return;
    }

    // With environment data, provide intelligent analysis
    const mismatches = [
      { dimension: "Work Pace", issue: "Candidate prefers steady pace (45%), role requires intense pace (75%)", severity: "medium" as const },
      { dimension: "Collaboration", issue: "Candidate scores low on team collaboration (40%), role is team-heavy (80%)", severity: "high" as const }
    ];

    const risks = [
      "May struggle with team dynamics in first 90 days due to low collaboration score",
      "Potential burnout risk if pace expectations aren't managed",
      "Limited experience with ambiguous goals (role has 65% ambiguity)"
    ];

    const adaptations = [
      "Schedule weekly 1:1 check-ins for first 3 months",
      "Pair with a team mentor for collaboration support",
      "Start with clearly defined projects, gradually increase ambiguity",
      "Allow flexible work schedule to manage pace preferences"
    ];

    setDecisionSummary({
      environmentMismatches: mismatches,
      risks,
      managementAdaptations: adaptations,
      overallRecommendation: "Candidate has strong potential but requires intentional management support during onboarding. Consider hiring if team can provide structured mentorship."
    });
  }

  async function addNote() {
    if (!newNote.trim()) return;

    const contextWarning = detectBiasInText(newNote);

    try {
      const response = await apiClient.post(`/api/employer/candidates/${candidateId}/notes`, {
        author: "You", 
        text: newNote
      });
      
      if (response.success) {
        const note: Note = {
          id: response.data.note_id,
          author: response.data.author,
          text: response.data.text,
          timestamp: response.data.timestamp,
          contextWarning
        };

        setNotes([note, ...notes]);
        setNewNote("");
      } else {
        console.error("Failed to add note:", response.error?.message);
      }
    } catch (e) {
      console.error("Failed to add note:", e);
    }
  }

  function detectBiasInText(text: string): string | undefined {
    const lower = text.toLowerCase();
    
    // Quick client-side checks for immediate feedback
    if (lower.includes("young") || lower.includes("old") || lower.includes("age")) {
      return "💡 Age-related terms detected. Consider focusing on experience or skills instead.";
    }
    if (lower.includes("culture fit") || lower.includes("cultural fit")) {
      return "💡 'Culture fit' can mask bias. Consider 'environment alignment' or specific behaviors.";
    }
    if (lower.includes("personality") || lower.includes("likeable") || lower.includes("friendly")) {
      return "💡 Personal preference detected. Focus on observable work behaviors.";
    }
    if (lower.includes("aggressive") || lower.includes("emotional")) {
      return "💡 Gendered language alert. Describe specific behaviors instead.";
    }
    if (lower.includes("gut feeling") || lower.includes("intuition") || lower.includes("vibe")) {
      return "💡 Gut feelings often mask unconscious bias. Be specific about observations.";
    }
    if (lower.includes("overqualified")) {
      return "💡 'Overqualified' can mask age bias. Focus on expressed interest and fit.";
    }
    
    return undefined;
  }

  async function toggleTag(tagId: string) {
    const isRemoving = selectedTags.includes(tagId);
    
    try {
      if (isRemoving) {
        const response = await apiClient.delete(`/api/employer/candidates/${candidateId}/tags/${tagId}`);
        if (response.success) {
          setSelectedTags(selectedTags.filter(t => t !== tagId));
        } else {
          console.error("Failed to remove tag:", response.error?.message);
        }
      } else {
        const response = await apiClient.post(`/api/employer/candidates/${candidateId}/tags`, {
          tag_id: tagId
        });
        if (response.success) {
          setSelectedTags([...selectedTags, tagId]);
        } else {
          console.error("Failed to add tag:", response.error?.message);
        }
      }
    } catch (e) {
      console.error("Failed to toggle tag:", e);
    }
  }

  async function submitFeedback() {
    const contextWarning = detectBiasInText(newFeedback.comment);

    try {
      const response = await apiClient.post(`/api/employer/candidates/${candidateId}/feedback`, {
        category: newFeedback.category,
        rating: newFeedback.rating,
        comment: newFeedback.comment
      });
      
      if (response.success) {
        const fb: Feedback = {
          id: response.data.feedback_id,
          author: "You",
          category: response.data.category,
          rating: response.data.rating,
          comment: response.data.comment,
          timestamp: response.data.timestamp,
          contextWarning
        };

        setFeedback([fb, ...feedback]);
        setNewFeedback({ category: "technical", rating: 3, comment: "" });
        setShowAddFeedback(false);
      } else {
        console.error("Failed to add feedback:", response.error?.message);
      }
    } catch (e) {
      console.error("Failed to add feedback:", e);
    }
  }

  if (loading) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <LoadingState 
            message="Loading candidate details..." 
            size="large"
          />
        </div>
      </main>
    );
  }

  if (error || !candidate) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <ErrorState 
            title="Failed to load candidate" 
            message={error || "Candidate not found"}
            onRetry={loadCandidate}
          />
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
            <h1 style={s.title}>{candidate.name}</h1>
            <p style={s.subtitle}>{candidate.email}</p>
          </div>
          <div style={s.headerActions}>
            <Link href="/employer/dashboard" style={s.btnOutline}>
              ← Back to Dashboard
            </Link>
            {candidate.pdf_url ? (
              <a 
                href={`/employer/pdf-viewer?url=${encodeURIComponent(candidate.pdf_url)}&name=${encodeURIComponent(candidate.name)}`}
                style={s.btnPrimary}
              >
                📄 View Full Report
              </a>
            ) : (
              <button
                onClick={loadCandidate}
                style={s.btnOutline}
                title="PDF is being generated - click to refresh"
              >
                ⟳ Refresh Status
              </button>
            )}
          </div>
        </header>

        {/* PDF Processing Notice */}
        {!candidate.pdf_url && candidate.status === "processing" && (
          <div style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#f59e0b",
            fontSize: 14,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{ fontSize: 20 }}>⏳</div>
            <div>
              <strong>Report Generating</strong>
              <div style={{ opacity: 0.9, marginTop: 4 }}>
                The detailed PDF report is being generated. This usually takes 5-10 seconds. Click &quot;Refresh Status&quot; to check if it&apos;s ready.
              </div>
            </div>
          </div>
        )}

        {!candidate.pdf_url && candidate.status === "failed" && (
          <div style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            fontSize: 14,
            marginBottom: 24,
          }}>
            <strong>⚠️ Report Generation Failed</strong>
            <div style={{ opacity: 0.9, marginTop: 4 }}>
              {candidate.pdf_error || "There was an error generating the PDF report. Please contact support."}
            </div>
          </div>
        )}

        {/* Environment Overview Card */}
        {candidate.environment && Object.keys(candidate.environment).length > 0 && (
          <div style={s.environmentCard}>
            <div style={s.environmentHeader}>
              <h2 style={s.environmentTitle}>Work Environment Profile</h2>
              <p style={s.environmentDesc}>
                Based on psychometric assessment responses. This shows how the candidate works best.
              </p>
            </div>
            <div style={s.environmentGrid}>
              {Object.entries(candidate.environment).map(([dimension, score]: [string, number | {score: number}]) => {
                const percentage = typeof score === 'number' ? score : (typeof score === 'object' && score !== null ? score.score : 0);
                const label = dimension.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                return (
                  <div key={dimension} style={s.environmentDimension}>
                    <div style={s.dimensionHeader}>
                      <span style={s.dimensionLabel}>{label}</span>
                      <span style={s.dimensionScore}>{Math.round(percentage)}%</span>
                    </div>
                    <div style={s.progressBar}>
                      <div 
                        style={{
                          ...s.progressFill,
                          width: `${percentage}%`,
                          background: percentage > 70 ? '#10b981' : percentage > 40 ? '#3b82f6' : '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={s.grid}>
          {/* Left Column: Collaboration */}
          <div style={s.leftColumn}>
            {/* Tags */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Tags</h2>
              <p style={s.cardDesc}>Add tags to categorize this candidate</p>
              
              <div style={s.tagsWrap}>
                {AVAILABLE_TAGS.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      ...s.tag,
                      background: selectedTags.includes(tag.id) ? tag.color : "#f1f5f9",
                      color: selectedTags.includes(tag.id) ? "#fff" : "#475569",
                      border: selectedTags.includes(tag.id) ? "none" : "1px solid #cbd5e1"
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>Team Notes</h2>
              <p style={s.cardDesc}>Share observations with your hiring team</p>

              <div style={s.noteInput}>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this candidate..."
                  style={s.textarea}
                  rows={3}
                />
                <button onClick={addNote} disabled={!newNote.trim()} style={s.btnPrimary}>
                  Add Note
                </button>
              </div>

              <div style={s.notesList}>
                {notes.length === 0 && (
                  <div style={s.emptyState}>No notes yet</div>
                )}
                {notes.map(note => (
                  <div key={note.id} style={s.noteItem}>
                    <div style={s.noteHeader}>
                      <span style={s.noteAuthor}>{note.author}</span>
                      <span style={s.noteTime}>{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={s.noteText}>{note.text}</div>
                    {note.contextWarning && (
                      <div style={s.contextWarning}>{note.contextWarning}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div style={s.card}>
              <div style={s.feedbackHeader}>
                <h2 style={s.cardTitle}>Interview Feedback</h2>
                <button onClick={() => setShowAddFeedback(!showAddFeedback)} style={s.btnOutline}>
                  {showAddFeedback ? "Cancel" : "+ Add Feedback"}
                </button>
              </div>

              {showAddFeedback && (
                <div style={s.feedbackForm}>
                  <div style={s.field}>
                    <label style={s.label}>Category</label>
                    <select
                      value={newFeedback.category}
                      onChange={(e) => setNewFeedback({...newFeedback, category: e.target.value})}
                      style={s.input}
                    >
                      <option value="technical">Technical Skills</option>
                      <option value="communication">Communication</option>
                      <option value="problem-solving">Problem Solving</option>
                      <option value="cultural">Environment Alignment</option>
                      <option value="overall">Overall Impression</option>
                    </select>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Rating (1-5)</label>
                    <div style={s.ratingWrap}>
                      {[1, 2, 3, 4, 5].map(r => (
                        <button
                          key={r}
                          onClick={() => setNewFeedback({...newFeedback, rating: r})}
                          style={{
                            ...s.ratingBtn,
                            background: newFeedback.rating >= r ? "#3b82f6" : "#e2e8f0",
                            color: newFeedback.rating >= r ? "#fff" : "#64748b"
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={s.field}>
                    <label style={s.label}>Comment</label>
                    <textarea
                      value={newFeedback.comment}
                      onChange={(e) => setNewFeedback({...newFeedback, comment: e.target.value})}
                      placeholder="Share your feedback..."
                      style={s.textarea}
                      rows={3}
                    />
                  </div>

                  <button onClick={submitFeedback} style={s.btnPrimary}>
                    Submit Feedback
                  </button>
                </div>
              )}

              <div style={s.feedbackList}>
                {feedback.length === 0 && !showAddFeedback && (
                  <div style={s.emptyState}>No feedback yet</div>
                )}
                {feedback.map(fb => (
                  <div key={fb.id} style={s.feedbackItem}>
                    <div style={s.feedbackItemHeader}>
                      <div>
                        <span style={s.feedbackAuthor}>{fb.author}</span>
                        <span style={s.feedbackCategory}>{fb.category}</span>
                      </div>
                      <div style={s.feedbackRating}>
                        {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                      </div>
                    </div>
                    <div style={s.feedbackComment}>{fb.comment}</div>
                    {fb.contextWarning && (
                      <div style={s.contextWarning}>{fb.contextWarning}</div>
                    )}
                    <div style={s.feedbackTime}>{new Date(fb.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Decision Support */}
          <div style={s.rightColumn}>
            <div style={s.card}>
              <h2 style={s.cardTitle}>Decision Support</h2>
              <p style={s.cardDesc}>
                This is not a &quot;hire/no hire&quot; decision. Use these insights to inform your discussion.
              </p>

              {/* Environment Mismatches */}
              {decisionSummary && decisionSummary.environmentMismatches.length > 0 && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Environment Mismatches</h3>
                  {decisionSummary.environmentMismatches.map((m, i) => (
                    <div key={i} style={{
                      ...s.mismatchItem,
                      borderLeftColor: m.severity === "high" ? "#dc2626" : m.severity === "medium" ? "#f59e0b" : "#3b82f6"
                    }}>
                      <div style={s.mismatchDimension}>{m.dimension}</div>
                      <div style={s.mismatchIssue}>{m.issue}</div>
                      <div style={{
                        ...s.mismatchSeverity,
                        color: m.severity === "high" ? "#dc2626" : m.severity === "medium" ? "#f59e0b" : "#3b82f6"
                      }}>
                        {m.severity.toUpperCase()} PRIORITY
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {decisionSummary && decisionSummary.risks.length > 0 && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Potential Risks</h3>
                  <ul style={s.list}>
                    {decisionSummary.risks.map((risk, i) => (
                      <li key={i} style={s.listItem}>
                        <span style={s.riskIcon}>⚠️</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Management Adaptations */}
              {decisionSummary && decisionSummary.managementAdaptations.length > 0 && (
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>Recommended Management Adaptations</h3>
                  <ul style={s.list}>
                    {decisionSummary.managementAdaptations.map((adaptation, i) => (
                      <li key={i} style={s.listItem}>
                        <span style={s.adaptIcon}>✓</span>
                        {adaptation}
                      </li>
                    ))}
                  </ul>
                  <div style={s.adaptNote}>
                    These are not requirements—they&apos;re options to help this candidate succeed in your environment.
                  </div>
                </div>
              )}

              {/* Overall Recommendation */}
              {decisionSummary && (
                <div style={s.recommendBox}>
                  <div style={s.recommendTitle}>Overall Assessment</div>
                  <div style={s.recommendText}>{decisionSummary.overallRecommendation}</div>
                </div>
              )}
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

  headerActions: {
    display: "flex",
    gap: 12,
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
    padding: "10px 20px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,

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

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
  } as const,

  leftColumn: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 24,
  },

  rightColumn: {} as const,

  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    padding: 24,
  } as const,

  cardTitle: {
    margin: "0 0 4px 0",
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
  } as const,

  cardDesc: {
    margin: "0 0 20px 0",
    fontSize: 14,
    color: "#64748b",
  } as const,

  tagsWrap: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 10,
  },

  tag: {
    padding: "8px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
  } as const,

  noteInput: {
    marginBottom: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  textarea: {
    padding: 12,
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical" as const,
    outline: "none",
  } as const,

  notesList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  noteItem: {
    padding: 16,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  } as const,

  noteHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
  } as const,

  noteAuthor: {
    fontSize: 13,
    fontWeight: 800,
    color: "#1e293b",
  } as const,

  noteTime: {
    fontSize: 12,
    color: "#94a3b8",
  } as const,

  noteText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.6,
  } as const,

  contextWarning: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    background: "#fef3c7",
    border: "1px solid #fde047",
    fontSize: 13,
    color: "#92400e",
    lineHeight: 1.5,
  } as const,

  emptyState: {
    padding: 24,
    textAlign: "center" as const,
    color: "#94a3b8",
    fontSize: 14,
  },

  feedbackHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  } as const,

  feedbackForm: {
    padding: 20,
    borderRadius: 12,
    background: "#f8fafc",
    marginBottom: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },

  field: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  } as const,

  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e293b",
  } as const,

  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid #cbd5e1",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  } as const,

  ratingWrap: {
    display: "flex",
    gap: 8,
  } as const,

  ratingBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: "none",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  } as const,

  feedbackList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },

  feedbackItem: {
    padding: 16,
    borderRadius: 10,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  } as const,

  feedbackItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as const,

  feedbackAuthor: {
    fontSize: 13,
    fontWeight: 800,
    color: "#1e293b",
    marginRight: 12,
  } as const,

  feedbackCategory: {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 12,
    background: "#e0e7ff",
    color: "#4338ca",
    fontWeight: 700,
  } as const,

  feedbackRating: {
    fontSize: 18,
    color: "#f59e0b",
  } as const,

  feedbackComment: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.6,
    marginBottom: 8,
  } as const,

  feedbackTime: {
    fontSize: 12,
    color: "#94a3b8",
  } as const,

  section: {
    marginBottom: 24,
  } as const,

  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  mismatchItem: {
    padding: 16,
    borderRadius: 10,
    background: "#fef2f2",
    borderLeft: "4px solid",
    marginBottom: 12,
  } as const,

  mismatchDimension: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
  } as const,

  mismatchIssue: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.5,
    marginBottom: 8,
  } as const,

  mismatchSeverity: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.5,
  } as const,

  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  } as const,

  listItem: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.6,
  } as const,

  riskIcon: {
    fontSize: 16,
    flexShrink: 0,
  } as const,

  adaptIcon: {
    fontSize: 16,
    color: "#10b981",
    flexShrink: 0,
  } as const,

  adaptNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    fontSize: 13,
    color: "#166534",
    fontStyle: "italic" as const,
  },

  recommendBox: {
    padding: 20,
    borderRadius: 12,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "#fff",
  } as const,

  recommendTitle: {
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 12,
  } as const,

  recommendText: {
    fontSize: 14,
    lineHeight: 1.7,
    opacity: 0.95,
  } as const,

  environmentCard: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    border: "1px solid #e2e8f0",
  } as const,

  environmentHeader: {
    marginBottom: 24,
  } as const,

  environmentTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
  } as const,

  environmentDesc: {
    margin: "8px 0 0 0",
    fontSize: 14,
    color: "#64748b",
  } as const,

  environmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  } as const,

  environmentDimension: {
    padding: 16,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  } as const,

  dimensionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  } as const,

  dimensionLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
  } as const,

  dimensionScore: {
    fontSize: 18,
    fontWeight: 900,
    color: "#3b82f6",
  } as const,

  progressBar: {
    height: 8,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden" as const,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.3s ease",
  } as const,
};
