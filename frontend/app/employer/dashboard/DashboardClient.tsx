"use client";

import * as React from "react";
import Link from "next/link";
import LoadingSpinner from "../../_components/LoadingSpinner";
import Alert from "../../_components/Alert";
import CompanyLogo from "../../components/CompanyLogo";

type Role = {
  role_id?: string;
  roleId?: string;
  id?: string;
  title?: string;
  name?: string;
  created_at?: string;
  createdAt?: string;
  assessment_id?: string;
  assessmentId?: string;
  has_assessment?: boolean;
};

type Row = {
  candidate_id?: string;
  candidateId?: string;
  name?: string;
  email?: string;
  status?: string;
  pdf_url?: string;
  pdfUrl?: string;
  created_at?: string;
  createdAt?: string;
};

async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.indexOf("application/json") !== -1) {
    return await res.json();
  }
  const text = await res.text().catch(function () { return ""; });
  const msg = text && text.trim() ? text.trim() : (res.statusText || "Request failed");
  throw new Error("[" + res.status + "] " + msg);
}

function normalizeRows(data: unknown): Row[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.rows)) return d.rows as Row[];
  if (Array.isArray(d.items)) return d.items as Row[];
  if (Array.isArray(d.submissions)) return d.submissions as Row[];
  return [];
}

function normalizeRoles(data: unknown): Role[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.roles)) return d.roles as Role[];
  if (Array.isArray(d.items)) return d.items as Role[];
  return [];
}

function pickRoleId(r: Role, i: number) {
  return r.role_id || r.roleId || r.id || ("role-" + i);
}

function pickRoleLabel(r: Role, i: number) {
  return r.title || r.name || pickRoleId(r, i);
}

function pickAssessmentId(r?: Role) {
  return r?.assessment_id || r?.assessmentId || "";
}

function pickRowId(r: Row, i: number) {
  return r.candidate_id || r.candidateId || ("row-" + i);
}

function pickPdf(r: Row) {
  return r.pdf_url || r.pdfUrl || "";
}

function pickStatus(r: Row): string {
  const s = (r.status || "").toLowerCase();
  if (s.indexOf("ready") !== -1) return "Ready";
  if (s.indexOf("fail") !== -1) return "Failed";
  if (s.indexOf("process") !== -1) return "Processing";
  if (pickPdf(r)) return "Ready";
  return "Processing";
}

export default function DashboardClient() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [rolesLoading, setRolesLoading] = React.useState(true);
  const [rolesError, setRolesError] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [roleId, setRoleId] = React.useState<string>("");
  const [verificationRequired, setVerificationRequired] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = React.useState(false);
  const [copiedApplicantLink, setCopiedApplicantLink] = React.useState(false);
  const [compareNotice, setCompareNotice] = React.useState<string | null>(null);

  const [rows, setRows] = React.useState<Row[]>([]);
  const lastSubmissionsRoleRef = React.useRef<string>("");
  
  // Comparison state
  const [selectedCandidates, setSelectedCandidates] = React.useState<string[]>([]);

  function toggleCandidate(candidateId: string) {
    setCompareNotice(null);
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  }

  function handleCompare() {
    if (selectedCandidates.length < 2) {
      setCompareNotice("Select at least two candidates before opening comparison.");
      return;
    }
    setCompareNotice(null);
    window.location.href = `/employer/candidates/compare?ids=${selectedCandidates.join(",")}`;
  }

  async function loadRoles() {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await fetch("/api/employer/roles", { 
        credentials: "include"
      });
      const data = await safeJson(res);
      if (!res.ok) {
        const detail = data && typeof data === "object" && "detail" in data ? (data as { detail?: unknown }).detail : null;
        const code = detail && typeof detail === "object" && "code" in detail ? (detail as { code?: string }).code : "";
        if (res.status === 403 && code === "EMAIL_VERIFICATION_REQUIRED") {
          setVerificationRequired(true);
          setRoles([]);
          return;
        }
        throw new Error(data && data.detail ? String(data.detail) : "Failed to load roles");
      }
      setVerificationRequired(false);
      const list = normalizeRoles(data);
      setRoles(list);

      // Choose role: localStorage -> first role
      let preferred = "";
      try {
        preferred = window.localStorage.getItem("latest_role_id") || "";
      } catch {}

      const preferredExists = preferred && list.some(function (r, i) {
        return pickRoleId(r, i) === preferred;
      });

      if (preferredExists) {
        setRoleId(preferred);
      } else if (list.length > 0) {
        const firstRoleId = pickRoleId(list[0], 0);
        setRoleId(firstRoleId);
        if (preferred && preferred !== firstRoleId) {
          try {
            window.localStorage.setItem("latest_role_id", firstRoleId);
          } catch {}
        }
      } else {
        setRoleId("");
        setRows([]);
        lastSubmissionsRoleRef.current = "";
      }
    } catch (e: unknown) {
      const err = e as Error;
      setRolesError(err && err.message ? String(err.message) : "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  }

  async function resendVerificationEmail() {
    setResendingVerification(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Could not resend verification email");
      }
      setResendMessage(data?.message || "Verification email sent. Please check your inbox.");
    } catch (e: unknown) {
      const err = e as Error;
      setResendMessage(err?.message || "Could not resend verification email");
    } finally {
      setResendingVerification(false);
    }
  }

  async function loadSubmissions(currentRoleId: string, force = false) {
    if (!currentRoleId) {
      setRows([]);
      setLoading(false);
      return;
    }

    if (!force && lastSubmissionsRoleRef.current === currentRoleId) {
      return;
    }

    lastSubmissionsRoleRef.current = currentRoleId;
    setLoading(true);
    setError(null);
    setSelectedCandidates([]);
    try {
      const url = `/api/employer/roles/${encodeURIComponent(currentRoleId)}/submissions`;
      const res = await fetch(url, { 
        credentials: "include"
      });
      if (res.status === 404) {
        setRows([]);
        setError(null);
        return;
      }
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data && data.detail ? String(data.detail) : "We could not refresh applicants right now.");
      }
      setRows(normalizeRows(data));
    } catch (e: unknown) {
      const err = e as Error;
      setError(err && err.message ? String(err.message) : "We could not refresh applicants right now.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(function () {
    loadRoles();
  }, []);

  async function deleteRole(roleIdToDelete: string, roleName: string) {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/employer/roles/${encodeURIComponent(roleIdToDelete)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Failed to delete role");
      }

      // Remove from local state
      setRoles(prev => prev.filter(r => pickRoleId(r, 0) !== roleIdToDelete));
      
      // If we deleted the selected role, clear selection
      if (roleId === roleIdToDelete) {
        setRoleId("");
        setRows([]);
      }

      alert(`Role "${roleName}" deleted successfully`);
    } catch (e: unknown) {
      const err = e as Error;
      alert(err?.message || "Failed to delete role");
    }
  }

  React.useEffect(function () {
    if (!roleId) return;

    // persist selected role for convenience
    try {
      window.localStorage.setItem("latest_role_id", roleId);
    } catch {}

    loadSubmissions(roleId);
  }, [roleId]);

  const statusConfig: Record<string, { bg: string; border: string; icon: string }> = {
    Ready: { bg: "rgba(133, 182, 156, 0.15)", border: "var(--color-success)", icon: "" },
    Processing: { bg: "rgba(196, 176, 137, 0.15)", border: "var(--color-warning)", icon: "" },
    Failed: { bg: "rgba(196, 137, 137, 0.15)", border: "var(--color-error)", icon: "" }
  };
  const selectedRole = roles.find(function (r, i) {
    return pickRoleId(r, i) === roleId;
  });
  const selectedRoleLabel = selectedRole ? pickRoleLabel(selectedRole, roles.indexOf(selectedRole)) : roleId;
  const selectedAssessmentId = pickAssessmentId(selectedRole);
  const applicantPath = selectedAssessmentId ? `/applicant/${selectedAssessmentId}` : "";
  const applicantLink = applicantPath && typeof window !== "undefined" ? `${window.location.origin}${applicantPath}` : applicantPath;

  async function copyApplicantLink() {
    if (!applicantLink) return;
    try {
      await window.navigator.clipboard.writeText(applicantLink);
      setCopiedApplicantLink(true);
      window.setTimeout(function () {
        setCopiedApplicantLink(false);
      }, 1800);
    } catch {
      setCopiedApplicantLink(false);
    }
  }

  if (verificationRequired) {
    return (
      <main style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        color: "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }} className="texture-background">
        <section style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          padding: 24,
          boxShadow: "var(--shadow-lg)",
        }}>
          <h1 style={{
            margin: "0 0 8px 0",
            fontSize: 24,
            color: "var(--text-primary)",
          }}>
            Verify your email
          </h1>
          <p style={{
            margin: "0 0 20px 0",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}>
            Check your inbox for the verification link before opening the employer dashboard.
          </p>
          <button
            type="button"
            onClick={resendVerificationEmail}
            disabled={resendingVerification}
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              cursor: resendingVerification ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {resendingVerification ? "Sending..." : "Resend verification email"}
          </button>
          {resendMessage ? (
            <p style={{
              margin: "16px 0 0 0",
              color: "var(--text-secondary)",
              fontSize: 14,
            }}>
              {resendMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--surface-0)",
      color: "var(--text-primary)",
      position: "relative" as const,
      overflow: "hidden" as const,
    }} className="texture-background epq-dashboard-root">
      {/* Main Layout Container with Sidebar */}
      <div className="epq-dashboard-layout" style={{
        display: "flex",
        minHeight: "100vh",
        position: "relative" as const,
        zIndex: 1,
      }}>
        {/* Left Sidebar - Roles */}
        <aside data-tour="roles-sidebar" className="epq-dashboard-sidebar texture-surface-1" style={{
          width: 320,
          flexShrink: 0,
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border-default)",
          display: "flex",
          flexDirection: "column" as const,
          overflowY: "auto" as const,
          maxHeight: "100vh",
          position: "relative" as const,
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: "var(--space-6) var(--space-5)",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <div style={{ marginBottom: "var(--space-3)" }}>
              <CompanyLogo size="md" variant="transparent" />
            </div>
            <h2 style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: "0 0 var(--space-1) 0",
              letterSpacing: "-0.01em",
            }}>
              Roles
            </h2>
            <p style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-tertiary)",
              margin: 0,
            }}>
              Select a role to manage applicants
            </p>
          </div>

          {/* Roles List */}
          <div style={{
            flex: 1,
            padding: "var(--space-4) var(--space-3)",
            overflowY: "auto" as const,
          }}>
            {rolesLoading ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "20px",
                justifyContent: "center",
              }}>
                <LoadingSpinner size={20} />
                <span style={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 600, fontSize: 14 }}>Loading...</span>
              </div>
            ) : rolesError ? (
              <div style={{ padding: "0 8px" }}>
                <Alert type="error" title="Could not load roles" onRetry={loadRoles}>
                  {rolesError}
                </Alert>
              </div>
            ) : roles.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "32px 16px",
              }}>
                <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12 }}>Empty</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>No roles yet</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
                  Create your first role to generate an EPQ assessment link.
                </div>
                <Link
                  data-tour="create-role-empty"
                  href="/employer/roles/create"
                  style={{
                    padding: "10px 20px",
                    borderRadius: 6,
                    background: "var(--accent-mint-glow)",
                    border: "1px solid var(--accent-mint-dim)",
                    color: "var(--accent-mint)",
                    cursor: "pointer",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: 13,
                  }}
                >
                  Create First Role
                </Link>
              </div>
            ) : (
              <>
                {roles.map(function (r, i) {
                  const id = pickRoleId(r, i);
                  const label = pickRoleLabel(r, i);
                  const isSelected = roleId === id;

                  return (
                    <div
                      data-tour="role-card"
                      key={id}
                      style={{
                        marginBottom: "var(--space-2)",
                        padding: "var(--space-4)",
                        borderRadius: 8,
                        background: isSelected ? "var(--surface-3)" : "var(--surface-2)",
                        border: isSelected
                          ? "1px solid var(--accent-blue-dim)"
                          : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onClick={function() { setRoleId(id); }}
                      onMouseEnter={function(e) {
                        if (!isSelected) {
                          e.currentTarget.style.background = "var(--surface-3)";
                          e.currentTarget.style.borderColor = "var(--border-default)";
                        }
                      }}
                      onMouseLeave={function(e) {
                        if (!isSelected) {
                          e.currentTarget.style.background = "var(--surface-2)";
                          e.currentTarget.style.borderColor = "var(--border-subtle)";
                        }
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        marginBottom: "var(--space-2)",
                      }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: isSelected
                            ? "var(--color-success)"
                            : "var(--text-tertiary)",
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            marginBottom: 2,
                            lineHeight: 1.2,
                          }}>
                            {label}
                          </div>
                          <div style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-tertiary)",
                            fontWeight: 500,
                          }}>
                            {id}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap" as const,
                      }}>
                        {/* Only show EPQ button if assessment not taken */}
                        {!r.assessment_id && !r.assessmentId && !r.has_assessment && (
                          <a
                            data-tour="setup-epq"
                            href={`/employer/roles/${id}/setup`}
                            onClick={function(e) { e.stopPropagation(); }}
                            style={{
                              flex: 1,
                              padding: "var(--space-2) var(--space-3)",
                              borderRadius: 6,
                              background: "var(--accent-lavender-glow)",
                              border: "1px solid var(--accent-lavender-dim)",
                              color: "var(--accent-lavender)",
                              textDecoration: "none",
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              textAlign: "center",
                              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                              display: "block",
                            }}
                            onMouseEnter={function(e) {
                              e.currentTarget.style.background = "rgba(212, 208, 231, 0.12)";
                            }}
                            onMouseLeave={function(e) {
                              e.currentTarget.style.background = "var(--accent-lavender-glow)";
                            }}
                          >
                            Set Up Assessment
                          </a>
                        )}
                        <a
                          href={`/employer/roles/${id}`}
                          onClick={function(e) { e.stopPropagation(); }}
                          style={{
                            flex: 1,
                            minWidth: "70px",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.08)",
                            color: "#ffffff",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            border: "1px solid rgba(255,255,255,0.15)",
                            backdropFilter: "blur(10px)",
                            transition: "all 0.2s ease",
                            display: "block",
                          }}
                          onMouseEnter={function(e) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={function(e) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          View
                        </a>
                        <button
                          onClick={function(e) {
                            e.stopPropagation();
                            deleteRole(id, label);
                          }}
                          style={{
                            flex: 1,
                            minWidth: "70px",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            border: "1px solid rgba(239,68,68,0.3)",
                            backdropFilter: "blur(10px)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={function(e) {
                            e.currentTarget.style.background = "rgba(239,68,68,0.25)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseLeave={function(e) {
                            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div style={{
            padding: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          }}>
            <Link
              data-tour="create-role-footer"
              href="/employer/roles/create"
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: 6,
                background: "var(--accent-blue-glow)",
                border: "1px solid var(--accent-blue-dim)",
                color: "var(--accent-blue)",
                cursor: "pointer",
                fontWeight: 500,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={function(e) {
                e.currentTarget.style.background = "rgba(180, 199, 231, 0.12)";
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.background = "var(--accent-blue-glow)";
              }}
            >
              Create Role / Assessment
            </Link>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="epq-dashboard-panel" style={{
          flex: 1,
          display: "flex",
          flexDirection: "column" as const,
          overflow: "hidden",
        }}>
          {/* Top Header */}
          <header data-tour="dashboard-header" className="epq-dashboard-header" style={{
            padding: "var(--space-5) var(--space-8)",
            borderBottom: "1px solid var(--border-default)",
            background: "var(--surface-1)",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
              flexWrap: "wrap" as const,
            }}>
              <div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  Dashboard
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>
                  {roleId ? `Viewing ${selectedRoleLabel}` : "Select a role from the sidebar"}
                </div>
              </div>

              <div data-tour="dashboard-actions" className="epq-dashboard-actions" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" as const }}>
                <button
                  type="button"
                  onClick={function () {
                    window.dispatchEvent(new CustomEvent("epq:start-demo-tour"));
                  }}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: 6,
                    background: "var(--surface-2)",
                    border: "1px solid var(--accent-blue-dim)",
                    color: "var(--accent-blue)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Start Product Tour
                </button>

                <a
                  data-tour="profile-link"
                  href="/employer/profile"
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: 6,
                    border: "1px solid var(--border-default)",
                    background: "var(--surface-2)",
                    cursor: "pointer",
                    fontWeight: 500,
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    display: "inline-block",
                    fontSize: "var(--text-sm)",
                    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Profile
                </a>

                <a
                  data-tour="analytics-link"
                  href="/employer/analytics"
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: 6,
                    background: "var(--accent-blue-glow)",
                    border: "1px solid var(--accent-blue-dim)",
                    color: "var(--accent-blue)",
                    cursor: "pointer",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "var(--text-sm)",
                    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Analytics
                </a>

                <a
                  data-tour="modules-link"
                  href="/employer/modules"
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: 6,
                    background: "var(--accent-mint-glow)",
                    border: "1px solid var(--accent-mint-dim)",
                    color: "var(--accent-mint)",
                    cursor: "pointer",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "var(--text-sm)",
                    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Modules
                </a>

                <a
                  data-tour="branding-link"
                  href="/employer/settings/branding"
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    borderRadius: 6,
                    background: "var(--accent-purple-glow)",
                    border: "1px solid var(--accent-purple-dim)",
                    color: "var(--accent-purple)",
                    cursor: "pointer",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "var(--text-sm)",
                    transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  Company Branding
                </a>

                {selectedCandidates.length > 0 && (
                  <button
                    onClick={handleCompare}
                    style={{
                      padding: "var(--space-2) var(--space-4)",
                      borderRadius: 6,
                      background: selectedCandidates.length >= 2
                        ? "var(--accent-peach-glow)"
                        : "var(--surface-2)",
                      border: selectedCandidates.length >= 2
                        ? "1px solid var(--accent-peach-dim)"
                        : "1px solid var(--border-default)",
                      color: selectedCandidates.length >= 2 
                        ? "var(--accent-peach)" 
                        : "var(--text-tertiary)",
                      cursor: selectedCandidates.length >= 2 ? "pointer" : "not-allowed",
                      fontWeight: 500,
                      fontSize: "var(--text-sm)",
                      transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  >
                    Compare ({selectedCandidates.length})
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area - Submissions */}
          <div data-tour="dashboard-main" className="epq-dashboard-main" style={{
            flex: 1,
            overflowY: "auto" as const,
            padding: "var(--space-8)",
            position: "relative" as const,
          }}>
            {/* Blurred Background Logo */}
            <div style={{
              position: "absolute" as const,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.03,
              filter: "blur(2px)",
              pointerEvents: "none" as const,
              zIndex: 0,
            }}>
              <CompanyLogo size="xl" variant="transparent" />
            </div>
            {!roleId ? (
              <div style={{
                textAlign: "center",
                padding: "var(--space-16) var(--space-6)",
                border: "1px dashed var(--border-default)",
                borderRadius: 8,
                background: "var(--surface-1)",
              }}>
                <div style={{ fontWeight: 600, marginBottom: "var(--space-3)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>
                  Select a role
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                  Choose a role from the sidebar to view submissions and manage candidates.
                </div>
              </div>
            ) : (
              <>
      <section
        data-tour="applicant-share"
        className="epq-applicant-share"
        style={{
          position: "relative" as const,
          zIndex: 1,
          padding: "var(--space-5)",
          marginBottom: "var(--space-5)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap" as const,
        }}
      >
        <div style={{ minWidth: 240, flex: 1 }}>
          <div className="epq-applicant-share-actions" style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            fontWeight: 700,
            marginBottom: "var(--space-2)",
          }}>
            Next step
          </div>
          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "var(--text-base)", marginBottom: 4 }}>
            {selectedAssessmentId ? "Share the applicant assessment link" : "Set up the EPQ assessment"}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            {selectedAssessmentId
              ? "Send this link to a test applicant. Completed submissions will appear below with candidate details and PDF status."
              : "This role exists, but it does not have an active assessment link yet. Set up EPQ to start collecting applicants."}
          </div>
        </div>

        {selectedAssessmentId ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexWrap: "wrap" as const,
          }}>
            <code className="epq-applicant-link-code" style={{
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid var(--border-default)",
              background: "var(--surface-2)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              maxWidth: 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}>
              {applicantLink}
            </code>
            <button
              type="button"
              onClick={copyApplicantLink}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "var(--accent-blue-glow)",
                border: "1px solid var(--accent-blue-dim)",
                color: "var(--accent-blue)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              {copiedApplicantLink ? "Copied" : "Copy Link"}
            </button>
            <a
              href={applicantPath}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "var(--text-sm)",
              }}
            >
              Open Applicant Form
            </a>
          </div>
        ) : (
          <a
            href={`/employer/roles/${encodeURIComponent(roleId)}/setup`}
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              background: "var(--accent-lavender-glow)",
              border: "1px solid var(--accent-lavender-dim)",
              color: "var(--accent-lavender)",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "var(--text-sm)",
            }}
          >
            Set Up EPQ Assessment
          </a>
        )}
      </section>

      {error && (
        <Alert type="error" title="Applicants are not available yet" onRetry={function () { loadSubmissions(roleId, true); }}>
          {error}
        </Alert>
      )}

      {compareNotice && (
        <Alert type="info" title="Candidate comparison">
          {compareNotice}
        </Alert>
      )}

      {loading && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <LoadingSpinner />
            <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "var(--text-sm)" }}>Checking applicant activity...</span>
          </div>

          {[1, 2, 3].map(function (i) {
            return (
              <div
                key={i}
                style={{
                  height: 60,
                  background: "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  borderRadius: 8,
                  marginBottom: "var(--space-3)",
                  border: "1px solid var(--border-subtle)"
                }}
              />
            );
          })}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div data-tour="submissions-empty" className="epq-empty-state" style={{
          textAlign: "center", 
          padding: "var(--space-12) var(--space-6)", 
          marginTop: "var(--space-4)", 
          border: "1px solid var(--border-default)", 
          borderRadius: 8,
          background: "var(--surface-1)",
        }}>
          <div style={{
            display: "inline-flex",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: 999,
            background: "var(--accent-mint-glow)",
            border: "1px solid var(--accent-mint-dim)",
            color: "var(--accent-mint)",
            fontSize: "var(--text-xs)",
            fontWeight: 700,
            marginBottom: "var(--space-4)",
          }}>
            Ready for applicants
          </div>
          <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>No applicants yet</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.6, maxWidth: 520, margin: "0 auto var(--space-5)" }}>
            This role is set up for review. Share the applicant link above, submit a test applicant, and completed candidates will appear here.
          </div>
          {selectedAssessmentId ? (
            <button
              type="button"
              onClick={copyApplicantLink}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "var(--accent-blue-glow)",
                border: "1px solid var(--accent-blue-dim)",
                color: "var(--accent-blue)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              {copiedApplicantLink ? "Applicant Link Copied" : "Copy Applicant Link"}
            </button>
          ) : (
            <a
              href={`/employer/roles/${encodeURIComponent(roleId)}/setup`}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "var(--accent-lavender-glow)",
                border: "1px solid var(--accent-lavender-dim)",
                color: "var(--accent-lavender)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              Set Up Assessment Link
            </a>
          )}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div data-tour="submissions-table" className="epq-table-scroll" style={{
          marginTop: "var(--space-4)", 
          border: "1px solid var(--border-subtle)", 
          borderRadius: 8, 
          overflow: "hidden", 
          background: "var(--surface-2)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-3)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ textAlign: "left", padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", width: 40, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                  <input 
                    type="checkbox" 
                    style={{ cursor: "pointer" }}
                    checked={selectedCandidates.length === rows.length && rows.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCandidates(rows.map((r, i) => pickRowId(r, i)));
                      } else {
                        setSelectedCandidates([]);
                      }
                    }}
                  />
                </th>
                <th style={{ textAlign: "left", padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Candidate</th>
                <th style={{ textAlign: "left", padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Email</th>
                <th style={{ textAlign: "left", padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Status</th>
                <th style={{ textAlign: "left", padding: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(function (r, i) {
                const id = pickRowId(r, i);
                const pdf = pickPdf(r);
                const status = (pickStatus(r));
                const cfg = statusConfig[status] || statusConfig.Processing;
                const isSelected = selectedCandidates.includes(id);

                return (
                  <tr
                    key={id}
                    style={{ 
                      borderTop: "1px solid var(--border-subtle)", 
                      transition: "background 180ms cubic-bezier(0.4, 0, 0.2, 1)",
                      background: isSelected ? "var(--accent-blue-glow)" : "transparent"
                    }}
                    onMouseEnter={function (e) { 
                      e.currentTarget.style.background = isSelected ? "rgba(180, 199, 231, 0.12)" : "var(--surface-2)"; 
                    }}
                    onMouseLeave={function (e) { 
                      e.currentTarget.style.background = isSelected ? "var(--accent-blue-glow)" : "transparent"; 
                    }}
                  >
                    <td style={{ padding: "var(--space-3)" }}>
                      <input 
                        type="checkbox" 
                        style={{ cursor: "pointer" }}
                        checked={isSelected}
                        onChange={() => toggleCandidate(id)}
                      />
                    </td>
                    <td style={{ padding: "var(--space-4)", fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--text-sm)" }}>{r.name || id}</td>
                    <td style={{ padding: "var(--space-4)", color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>{r.email || "-"}</td>
                    <td style={{ padding: "var(--space-4)" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-1) var(--space-3)",
                          borderRadius: 6,
                          border: "1px solid " + cfg.border,
                          background: cfg.bg,
                          fontSize: "var(--text-xs)",
                          fontWeight: 500,
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: "var(--space-4)" }}>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <a
                          data-tour="candidate-details-link"
                          className="epq-row-action"
                          href={`/employer/candidates/${id}`} 
                          style={{ 
                            fontWeight: 500, 
                            background: "var(--accent-blue-glow)",
                            border: "1px solid var(--accent-blue-dim)",
                            color: "var(--accent-blue)",
                            textDecoration: "none",
                            padding: "var(--space-1) var(--space-3)",
                            borderRadius: 6,
                            fontSize: "var(--text-xs)",
                            transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)"
                          }}
                          onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(180, 199, 231, 0.12)"; }}
                          onMouseLeave={function(e) { e.currentTarget.style.background = "var(--accent-blue-glow)"; }}
                        >
                          Details
                        </a>
                        {pdf && (
                          <a
                            data-tour="pdf-report-link"
                            className="epq-row-action"
                            href={`/employer/pdf-viewer?url=${encodeURIComponent(pdf)}&name=${encodeURIComponent(r.name || id)}`}
                            style={{ 
                              fontWeight: 700, 
                              background: "var(--accent-blue-glow)",
                              color: "var(--accent-blue)",
                              textDecoration: "none",
                              padding: "var(--space-1) var(--space-3)",
                              borderRadius: 6,
                              fontSize: "var(--text-xs)",
                              border: "1px solid var(--accent-blue-dim)",
                              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(180, 199, 231, 0.12)"; }}
                            onMouseLeave={function(e) { e.currentTarget.style.background = "var(--accent-blue-glow)"; }}
                          >
                            View Report
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
