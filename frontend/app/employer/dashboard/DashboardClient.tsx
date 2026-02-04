"use client";

import * as React from "react";
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

function pickRowId(r: Row, i: number) {
  return r.candidate_id || r.candidateId || ("row-" + i);
}

function pickPdf(r: Row) {
  return r.pdf_url || r.pdfUrl || "";
}

function pickStatus(r: Row) {
  const s = (r.status || "").toLowerCase();
  if (s.indexOf("ready") !== -1) return "Ready";
  if (s.indexOf("fail") !== -1) return "Failed";
  if (s.indexOf("process") !== -1) return "Processing";
  if (pickPdf(r)) return "Ready";
  return "Processing";
}

export default function DashboardClient() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [rolesLoading, setRolesLoading] = React.useState(true);
  const [rolesError, setRolesError] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [roleId, setRoleId] = React.useState<string>("");

  const [rows, setRows] = React.useState<Row[]>([]);
  
  // Comparison state
  const [selectedCandidates, setSelectedCandidates] = React.useState<string[]>([]);

  function toggleCandidate(candidateId: string) {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  }

  function handleCompare() {
    if (selectedCandidates.length < 2) {
      alert("Please select at least 2 candidates to compare");
      return;
    }
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
        throw new Error(data && data.detail ? String(data.detail) : "Failed to load roles");
      }
      const list = normalizeRoles(data);
      setRoles(list);

      // Choose role: localStorage -> first role
      let preferred = "";
      try {
        preferred = window.localStorage.getItem("latest_role_id") || "";
      } catch (e) {}

      if (preferred) {
        setRoleId(preferred);
      } else if (list.length > 0) {
        setRoleId(pickRoleId(list[0], 0));
      }
    } catch (e: unknown) {
      const err = e as Error;
      setRolesError(err && err.message ? String(err.message) : "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  }

  async function loadSubmissions(currentRoleId: string) {
    if (!currentRoleId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `/api/employer/roles/${encodeURIComponent(currentRoleId)}/submissions`;
      const res = await fetch(url, { 
        credentials: "include"
      });
      const data = await safeJson(res);
      if (!res.ok) {
        if (res.status === 404 && data && data.detail === "Role not found") {
          // Role doesn't belong to current user - clear cache and show helpful error
          try {
            window.localStorage.removeItem("latest_role_id");
          } catch (e) {}
          throw new Error("Role not found. You may be logged in with a different account. Please logout and login again.");
        }
        throw new Error(data && data.detail ? String(data.detail) : "Failed to load submissions");
      }
      setRows(normalizeRows(data));
    } catch (e: unknown) {
      const err = e as Error;
      setError(err && err.message ? String(err.message) : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(function () {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (e) {}

    loadSubmissions(roleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const statusConfig: Record<string, { bg: string; border: string; icon: string }> = {
    Ready: { bg: "rgba(133, 182, 156, 0.15)", border: "var(--color-success)", icon: "" },
    Processing: { bg: "rgba(196, 176, 137, 0.15)", border: "var(--color-warning)", icon: "" },
    Failed: { bg: "rgba(196, 137, 137, 0.15)", border: "var(--color-error)", icon: "" }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--surface-0)",
      color: "var(--text-primary)",
      position: "relative" as const,
      overflow: "hidden" as const,
    }} className="texture-background">
      

      {/* Main Layout Container with Sidebar */}
      <div style={{
        display: "flex",
        minHeight: "100vh",
        position: "relative" as const,
        zIndex: 1,
      }}>
        {/* Left Sidebar - Roles */}
        <aside style={{
          width: 320,
          flexShrink: 0,
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border-default)",
          display: "flex",
          flexDirection: "column" as const,
          overflowY: "auto" as const,
          maxHeight: "100vh",
          position: "relative" as const,
        }} className="texture-surface-1">
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
              Select to view submissions
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
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>No roles yet</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
                  Create your first role
                </div>
                <a
                  href="/employer/roles/create"
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: 13,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
                  }}
                >
                  ➕ Create Role
                </a>
              </div>
            ) : (
              <>
                {roles.map(function (r, i) {
                  const id = pickRoleId(r, i);
                  const label = pickRoleLabel(r, i);
                  const isSelected = roleId === id;

                  return (
                    <div
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
                            Setup EPQ
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
            <a
              href="/employer/roles/create"
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: 6,
                background: "var(--accent-mint-glow)",
                border: "1px solid var(--accent-mint-dim)",
                color: "var(--accent-mint)",
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
                e.currentTarget.style.background = "rgba(196, 231, 212, 0.12)";
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.background = "var(--accent-mint-glow)";
              }}
            >
              Create New Role
            </a>
          </div>
        </aside>

        {/* Right Content Area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column" as const,
          overflow: "hidden",
        }}>
          {/* Top Header */}
          <header style={{
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
                  {roleId ? `Viewing submissions for ${roles.find(r => pickRoleId(r, roles.indexOf(r)) === roleId) ? pickRoleLabel(roles.find(r => pickRoleId(r, roles.indexOf(r)) === roleId)!, roles.indexOf(roles.find(r => pickRoleId(r, roles.indexOf(r)) === roleId)!)) : roleId}` : "Select a role from the sidebar"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" as const }}>
                <a
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
          <div style={{
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
      {error && (
        <Alert type="error" title="Could not load submissions" onRetry={function () { loadSubmissions(roleId); }}>
          {error}
        </Alert>
      )}

      {loading && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <LoadingSpinner />
            <span style={{ color: "var(--text-secondary)", fontWeight: 500, fontSize: "var(--text-sm)" }}>Loading submissions...</span>
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
        <div style={{ 
          textAlign: "center", 
          padding: "var(--space-12) var(--space-6)", 
          marginTop: "var(--space-4)", 
          border: "1px solid var(--border-default)", 
          borderRadius: 8,
          background: "var(--surface-1)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>No submissions</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Share your role assessment link to start receiving applicant submissions.
          </div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div style={{ 
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
                            href={`/employer/pdf-viewer?url=${encodeURIComponent(pdf)}&name=${encodeURIComponent(r.name || id)}`}
                            style={{ 
                              fontWeight: 700, 
                              background: "rgba(255,255,255,0.08)",
                              color: "#ffffff",
                              textDecoration: "none",
                              padding: "6px 14px",
                              borderRadius: 8,
                              fontSize: 13,
                              border: "1px solid rgba(255,255,255,0.1)",
                              backdropFilter: "blur(10px)",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                            onMouseLeave={function(e) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(0)"; }}
                          >
                            📑 PDF
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

