"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: string;
  construct?: string;
  reverse?: boolean;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  time_estimate: number;
  is_active: boolean;
  white_label_name?: string;
}

interface IndustryTemplate {
  name: string;
  description: string;
  focus_constructs: string[];
  question_count: number;
  time_estimate: number;
}

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

export default function AssessmentBuilderClientNew() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [industryTemplates, setIndustryTemplates] = useState<Record<string, IndustryTemplate>>({});
  const [questionBank, setQuestionBank] = useState<Record<string, Question[]>>({});
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [whiteLabelName, setWhiteLabelName] = useState("");
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showIndustryTemplates, setShowIndustryTemplates] = useState(false);
  const [selectedConstruct, setSelectedConstruct] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadQuestionBank();
    loadIndustryTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/employer/assessment-builder/templates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function loadQuestionBank() {
    try {
      const res = await fetch("/api/employer/assessment-builder/question-bank", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setQuestionBank(data.question_bank || {});
      }
    } catch (error) {
      console.error("Failed to load question bank:", error);
    }
  }

  async function loadIndustryTemplates() {
    try {
      const res = await fetch("/api/employer/assessment-builder/industry-templates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setIndustryTemplates(data.industry_templates || {});
      }
    } catch (error) {
      console.error("Failed to load industry templates:", error);
    }
  }

  async function createTemplate() {
    if (!templateName || selectedQuestions.length === 0) {
      alert("Please provide a name and add at least one question");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employer/assessment-builder/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: templateName,
          description: templateDescription,
          questions: selectedQuestions,
          white_label_name: whiteLabelName || null
        })
      });

      if (res.ok) {
        alert("Template created successfully!");
        setTemplateName("");
        setTemplateDescription("");
        setWhiteLabelName("");
        setSelectedQuestions([]);
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
      alert("Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  async function createFromIndustry(industryKey: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/assessment-builder/industry-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          industry_key: industryKey
        })
      });

      if (res.ok) {
        alert("Template created from industry template!");
        setShowIndustryTemplates(false);
        loadTemplates();
      }
    } catch (error) {
      console.error("Failed to create from industry:", error);
      alert("Failed to create template");
    } finally {
      setLoading(false);
    }
  }

  function addQuestion(question: Question) {
    setSelectedQuestions([...selectedQuestions, { ...question, id: `${Date.now()}-${Math.random()}` }]);
  }

  function removeQuestion(index: number) {
    setSelectedQuestions(selectedQuestions.filter((_, i) => i !== index));
  }

  function moveQuestion(fromIndex: number, toIndex: number) {
    const newQuestions = [...selectedQuestions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    setSelectedQuestions(newQuestions);
  }

  const totalQuestions = selectedQuestions.length;
  const estimatedTime = Math.ceil(totalQuestions * 0.5);

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>AB</span>
              </div>
              <div>
                <h1 style={s.title}>Assessment Builder</h1>
                <p style={s.subtitle}>Create custom psychometric assessments with AI assistance</p>
              </div>
            </div>

            <div style={s.headerActions}>
              <Link href="/employer/dashboard" style={s.btnGlass}>
                Dashboard
              </Link>
              <Link href="/employer/modules" style={s.btnGlass}>
                Modules
              </Link>
              <button 
                onClick={() => setPreviewMode(!previewMode)} 
                style={previewMode ? s.btnPrimary : s.btnGlass}
              >
                {previewMode ? "Exit Preview" : "Preview"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={s.container}>
        {/* Stats */}
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statHeader}>
              <span style={s.statIcon}>CT</span>
              <div style={{
                ...s.badge,
                background: "var(--accent-blue-glow)"
              }}>
                Active
              </div>
            </div>
            <div style={s.statValue}>{templates.length}</div>
            <div style={s.statLabel}>Custom Templates</div>
            <div style={s.progressBar}>
              <div style={{
                ...s.progressFill,
                width: "78%",
                background: "var(--accent-blue)"
              }}></div>
            </div>
          </div>

          <div style={s.statCard}>
            <div style={s.statHeader}>
              <span style={s.statIcon}>IT</span>
              <div style={{
                ...s.badge,
                background: "var(--color-success)",
                opacity: 0.15
              }}>
                Ready
              </div>
            </div>
            <div style={s.statValue}>{Object.keys(industryTemplates).length}</div>
            <div style={s.statLabel}>Industry Templates</div>
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
              <span style={s.statIcon}>QB</span>
              <div style={{
                ...s.badge,
                background: "var(--accent-lavender-glow)"
              }}>
                Available
              </div>
            </div>
            <div style={s.statValue}>{Object.values(questionBank).flat().length}</div>
            <div style={s.statLabel}>Question Bank Items</div>
            <div style={s.progressBar}>
              <div style={{
                ...s.progressFill,
                width: "92%",
                background: "var(--accent-lavender)"
              }}></div>
            </div>
          </div>
        </div>

        {/* Builder Section */}
        <div style={s.twoColumnGrid}>
          {/* Left: Builder */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Build New Assessment</h2>
              <p style={s.cardSubtitle}>Customize your assessment template</p>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Template Name *</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Senior Developer Assessment"
                style={s.input}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe the purpose of this assessment..."
                style={s.textarea}
                rows={3}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>White Label Name (Optional)</label>
              <input
                type="text"
                value={whiteLabelName}
                onChange={(e) => setWhiteLabelName(e.target.value)}
                placeholder="Custom branding name"
                style={s.input}
              />
            </div>

            <div style={s.infoBox}>
              <div style={s.infoRow}>
                <span style={s.infoLabel}>Questions Added:</span>
                <span style={s.infoValue}>{totalQuestions}</span>
              </div>
              <div style={s.infoRow}>
                <span style={s.infoLabel}>Estimated Time:</span>
                <span style={s.infoValue}>{estimatedTime} min</span>
              </div>
            </div>

            <div style={s.buttonGroup}>
              <button
                onClick={() => setShowQuestionBank(!showQuestionBank)}
                style={s.btnSecondary}
              >
                ➕ Add Questions
              </button>
              <button
                onClick={() => setShowIndustryTemplates(!showIndustryTemplates)}
                style={s.btnSecondary}
              >
                Use Industry Template
              </button>
              <button
                onClick={createTemplate}
                disabled={loading || !templateName || totalQuestions === 0}
                style={{
                  ...s.btnPrimary,
                  opacity: loading || !templateName || totalQuestions === 0 ? 0.5 : 1,
                  cursor: loading || !templateName || totalQuestions === 0 ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>

          {/* Right: Selected Questions */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Selected Questions ({totalQuestions})</h2>
              <p style={s.cardSubtitle}>Drag to reorder, click X to remove</p>
            </div>

            {selectedQuestions.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>EQ</div>
                <div style={s.emptyText}>No questions added yet</div>
                <div style={s.emptyHint}>Click "Add Questions" to get started</div>
              </div>
            ) : (
              <div style={s.questionsList}>
                {selectedQuestions.map((q, idx) => (
                  <div key={idx} style={s.questionItem}>
                    <div style={s.questionNumber}>{idx + 1}</div>
                    <div style={s.questionContent}>
                      <div style={s.questionText}>{q.text}</div>
                      {q.construct && (
                        <div style={s.questionMeta}>
                          <span style={s.constructBadge}>
                            {CONSTRUCT_ICONS[q.construct] || "??"} {q.construct}
                          </span>
                          {q.reverse && (
                            <span style={s.reverseBadge}>Reverse Scored</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={s.questionActions}>
                      {idx > 0 && (
                        <button
                          onClick={() => moveQuestion(idx, idx - 1)}
                          style={s.moveBtn}
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      {idx < selectedQuestions.length - 1 && (
                        <button
                          onClick={() => moveQuestion(idx, idx + 1)}
                          style={s.moveBtn}
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => removeQuestion(idx)}
                        style={s.removeBtn}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question Bank Modal */}
        {showQuestionBank && (
          <div style={s.modal}>
            <div style={s.modalContent}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Question Bank</h3>
                <button onClick={() => setShowQuestionBank(false)} style={s.closeBtn}>
                  ✕
                </button>
              </div>

              <div style={s.modalBody}>
                <div style={s.constructTabs}>
                  <button
                    onClick={() => setSelectedConstruct("")}
                    style={{
                      ...s.constructTab,
                      ...(selectedConstruct === "" ? s.constructTabActive : {})
                    }}
                  >
                    All
                  </button>
                  {Object.keys(questionBank).map((construct) => (
                    <button
                      key={construct}
                      onClick={() => setSelectedConstruct(construct)}
                      style={{
                        ...s.constructTab,
                        ...(selectedConstruct === construct ? s.constructTabActive : {})
                      }}
                    >
                      {CONSTRUCT_ICONS[construct] || "??"} {construct}
                    </button>
                  ))}
                </div>

                <div style={s.questionsGrid}>
                  {(selectedConstruct 
                    ? questionBank[selectedConstruct] || []
                    : Object.values(questionBank).flat()
                  ).map((q, idx) => (
                    <div key={idx} style={s.bankQuestion}>
                      <div style={s.bankQuestionText}>{q.text}</div>
                      {q.construct && (
                        <div style={s.bankQuestionMeta}>
                          <span style={s.constructBadge}>
                            {CONSTRUCT_ICONS[q.construct] || "??"} {q.construct}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          addQuestion(q);
                          setShowQuestionBank(false);
                        }}
                        style={s.addBtn}
                      >
                        ➕ Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Industry Templates Modal */}
        {showIndustryTemplates && (
          <div style={s.modal}>
            <div style={s.modalContent}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Industry Templates</h3>
                <button onClick={() => setShowIndustryTemplates(false)} style={s.closeBtn}>
                  ✕
                </button>
              </div>

              <div style={s.modalBody}>
                <div style={s.industryGrid}>
                  {Object.entries(industryTemplates).map(([key, template]) => (
                    <div key={key} style={s.industryCard}>
                      <div style={s.industryHeader}>
                        <div style={s.industryName}>{template.name}</div>
                        <div style={s.industryTime}>{template.time_estimate} min</div>
                      </div>
                      <div style={s.industryDescription}>{template.description}</div>
                      <div style={s.industryConstructs}>
                        {template.focus_constructs.map((c) => (
                          <span key={c} style={s.constructBadge}>
                            {CONSTRUCT_ICONS[c] || "??"} {c}
                          </span>
                        ))}
                      </div>
                      <div style={s.industryFooter}>
                        <span style={s.industryQuestions}>{template.question_count} questions</span>
                        <button
                          onClick={() => createFromIndustry(key)}
                          disabled={loading}
                          style={s.btnPrimary}
                        >
                          Use This
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Templates */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Your Templates</h2>
            <p style={s.cardSubtitle}>Manage existing assessment templates</p>
          </div>

          {templates.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>NT</div>
              <div style={s.emptyText}>No templates created yet</div>
              <div style={s.emptyHint}>Create your first assessment template above</div>
            </div>
          ) : (
            <div style={s.templatesGrid}>
              {templates.map((template) => (
                <div key={template.id} style={s.templateCard}>
                  <div style={s.templateHeader}>
                    <div>
                      <div style={s.templateName}>{template.name}</div>
                      {template.white_label_name && (
                        <div style={s.whiteLabelBadge}>
                          {template.white_label_name}
                        </div>
                      )}
                    </div>
                    <div style={{
                      ...s.badge,
                      background: template.is_active 
                        ? "var(--color-success)"
                        : "var(--surface-4)",
                      opacity: template.is_active ? 0.15 : 1
                    }}>
                      {template.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  {template.description && (
                    <div style={s.templateDescription}>{template.description}</div>
                  )}
                  <div style={s.templateFooter}>
                    <span style={s.templateTime}>{template.time_estimate} min</span>
                    {template.industry && (
                      <span style={s.templateIndustry}>{template.industry}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
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
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  btnSecondary: {
    padding: "10px 20px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
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
    transition: "width 1s ease-out",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
    marginBottom: 32,
  },

  card: {
    padding: 32,
    borderRadius: 24,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
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

  formGroup: {
    marginBottom: 20,
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 15,
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box" as const,
  },

  textarea: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 15,
    fontWeight: 600,
    outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  },

  infoBox: {
    padding: 16,
    borderRadius: 12,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-strong)",
    marginBottom: 20,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },

  infoLabel: {
    fontSize: 14,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  buttonGroup: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },

  questionsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    maxHeight: 600,
    overflowY: "auto" as const,
  },

  questionItem: {
    display: "flex",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },

  questionContent: {
    flex: 1,
  },

  questionText: {
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 8,
    lineHeight: 1.5,
  },

  questionMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },

  constructBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    background: "rgba(99, 102, 241, 0.2)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    fontSize: 12,
    fontWeight: 600,
    color: "#a5b4fc",
  },

  reverseBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    background: "rgba(236, 72, 153, 0.2)",
    border: "1px solid rgba(236, 72, 153, 0.3)",
    fontSize: 12,
    fontWeight: 600,
    color: "#fda4af",
  },

  questionActions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },

  moveBtn: {
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  removeBtn: {
    background: "var(--color-error)",
    opacity: 0.15,
    border: "1px solid var(--color-error)",
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 12,
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  emptyState: {
    padding: 60,
    textAlign: "center" as const,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "2px dashed var(--border-subtle)",
  },

  emptyIcon: {
    fontSize: 18,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 12,
    padding: "8px 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  emptyHint: {
    fontSize: 14,
    color: "var(--text-tertiary)",
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
    maxWidth: 1000,
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

  constructTabs: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap" as const,
  },

  constructTab: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  constructTabActive: {
    background: "var(--accent-blue)",
    color: "var(--text-primary)",
    border: "1px solid var(--accent-blue)",
  },

  questionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },

  bankQuestion: {
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
  },

  bankQuestionText: {
    fontSize: 14,
    color: "var(--text-primary)",
    marginBottom: 12,
    lineHeight: 1.5,
  },

  bankQuestionMeta: {
    marginBottom: 12,
  },

  addBtn: {
    width: "100%",
    padding: "8px 16px",
    borderRadius: 8,
    background: "var(--color-success)",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  industryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },

  industryCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
  },

  industryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  industryName: {
    fontSize: 18,
    fontWeight: 600,
  },

  industryTime: {
    fontSize: 13,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },

  industryDescription: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 12,
    lineHeight: 1.5,
  },

  industryConstructs: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  },

  industryFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTop: "1px solid var(--surface-3)",
  },

  industryQuestions: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },

  templatesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },

  templateCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
    transition: "all 0.3s ease",
  },

  templateHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  templateName: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },

  whiteLabelBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    background: "rgba(236, 72, 153, 0.2)",
    border: "1px solid rgba(236, 72, 153, 0.3)",
    fontSize: 12,
    fontWeight: 600,
    color: "#fda4af",
  },

  templateDescription: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 12,
    lineHeight: 1.5,
  },

  templateFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTop: "1px solid var(--surface-3)",
  },

  templateTime: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },

  templateIndustry: {
    fontSize: 13,
    color: "var(--text-tertiary)",
    fontWeight: 600,
  },
};
