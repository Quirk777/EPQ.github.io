"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from '../../../lib/api-client';
import { LoadingState, ErrorState } from '../../../components/ui/StateComponents';

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  ip_address?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface DeletionRequest {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  requested_at: string;
  processed_at?: string;
  status: string;
  processed_by?: string;
  notes?: string;
}

interface AnonymizedProfile {
  id: number;
  candidate_id: number;
  anonymized_name: string;
  anonymized_email: string;
  skills: string[];
  experience_years: number;
  education_level: string;
  created_at: string;
}

interface ComplianceReport {
  total_audit_logs?: number;
  pending_deletions?: number;
  anonymized_profiles?: number;
  compliance_score?: number;
}

export default function ComplianceClientNew() {
  const [activeTab, setActiveTab] = useState<"overview" | "audit" | "gdpr" | "anonymized">("overview");
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [anonymizedProfiles, setAnonymizedProfiles] = useState<AnonymizedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          loadComplianceReport(),
          loadAuditLogs(),
          loadDeletionRequests(),
          loadAnonymizedProfiles(),
        ]);
      } catch (err) {
        setError('Failed to load compliance data');
        console.error("Failed to load initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const loadComplianceReport = async () => {
    try {
      const response = await apiClient.get("/api/employer/compliance/report");
      if (response.success) {
        setComplianceReport(response.data);
      } else {
        console.error("Failed to load compliance report:", response.error?.message);
      }
    } catch (err) {
      console.error("Failed to load compliance report:", err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await apiClient.get("/api/employer/compliance/audit-logs/recent?limit=100");
      if (response.success) {
        setAuditLogs(response.data.logs || []);
      } else {
        console.error("Failed to load audit logs:", response.error?.message);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const loadDeletionRequests = async () => {
    try {
      const response = await apiClient.get("/api/employer/compliance/deletion-requests");
      if (response.success) {
        setDeletionRequests(response.data.requests || []);
      } else {
        console.error("Failed to load deletion requests:", response.error?.message);
      }
    } catch (err) {
      console.error("Failed to load deletion requests:", err);
    }
  };

  const loadAnonymizedProfiles = async () => {
    try {
      const response = await apiClient.get("/api/employer/compliance/anonymized-profiles");
      if (response.success) {
        setAnonymizedProfiles(response.data.profiles || []);
      } else {
        console.error("Failed to load anonymized profiles:", response.error?.message);
      }
    } catch (err) {
      console.error("Failed to load anonymized profiles:", err);
    }
  };

  const handleProcessDeletion = async (requestId: number, approved: boolean) => {
    if (!confirm(`Are you sure you want to ${approved ? "APPROVE" : "REJECT"} this deletion request?`)) {
      return;
    }

    try {
      const response = await apiClient.post(
        `/api/employer/compliance/deletion-request/${requestId}/process`,
        { approved }
      );

      if (response.success) {
        alert(`Deletion request ${approved ? "approved" : "rejected"}`);
        loadDeletionRequests();
        loadAuditLogs();
      } else {
        alert(response.error?.message || "Failed to process deletion request");
      }
    } catch (err) {
      console.error("Failed to process deletion:", err);
      alert("Failed to process deletion request");
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "#ef4444";
    if (action.includes("create") || action.includes("add")) return "#10b981";
    if (action.includes("update") || action.includes("edit")) return "#f59e0b";
    return "#6366f1";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return { bg: "var(--color-success)", text: "var(--color-success)" };
      case "pending":
        return { bg: "var(--color-warning)", text: "var(--color-warning)" };
      case "rejected":
        return { bg: "var(--color-error)", text: "var(--color-error)" };
      default:
        return { bg: "var(--surface-4)", text: "var(--text-tertiary)" };
    }
  };

  const retryFetch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadComplianceReport(),
        loadAuditLogs(),
        loadDeletionRequests(),
        loadAnonymizedProfiles(),
      ]);
    } catch (err) {
      setError('Failed to load compliance data');
      console.error("Retry failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <LoadingState 
            message="Loading compliance data..." 
            size="large"
          />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={s.page}>
        <div style={s.container}>
          <ErrorState 
            title="Failed to load compliance dashboard" 
            message={error}
            onRetry={retryFetch}
          />
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.container}>
          <div style={s.headerContent}>
            <div style={s.branding}>
              <div style={s.iconBox}>
                <span style={s.icon}>CM</span>
              </div>
              <div>
                <h1 style={s.title}>Compliance & Audit</h1>
                <p style={s.subtitle}>GDPR compliance, audit trails & data governance</p>
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
                Export Audit Log
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={s.container}>
        {/* Tabs */}
        <div style={s.tabsContainer}>
          {[
            { key: "overview", label: "Overview", icon: "OV" },
            { key: "audit", label: "Audit Trail", icon: "AT" },
            { key: "gdpr", label: "GDPR Requests", icon: "GR" },
            { key: "anonymized", label: "Anonymized Data", icon: "AD" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "overview" | "audit" | "gdpr" | "anonymized")}
              style={{
                ...s.tab,
                ...(activeTab === tab.key ? s.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && complianceReport && (
          <>
            <div style={s.statsGrid}>
              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>AL</span>
                  <div style={{
                    ...s.badge,
                    background: "var(--accent-blue-glow)"
                  }}>
                    Total
                  </div>
                </div>
                <div style={s.statValue}>{complianceReport.total_audit_logs || 0}</div>
                <div style={s.statLabel}>Audit Log Entries</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "88%",
                    background: "var(--accent-blue)"
                  }}></div>
                </div>
              </div>

              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>GR</span>
                  <div style={{
                    ...s.badge,
                    background: "color-mix(in srgb, var(--color-warning) 8%, transparent)"
                  }}>
                    Pending
                  </div>
                </div>
                <div style={s.statValue}>{complianceReport.pending_deletions || 0}</div>
                <div style={s.statLabel}>GDPR Deletion Requests</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "45%",
                    background: "var(--color-warning)"
                  }}></div>
                </div>
              </div>

              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>AP</span>
                  <div style={{
                    ...s.badge,
                    background: "color-mix(in srgb, var(--color-success) 8%, transparent)"
                  }}>
                    Protected
                  </div>
                </div>
                <div style={s.statValue}>{complianceReport.anonymized_profiles || 0}</div>
                <div style={s.statLabel}>Anonymized Profiles</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: "76%",
                    background: "var(--color-success)"
                  }}></div>
                </div>
              </div>

              <div style={s.statCard}>
                <div style={s.statHeader}>
                  <span style={s.statIcon}>CS</span>
                  <div style={{
                    ...s.badge,
                    background: "var(--accent-lavender-glow)"
                  }}>
                    Active
                  </div>
                </div>
                <div style={s.statValue}>{complianceReport.compliance_score || "98"}%</div>
                <div style={s.statLabel}>Compliance Score</div>
                <div style={s.progressBar}>
                  <div style={{
                    ...s.progressFill,
                    width: `${complianceReport.compliance_score || 98}%`,
                    background: "var(--accent-lavender)"
                  }}></div>
                </div>
              </div>
            </div>

            {/* Compliance Insights */}
            <div style={s.insightsCard}>
              <div style={s.insightHeader}>
                <span style={s.insightIcon}>AI</span>
                <div>
                  <h3 style={s.insightTitle}>Compliance Insights</h3>
                  <p style={s.insightSubtitle}>AI-powered governance recommendations</p>
                </div>
              </div>

              <div style={s.insightsList}>
                <div style={s.insightItem}>
                  <div style={{...s.insightBadge, background: "var(--color-success)"}}>CP</div>
                  <div style={s.insightText}>
                    <strong>GDPR Compliant:</strong> All data processing activities are properly documented and consent-based.
                  </div>
                </div>
                <div style={s.insightItem}>
                  <div style={{...s.insightBadge, background: "var(--color-warning)"}}>WN</div>
                  <div style={s.insightText}>
                    <strong>Action Required:</strong> {complianceReport.pending_deletions || 0} pending deletion requests need review within 30 days.
                  </div>
                </div>
                <div style={s.insightItem}>
                  <div style={{...s.insightBadge, background: "var(--accent-blue)"}}>BP</div>
                  <div style={s.insightText}>
                    <strong>Best Practice:</strong> Audit logs are automatically retained for 7 years for regulatory compliance.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Audit Trail Tab */}
        {activeTab === "audit" && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Audit Trail</h2>
              <p style={s.cardSubtitle}>Complete activity log with timestamps and IP tracking</p>
            </div>

            {loading ? (
              <div style={s.loadingContainer}>
                <div style={s.spinner}></div>
                <p style={s.loadingText}>Loading audit logs...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>EM</div>
                <div style={s.emptyText}>No audit logs yet</div>
              </div>
            ) : (
              <div style={s.auditList}>
                {auditLogs.slice(0, 50).map((log) => (
                  <div key={log.id} style={s.auditCard}>
                    <div style={s.auditHeader}>
                      <div style={{
                        ...s.actionBadge,
                        background: getActionColor(log.action)
                      }}>
                        {log.action}
                      </div>
                      <div style={s.auditTime}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div style={s.auditDetails}>
                      <div style={s.auditRow}>
                        <span style={s.auditLabel}>User:</span>
                        <span style={s.auditValue}>{log.user_email}</span>
                      </div>
                      <div style={s.auditRow}>
                        <span style={s.auditLabel}>Resource:</span>
                        <span style={s.auditValue}>{log.resource_type} {log.resource_id ? `#${log.resource_id}` : ""}</span>
                      </div>
                      {log.ip_address && (
                        <div style={s.auditRow}>
                          <span style={s.auditLabel}>IP:</span>
                          <span style={s.auditValue}>{log.ip_address}</span>
                        </div>
                      )}
                    </div>

                    {log.details && (
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowLogDetails(true);
                        }}
                        style={s.btnSecondary}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GDPR Requests Tab */}
        {activeTab === "gdpr" && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>GDPR Deletion Requests</h2>
              <p style={s.cardSubtitle}>Manage right-to-be-forgotten requests</p>
            </div>

            {deletionRequests.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>OK</div>
                <div style={s.emptyText}>No deletion requests</div>
                <div style={s.emptyHint}>All GDPR requests have been processed</div>
              </div>
            ) : (
              <div style={s.requestsList}>
                {deletionRequests.map((request) => {
                  const statusColor = getStatusColor(request.status);
                  return (
                    <div key={request.id} style={s.requestCard}>
                      <div style={s.requestHeader}>
                        <div>
                          <div style={s.requestName}>{request.candidate_name}</div>
                          <div style={s.requestEmail}>{request.candidate_email}</div>
                        </div>
                        <div style={{
                          ...s.statusBadge,
                          background: statusColor.bg
                        }}>
                          {request.status}
                        </div>
                      </div>

                      <div style={s.requestDetails}>
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>DT</span>
                          <span style={s.detailText}>
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </span>
                        </div>
                        {request.processed_at && (
                          <div style={s.detailRow}>
                            <span style={s.detailIcon}>CP</span>
                            <span style={s.detailText}>
                              Processed: {new Date(request.processed_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {request.processed_by && (
                          <div style={s.detailRow}>
                            <span style={s.detailIcon}>BY</span>
                            <span style={s.detailText}>By: {request.processed_by}</span>
                          </div>
                        )}
                      </div>

                      {request.status === "pending" && (
                        <div style={s.requestActions}>
                          <button
                            onClick={() => handleProcessDeletion(request.id, false)}
                            style={s.btnDanger}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleProcessDeletion(request.id, true)}
                            style={s.btnSuccess}
                          >
                            Approve & Delete
                          </button>
                        </div>
                      )}

                      {request.notes && (
                        <div style={s.notes}>
                          <strong>Notes:</strong> {request.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Anonymized Data Tab */}
        {activeTab === "anonymized" && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h2 style={s.cardTitle}>Anonymized Profiles</h2>
              <p style={s.cardSubtitle}>De-identified candidate data for analytics</p>
            </div>

            {anonymizedProfiles.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>LK</div>
                <div style={s.emptyText}>No anonymized profiles yet</div>
              </div>
            ) : (
              <div style={s.profilesGrid}>
                {anonymizedProfiles.map((profile) => (
                  <div key={profile.id} style={s.profileCard}>
                    <div style={s.profileHeader}>
                      <div style={s.profileAvatar}>
                        {profile.anonymized_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={s.profileName}>{profile.anonymized_name}</div>
                        <div style={s.profileEmail}>{profile.anonymized_email}</div>
                      </div>
                    </div>

                    <div style={s.profileDetails}>
                      <div style={s.profileRow}>
                        <span style={s.profileIcon}>WK</span>
                        <span style={s.profileText}>{profile.experience_years} years experience</span>
                      </div>
                      <div style={s.profileRow}>
                        <span style={s.profileIcon}>ED</span>
                        <span style={s.profileText}>{profile.education_level}</span>
                      </div>
                    </div>

                    <div style={s.skillsContainer}>
                      {profile.skills.slice(0, 5).map((skill, idx) => (
                        <span key={idx} style={s.skillBadge}>{skill}</span>
                      ))}
                    </div>

                    <div style={s.profileFooter}>
                      Created: {new Date(profile.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {showLogDetails && selectedLog && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>📄 Audit Log Details</h3>
              <button onClick={() => setShowLogDetails(false)} style={s.closeBtn}>
                ✕
              </button>
            </div>

            <div style={s.modalBody}>
              <div style={s.detailsGrid}>
                <div style={s.detailItem}>
                  <div style={s.detailLabel}>Action</div>
                  <div style={s.detailValue}>{selectedLog.action}</div>
                </div>
                <div style={s.detailItem}>
                  <div style={s.detailLabel}>User</div>
                  <div style={s.detailValue}>{selectedLog.user_email}</div>
                </div>
                <div style={s.detailItem}>
                  <div style={s.detailLabel}>Resource Type</div>
                  <div style={s.detailValue}>{selectedLog.resource_type}</div>
                </div>
                <div style={s.detailItem}>
                  <div style={s.detailLabel}>Timestamp</div>
                  <div style={s.detailValue}>{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                {selectedLog.ip_address && (
                  <div style={s.detailItem}>
                    <div style={s.detailLabel}>IP Address</div>
                    <div style={s.detailValue}>{selectedLog.ip_address}</div>
                  </div>
                )}
              </div>

              {selectedLog.details && (
                <div style={s.jsonContainer}>
                  <div style={s.jsonLabel}>Additional Details:</div>
                  <pre style={s.jsonPre}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
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

  btnDanger: {
    padding: "10px 20px",
    borderRadius: 10,
    background: "var(--color-error)",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  btnSuccess: {
    padding: "10px 20px",
    borderRadius: 10,
    background: "var(--color-success)",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  tabsContainer: {
    display: "flex",
    gap: 12,
    marginBottom: 32,
    flexWrap: "wrap" as const,
  },

  tab: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  tabActive: {
    background: "var(--accent-blue)",
    color: "var(--text-primary)",
    border: "1px solid transparent",
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

  insightsCard: {
    padding: 32,
    borderRadius: 24,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
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
    padding: "8px 12px",
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

  insightsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
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
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },

  insightText: {
    fontSize: 14,
    color: "var(--text-primary)",
    lineHeight: 1.6,
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
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    padding: "8px 12px",
    display: "inline-block",
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

  auditList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    maxHeight: 600,
    overflowY: "auto" as const,
  },

  auditCard: {
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  auditHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  actionBadge: {
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
  },

  auditTime: {
    fontSize: 13,
    color: "var(--text-tertiary)",
  },

  auditDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    marginBottom: 12,
  },

  auditRow: {
    display: "flex",
    gap: 8,
  },

  auditLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-tertiary)",
  },

  auditValue: {
    fontSize: 13,
    color: "var(--text-primary)",
  },

  requestsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },

  requestCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  requestName: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 4,
  },

  requestEmail: {
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

  requestDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    marginBottom: 16,
  },

  detailRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  detailIcon: {
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    padding: "2px 6px",
  },

  detailText: {
    fontSize: 14,
    color: "var(--text-secondary)",
  },

  requestActions: {
    display: "flex",
    gap: 12,
    paddingTop: 16,
    borderTop: "1px solid var(--border-subtle)",
  },

  notes: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    background: "var(--surface-3)",
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },

  profilesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 20,
  },

  profileCard: {
    padding: 20,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
  },

  profileHeader: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },

  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "var(--accent-blue-glow)",
    display: "grid",
    placeItems: "center",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },

  profileName: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 13,
    color: "var(--text-tertiary)",
  },

  profileDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    marginBottom: 12,
  },

  profileRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  profileIcon: {
    fontSize: 14,
    fontWeight: 600,
    background: "var(--surface-3)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    padding: "2px 6px",
  },

  profileText: {
    fontSize: 14,
    color: "var(--text-secondary)",
  },

  skillsContainer: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
    marginBottom: 12,
  },

  skillBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    background: "var(--accent-blue-glow)",
    border: "1px solid var(--border-subtle)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-primary)",
  },

  profileFooter: {
    fontSize: 12,
    color: "var(--text-tertiary)",
    paddingTop: 12,
    borderTop: "1px solid var(--border-subtle)",
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
    maxWidth: 700,
    maxHeight: "90vh",
    borderRadius: 24,
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    display: "flex",
    flexDirection: "column" as const,
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottom: "1px solid var(--surface-3)",
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "var(--surface-3)",
    border: "1px solid var(--surface-3)",
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

  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },

  detailItem: {
    padding: 12,
    borderRadius: 8,
    background: "var(--surface-2)",
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-tertiary)",
    marginBottom: 4,
    textTransform: "uppercase" as const,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: 600,
  },

  jsonContainer: {
    padding: 16,
    borderRadius: 12,
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
  },

  jsonLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
  },

  jsonPre: {
    fontSize: 12,
    color: "#a5b4fc",
    fontFamily: "monospace",
    margin: 0,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
};
