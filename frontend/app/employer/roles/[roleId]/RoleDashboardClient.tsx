"use client";

import { useEffect, useMemo, useState } from "react";
import '../../../globals.css';


function normalizeSubmissions(items: any[]): any[] {
  return (items || []).map((s: any) => {
    const submitted = s.submitted_utc || s.submitted_at || s.created_at || s.createdAt || "";
    const pdfStatus = s.pdf_status || s.pdfStatus || s.status || "unknown";
    const ps = String(pdfStatus || "").toLowerCase();
    return {
      ...s,
      submitted_utc: submitted,
      pdf_status: pdfStatus,
      pdf_filename: s.pdf_filename || s.pdfFilename || s.pdf || "",
      pdf_error: s.pdf_error || s.pdfError || "",
      pdf_ready: s.pdf_ready ?? (ps === "ready" || ps === "done" || ps === "complete"),
    };
  });
}
type Role = {
  role_id: string;
  name: string;
  status: string;
  created_at?: string;
  assessment_id?: string | null;
  configured?: boolean;
};

type Submission = {
  candidate_id: string;
  applicant_name: string;
  applicant_email: string;
  assessment_id: string;
  pdf_status?: string;
  pdf_filename?: string;
  pdf_error?: string;
  submitted_utc?: string;
  pdf_ready?: boolean;
};

function fmtUtc(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function RoleDashboardClient({ roleId }: { roleId: string }) {
  // Guard: stop requests like /employer/roles/undefined/submissions
  const badRoleId = !roleId || roleId === "undefined" || roleId === "null";
  const [roles, setRoles] = useState<Role[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const role = useMemo(() => roles.find(r => r.role_id === roleId), [roles, roleId]);

  const applicantLink = useMemo(() => {
    const aid = role?.assessment_id;
    if (!aid) return "";
    if (typeof window === "undefined") return "";
    const base = window.location.origin;
    return `${base}/applicant/${aid}`;
  }, [role?.assessment_id]);

  async function loadAll() {
    if (badRoleId) {
      setErr("Role ID is missing (frontend is using roleId instead of role_id). Reload from the Roles list.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r1 = await fetch("/api/employer/roles", { cache: "no-store", credentials: "include" });
      const rolesJson = await r1.json().catch(() => null);
      if (!r1.ok) throw new Error(rolesJson?.detail ?? `Failed roles (${r1.status})`);
      setRoles(Array.isArray(rolesJson) ? rolesJson : []);

      const r2 = await fetch(`/api/employer/roles/${roleId}/submissions`, { cache: "no-store", credentials: "include" });
      const subsJson = await r2.json().catch(() => null);
      if (!r2.ok) throw new Error(subsJson?.detail ?? `Failed submissions (${r2.status})`);
      setSubs(Array.isArray(subsJson) ? subsJson : []);
    } catch (e: any) {
      setErr(e?.message ?? "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [roleId]);

  async function onDeleteRole() {
    if (!confirm("Delete this role? This will remove its assessments and submissions.")) return;
    setBusyDelete(true);
    setErr(null);
    try {
      const res = await fetch(`/api/employer/roles/${roleId}`, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail ?? `Delete failed (${res.status})`);
      window.location.href = "/employer/dashboard";
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <main className="surface-texture-fine" style={{ 
      backgroundColor: 'var(--surface)', 
      minHeight: '100vh',
      maxWidth: 980, 
      margin: "0 auto", 
      padding: 20 
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Role</div>
          <h1 style={{ margin: "6px 0 0 0", color: "var(--text)" }}>{role?.name ?? roleId}</h1>
          <div style={{ marginTop: 6, color: "var(--text-secondary)", fontSize: 13 }}>
            Status: <span style={{ fontWeight: 700, color: "var(--text)" }}>{role?.status ?? "unknown"}</span>
          </div>
        </div>

        <button
          onClick={onDeleteRole}
          disabled={busyDelete}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(239, 68, 68, 0.2)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#dc2626",
            fontWeight: 800,
            cursor: busyDelete ? "not-allowed" : "pointer",
            opacity: busyDelete ? 0.6 : 1,
            transition: "all 0.2s"
          }}
        >
          {busyDelete ? "Deleting..." : "Delete Role"}
        </button>
      </div>

      {err && (
        <div style={{ 
          marginTop: 14, 
          padding: 12, 
          borderRadius: 12, 
          border: "1px solid rgba(239, 68, 68, 0.2)", 
          backgroundColor: "rgba(239, 68, 68, 0.1)", 
          color: "#dc2626" 
        }}>
          {err}{" "}
          <button onClick={loadAll} style={{ 
            marginLeft: 10, 
            padding: "6px 10px", 
            borderRadius: 10, 
            border: "1px solid currentColor", 
            backgroundColor: "var(--surface)", 
            cursor: "pointer",
            transition: "all 0.2s"
          }}>
            Retry
          </button>
        </div>
      )}

      <section className="surface-texture-subtle" style={{ 
        marginTop: 18, 
        padding: 16, 
        borderRadius: 8, 
        border: "1px solid var(--border-subtle)", 
        backgroundColor: "var(--surface-2)",
        overflow: "hidden"
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--text-primary)", fontSize: "var(--text-base)" }}>Applicant link</div>
        {!role?.assessment_id ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            This role is not configured yet. Complete the employer EPQ for this role to generate the applicant link.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ 
              padding: "8px 10px", 
              borderRadius: 8, 
              backgroundColor: "var(--surface-3)", 
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontFamily: "monospace",
              fontSize: "var(--text-sm)"
            }}>{applicantLink}</code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(applicantLink);
                  alert("Link copied!");
                } catch {
                  alert("Copy failed. Select and copy manually.");
                }
              }}
              style={{ 
                padding: "var(--space-2) var(--space-4)", 
                borderRadius: 6, 
                border: "1px solid var(--accent-blue-dim)", 
                backgroundColor: "var(--accent-blue-glow)", 
                color: "var(--accent-blue)",
                fontWeight: 600, 
                cursor: "pointer",
                fontSize: "var(--text-sm)",
                transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)"
              }}
            >
              Copy link
            </button>
          </div>
        )}
      </section>

      <section className="surface-texture-subtle" style={{ 
        marginTop: 18, 
        padding: 16, 
        borderRadius: 8, 
        border: "1px solid var(--border-subtle)", 
        backgroundColor: "var(--surface-2)",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "var(--text-base)" }}>Submissions</div>
          <button onClick={loadAll} disabled={loading} style={{ 
            padding: "var(--space-2) var(--space-4)", 
            borderRadius: 6, 
            border: "1px solid var(--accent-mint-dim)", 
            backgroundColor: "var(--accent-mint-glow)", 
            color: "var(--accent-mint)",
            fontWeight: 600, 
            cursor: "pointer", 
            opacity: loading ? 0.6 : 1,
            fontSize: "var(--text-sm)",
            transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)"
          }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div style={{ 
            marginTop: "var(--space-4)", 
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            background: "var(--surface-1)"
          }}>Loading submissions...</div>
        ) : subs.length === 0 ? (
          <div style={{ 
            marginTop: "var(--space-4)", 
            textAlign: "center", 
            padding: "var(--space-12) var(--space-6)", 
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: 8,
            background: "var(--surface-1)"
          }}>
            <div style={{ fontSize: 38, marginBottom: "var(--space-2)" }}>📭</div>
            <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>No submissions</div>
            <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.6 }}>Share the applicant link to start receiving responses.</div>
          </div>
        ) : (
          <div style={{ 
            marginTop: "var(--space-4)", 
            border: "1px solid var(--border-subtle)", 
            borderRadius: 8, 
            overflow: "hidden", 
            background: "var(--surface-2)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ 
                  background: "var(--surface-3)", 
                  borderBottom: "1px solid var(--border-default)" 
                }}>
                  <th style={{ 
                    textAlign: "left", 
                    padding: "var(--space-4)", 
                    fontSize: "var(--text-xs)", 
                    color: "var(--text-tertiary)", 
                    fontWeight: 600, 
                    letterSpacing: "0.1em", 
                    textTransform: "uppercase" as const 
                  }}>Candidate</th>
                  <th style={{ 
                    textAlign: "left", 
                    padding: "var(--space-4)", 
                    fontSize: "var(--text-xs)", 
                    color: "var(--text-tertiary)", 
                    fontWeight: 600, 
                    letterSpacing: "0.1em", 
                    textTransform: "uppercase" as const 
                  }}>Email</th>
                  <th style={{ 
                    textAlign: "left", 
                    padding: "var(--space-4)", 
                    fontSize: "var(--text-xs)", 
                    color: "var(--text-tertiary)", 
                    fontWeight: 600, 
                    letterSpacing: "0.1em", 
                    textTransform: "uppercase" as const 
                  }}>Submitted</th>
                  <th style={{ 
                    textAlign: "left", 
                    padding: "var(--space-4)", 
                    fontSize: "var(--text-xs)", 
                    color: "var(--text-tertiary)", 
                    fontWeight: 600, 
                    letterSpacing: "0.1em", 
                    textTransform: "uppercase" as const 
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr 
                    key={s.candidate_id} 
                    style={{ 
                      borderTop: "1px solid var(--border-subtle)", 
                      transition: "background 180ms cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ 
                      padding: "var(--space-4)", 
                      fontWeight: 600, 
                      color: "var(--text-primary)", 
                      fontSize: "var(--text-sm)" 
                    }}>{s.applicant_name ?? s.candidate_id}</td>
                    <td style={{ 
                      padding: "var(--space-4)", 
                      color: "var(--text-secondary)", 
                      fontSize: "var(--text-sm)" 
                    }}>{s.applicant_email}</td>
                    <td style={{ 
                      padding: "var(--space-4)", 
                      color: "var(--text-secondary)", 
                      fontSize: "var(--text-sm)" 
                    }}>{fmtUtc(s.submitted_utc)}</td>
                    <td style={{ padding: "var(--space-4)" }}>
    {s.pdf_ready ? (
      <a
        href={`/api/employer/pdf/${s.candidate_id}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-1) var(--space-3)",
          borderRadius: 6,
          border: "1px solid var(--accent-blue-dim)",
          backgroundColor: "var(--accent-blue-glow)",
          color: "var(--accent-blue)",
          fontWeight: 500,
          fontSize: "var(--text-xs)",
          textDecoration: "none",
          transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        View PDF
      </a>
    ) : (
      <span style={{ 
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-3)",
        borderRadius: 6,
        border: "1px solid var(--color-warning)",
        background: "rgba(196, 176, 137, 0.15)",
        color: "var(--text-secondary)", 
        fontSize: "var(--text-xs)",
        fontWeight: 500
      }}>
        {String(s.pdf_status || "processing")}
      </span>
    )}
  </td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}


