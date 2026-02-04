"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from '../../../lib/api-client';
import { LoadingState, ErrorState } from '../../../components/ui/StateComponents';

interface ReferenceRequest {
  id: number;
  candidate_id: number;
  reference_name: string;
  reference_email: string;
  reference_phone?: string;
  relationship: string;
  company: string;
  status: string;
  sent_at?: string;
  completed_at?: string;
  reminder_count: number;
}

interface ReferenceResponse {
  id: number;
  question_id: string;
  question_text: string;
  response?: string;
  rating?: number;
  submitted_at: string;
}

interface EmploymentVerification {
  id: number;
  company: string;
  job_title: string;
  start_date?: string;
  end_date?: string;
  verified: boolean;
  verification_source: string;
  discrepancy_flag: boolean;
  discrepancy_notes?: string;
  created_at: string;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
}

export default function ReferencesClientNew() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [references, setReferences] = useState<ReferenceRequest[]>([]);
  const [verifications, setVerifications] = useState<EmploymentVerification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReference, setSelectedReference] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [referenceDetails, setReferenceDetails] = useState<any>(null);

  const [newReference, setNewReference] = useState({
    name: "",
    email: "",
    phone: "",
    relationship: "manager",
    company: ""
  });

  useEffect(() => {
    loadCandidates();
  }, []);

  useEffect(() => {
    if (selectedCandidate) {
      loadCandidateReferences();
    }
  }, [selectedCandidate]);

  const loadCandidates = async () => {
    try {
      const res = await fetch("/api/employer/candidates", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.slice(0, 20));
        if (data.length > 0 && !selectedCandidate) {
          setSelectedCandidate(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    }
  };

  const loadCandidateReferences = async () => {
    if (!selectedCandidate) return;

    setLoading(true);
    try {
      const refRes = await fetch(
        `/api/employer/references/requests/${selectedCandidate}`,
        { credentials: "include" }
      );
      if (refRes.ok) {
        const refData = await refRes.json();
        setReferences(refData.requests || []);
      }

      const verRes = await fetch(
        `/api/employer/references/verifications/${selectedCandidate}`,
        { credentials: "include" }
      );
      if (verRes.ok) {
        const verData = await verRes.json();
        setVerifications(verData.verifications || []);
      }

      const statsRes = await fetch(
        `/api/employer/references/statistics/${selectedCandidate}`,
        { credentials: "include" }
      );
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load references:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReference = async () => {
    if (!selectedCandidate || !newReference.name || !newReference.email) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const res = await fetch("/api/employer/references/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          candidate_id: selectedCandidate,
          ...newReference
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Reference request sent!\n\nEmail Subject: ${data.email?.subject}\n\nReference link: ${data.email?.reference_link}`);
        setShowAddModal(false);
        setNewReference({ name: "", email: "", phone: "", relationship: "manager", company: "" });
        loadCandidateReferences();
      } else {
        alert("Failed to create reference request");
      }
    } catch (err) {
      console.error("Failed to create reference:", err);
      alert("Error creating reference request");
    }
  };

  const handleSendReminder = async (requestId: number) => {
    try {
      const res = await fetch(
        `/api/employer/references/reminder/${requestId}`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (res.ok) {
        alert("Reminder sent successfully");
        loadCandidateReferences();
      } else {
        alert("Failed to send reminder");
      }
    } catch (err) {
      console.error("Failed to send reminder:", err);
    }
  };

  const viewReferenceDetails = async (requestId: number) => {
    try {
      const res = await fetch(
        `/api/employer/references/responses/${requestId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setReferenceDetails(data);
        setSelectedReference(requestId);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error("Failed to load reference details:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "var(--color-success)", text: "var(--color-success)" };
      case "sent":
        return { bg: "var(--color-warning)", text: "var(--color-warning)" };
      case "expired":
        return { bg: "var(--color-error)", text: "var(--color-error)" };
      default:
        return { bg: "var(--surface-4)", text: "var(--text-tertiary)" };
    }
  };

  const selectedCandidateName = candidates.find(c => c.id === selectedCandidate)?.name || "Select Candidate";

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>RF</span>
              </div>
              <div>
                <h1 style={s.title}>Reference Checks</h1>
                <p style={s.subtitle}>Automated reference verification & employment history</p>
              </div>
            </div>

            <div style={s.headerActions}>
              <Link href="/employer/dashboard" style={s.btnGlass}>
                Dashboard
              </Link>
              <Link href="/employer/modules" style={s.btnGlass}>
                Modules
              </Link>
              <button onClick={() => setShowAddModal(true)} style={s.btnPrimary}>
                New Reference Request
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={s.container}>
        {/* Candidate Selection */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Select Candidate</h2>
            <p style={s.cardSubtitle}>Choose a candidate to view their references</p>
          </div>

          <select
            value={selectedCandidate || ""}
            onChange={(e) => setSelectedCandidate(Number(e.target.value))}
            style={s.select}
          >
            <option value="">-- Select Candidate --</option>
            {candidates.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.email})
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        {stats && (
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>RR</span>
                <div style={{
                  ...s.badge,
                  background: "var(--accent-blue-glow)"
                }}>
                  Total
                </div>
              </div>
              <div style={s.statValue}>{stats.total_requests || 0}</div>
              <div style={s.statLabel}>Reference Requests</div>
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
                <span style={s.statIcon}>CP</span>
                <div style={{
                  ...s.badge,
                  background: "var(--color-success)",
                  opacity: 0.15
                }}>
                  Complete
                </div>
              </div>
              <div style={s.statValue}>{stats.completed || 0}</div>
              <div style={s.statLabel}>Completed</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${stats.total_requests ? (stats.completed / stats.total_requests) * 100 : 0}%`,
                  background: "var(--color-success)"
                }}></div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>PD</span>
                <div style={{
                  ...s.badge,
                  background: "var(--color-warning)",
                  opacity: 0.15
                }}>
                  Pending
                </div>
              </div>
              <div style={s.statValue}>{stats.pending || 0}</div>
              <div style={s.statLabel}>Awaiting Response</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${stats.total_requests ? (stats.pending / stats.total_requests) * 100 : 0}%`,
                  background: "var(--color-warning)"
                }}></div>
              </div>
            </div>

            <div style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>RT</span>
                <div style={{
                  ...s.badge,
                  background: "var(--accent-lavender-glow)"
                }}>
                  Average
                </div>
              </div>
              <div style={s.statValue}>{stats.avg_rating ? stats.avg_rating.toFixed(1) : "N/A"}</div>
              <div style={s.statLabel}>Reference Rating</div>
              <div style={s.progressBar}>
                <div style={{
                  ...s.progressFill,
                  width: `${stats.avg_rating ? (stats.avg_rating / 5) * 100 : 0}%`,
                  background: "var(--accent-lavender)"
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Reference Requests */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <h2 style={s.cardTitle}>Reference Requests</h2>
              <p style={s.cardSubtitle}>Track reference check progress</p>
            </div>
          </div>

          {loading ? (
            <div style={s.loadingContainer}>
              <div style={s.spinner}></div>
              <p style={s.loadingText}>Loading references...</p>
            </div>
          ) : references.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>ER</div>
              <div style={s.emptyText}>No reference requests yet</div>
              <div style={s.emptyHint}>Click "New Reference Request" to get started</div>
            </div>
          ) : (
            <div style={s.referencesList}>
              {references.map((ref) => {
                const statusColor = getStatusColor(ref.status);
                return (
                  <div key={ref.id} style={s.referenceCard}>
                    <div style={s.referenceHeader}>
                      <div style={s.referenceInfo}>
                        <div style={s.referenceName}>{ref.reference_name}</div>
                        <div style={s.referenceRelation}>{ref.relationship} at {ref.company}</div>
                      </div>
                      <div style={{
                        ...s.statusBadge,
                        background: statusColor.bg
                      }}>
                        {ref.status}
                      </div>
                    </div>

                    <div style={s.referenceDetails}>
                      <div style={s.detailRow}>
                        <span style={s.detailIcon}>EM</span>
                        <span style={s.detailText}>{ref.reference_email}</span>
                      </div>
                      {ref.reference_phone && (
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>PH</span>
                          <span style={s.detailText}>{ref.reference_phone}</span>
                        </div>
                      )}
                      {ref.sent_at && (
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>DT</span>
                          <span style={s.detailText}>Sent: {new Date(ref.sent_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {ref.completed_at && (
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>CP</span>
                          <span style={s.detailText}>Completed: {new Date(ref.completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div style={s.referenceActions}>
                      {ref.reminder_count > 0 && (
                        <div style={s.reminderBadge}>
                          {ref.reminder_count} reminder{ref.reminder_count > 1 ? "s" : ""} sent
                        </div>
                      )}
                      {ref.status === "sent" && (
                        <button
                          onClick={() => handleSendReminder(ref.id)}
                          style={s.btnSecondary}
                        >
                          Send Reminder
                        </button>
                      )}
                      {ref.status === "completed" && (
                        <button
                          onClick={() => viewReferenceDetails(ref.id)}
                          style={s.btnPrimary}
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Employment Verifications */}
        {verifications.length > 0 && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Employment Verifications</h2>
              <p style={s.cardSubtitle}>Verified employment history</p>
            </div>

            <div style={s.verificationsList}>
              {verifications.map((ver) => (
                <div key={ver.id} style={s.verificationCard}>
                  <div style={s.verificationHeader}>
                    <div>
                      <div style={s.verificationCompany}>{ver.company}</div>
                      <div style={s.verificationTitle}>{ver.job_title}</div>
                    </div>
                    <div style={{
                      ...s.statusBadge,
                      background: ver.verified 
                        ? "var(--color-success)"
                        : "var(--color-error)"
                    }}>
                      {ver.verified ? "VF" : "UV"}
                    </div>
                  </div>

                  <div style={s.verificationDetails}>
                    {ver.start_date && ver.end_date && (
                      <div style={s.detailRow}>
                        <span style={s.detailIcon}>DT</span>
                        <span style={s.detailText}>
                          {new Date(ver.start_date).toLocaleDateString()} - {new Date(ver.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div style={s.detailRow}>
                      <span style={s.detailIcon}>VF</span>
                      <span style={s.detailText}>Source: {ver.verification_source}</span>
                    </div>
                  </div>

                  {ver.discrepancy_flag && ver.discrepancy_notes && (
                    <div style={s.discrepancyAlert}>
                      <span style={s.alertIcon}>WN</span>
                      <div style={s.alertText}>
                        <strong>Discrepancy Detected:</strong> {ver.discrepancy_notes}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Reference Modal */}
      {showAddModal && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>New Reference Request</h3>
              <button onClick={() => setShowAddModal(false)} style={s.closeBtn}>
                ✕
              </button>
            </div>

            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Reference Name *</label>
                <input
                  type="text"
                  value={newReference.name}
                  onChange={(e) => setNewReference({ ...newReference, name: e.target.value })}
                  placeholder="John Smith"
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Email *</label>
                <input
                  type="email"
                  value={newReference.email}
                  onChange={(e) => setNewReference({ ...newReference, email: e.target.value })}
                  placeholder="john.smith@company.com"
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Phone (Optional)</label>
                <input
                  type="tel"
                  value={newReference.phone}
                  onChange={(e) => setNewReference({ ...newReference, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Relationship *</label>
                <select
                  value={newReference.relationship}
                  onChange={(e) => setNewReference({ ...newReference, relationship: e.target.value })}
                  style={s.select}
                >
                  <option value="manager">Manager</option>
                  <option value="colleague">Colleague</option>
                  <option value="direct_report">Direct Report</option>
                  <option value="hr">HR Representative</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Company *</label>
                <input
                  type="text"
                  value={newReference.company}
                  onChange={(e) => setNewReference({ ...newReference, company: e.target.value })}
                  placeholder="Acme Corporation"
                  style={s.input}
                />
              </div>

              <div style={s.candidateInfo}>
                <span style={s.infoIcon}>RF</span>
                <span style={s.infoText}>Request for: <strong>{selectedCandidateName}</strong></span>
              </div>

              <div style={s.modalFooter}>
                <button onClick={() => setShowAddModal(false)} style={s.btnSecondary}>
                  Cancel
                </button>
                <button onClick={handleCreateReference} style={s.btnPrimary}>
                  Send Reference Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Details Modal */}
      {showDetailsModal && referenceDetails && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Reference Details</h3>
              <button onClick={() => setShowDetailsModal(false)} style={s.closeBtn}>
                ✕
              </button>
            </div>

            <div style={s.modalBody}>
              <div style={s.responsesList}>
                {referenceDetails.responses?.map((response: ReferenceResponse, idx: number) => (
                  <div key={idx} style={s.responseCard}>
                    <div style={s.questionText}>{response.question_text}</div>
                    {response.rating && (
                      <div style={s.ratingRow}>
                        <span style={s.ratingLabel}>Rating:</span>
                        <div style={s.stars}>
                          {"★".repeat(response.rating)}
                          {"☆".repeat(5 - response.rating)}
                        </div>
                      </div>
                    )}
                    {response.response && (
                      <div style={s.responseText}>{response.response}</div>
                    )}
                    <div style={s.responseDate}>
                      Submitted: {new Date(response.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
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
    padding: "8px 16px",
    borderRadius: 10,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
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
    transition: "width 180ms cubic-bezier(0.4, 0, 0.2, 1)",
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

  referencesList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },

  referenceCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  referenceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  referenceInfo: {
    flex: 1,
  },

  referenceName: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 4,
  },

  referenceRelation: {
    fontSize: 14,
    color: "var(--text-tertiary)",
  },

  statusBadge: {
    padding: "6px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "capitalize" as const,
  },

  referenceDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    marginBottom: 16,
    paddingLeft: 8,
  },

  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  detailIcon: {
    fontSize: 16,
  },

  detailText: {
    fontSize: 14,
    color: "var(--text-secondary)",
  },

  referenceActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTop: "1px solid var(--border-subtle)",
  },

  reminderBadge: {
    padding: "6px 12px",
    borderRadius: 8,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  verificationsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },

  verificationCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  verificationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  verificationCompany: {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 4,
  },

  verificationTitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
  },

  verificationDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    paddingLeft: 8,
  },

  discrepancyAlert: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    gap: 12,
  },

  alertIcon: {
    fontSize: 20,
  },

  alertText: {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.5,
  },

  modal: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  modalContent: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90vh",
    borderRadius: 24,
    background: "var(--surface-1)",
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

  formGroup: {
    marginBottom: 20,
  },

  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
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

  candidateInfo: {
    padding: 16,
    borderRadius: 12,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  infoIcon: {
    fontSize: 20,
  },

  infoText: {
    fontSize: 14,
    color: "var(--text-primary)",
  },

  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
  },

  responsesList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
  },

  responseCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  questionText: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 12,
  },

  ratingRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  ratingLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },

  stars: {
    fontSize: 18,
  },

  responseText: {
    fontSize: 14,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    background: "var(--surface-3)",
  },

  responseDate: {
    fontSize: 12,
    color: "var(--text-tertiary)",
  },
};
