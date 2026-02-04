"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CompanyLogo from "../../components/CompanyLogo";
import { usePathname, useRouter } from "next/navigation";

type Role = { role_id: string; name: string; status: string; created_at?: string };

function normalizeRoles(payload: any): Role[] {
  if (Array.isArray(payload)) return payload as Role[];
  if (Array.isArray(payload?.roles)) return payload.roles as Role[];
  if (Array.isArray(payload?.data)) return payload.data as Role[];
  return [];
}

// robust date compare (if missing, treat as old)
function toTime(x: any): number {
  const s = String(x ?? "");
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

export default function EmployerSidebar() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const path = usePathname();
  const router = useRouter();

  async function fetchRoles(): Promise<Role[]> {
    const r = await fetch("/api/employer/roles", { cache: "no-store" });
    if (!r.ok) {
      const t = await safeText(r);
      throw new Error(`roles fetch ${r.status}: ${t || r.statusText}`);
    }
    const j = await r.json();
    const list = normalizeRoles(j);
    setRoles(list);
    return list;
  }

  useEffect(() => {
    (async () => {
      try { setErr(null); await fetchRoles(); }
      catch (e:any) { setErr(e?.message || "Failed to load roles"); setRoles([]); }
    })();
  }, []);

  const isActive = (href: string) => path === href || (path?.startsWith(href + "/") ?? false);

  async function addRole() {
    const nRaw = name.trim();
    const n = nRaw.replace(/\s+/g, " "); // normalize whitespace
    if (!n) return;

    setBusy(true);
    setErr(null);

    // optimistic add (temporary id)
    const tempId = "R-temp-" + Math.random().toString(16).slice(2);
    const optimistic: Role = { role_id: tempId, name: n, status: "active" };
    setRoles((prev) => [optimistic, ...prev]);

    try {
      const r = await fetch("/api/employer/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setRoles((prev) => prev.filter(x => x.role_id !== tempId));
        throw new Error(j?.detail || `create role failed ${r.status}`);
      }

      // If backend returns role_id, use it immediately
      let roleId: string | null = j?.role_id || j?.role_id || null;

      // Always refresh roles list after create (source of truth)
      const list = await fetchRoles();

      if (!roleId) {
        const target = n.toLowerCase();
        const matches = list
          .filter(x => String(x?.name ?? "").trim().toLowerCase() === target)
          .sort((a, b) => toTime(b.created_at) - toTime(a.created_at));

        roleId = matches[0]?.role_id || null;
      }

      if (!roleId) {
        // rollback optimistic temp entry (the list refresh already replaced it, but be safe)
        setRoles((prev) => prev.filter(x => x.role_id !== tempId));
        throw new Error("Role created, but could not resolve role_id. (GET /api/employer/roles did not return the new role.)");
      }

      // remove optimistic if still present, then ensure the real role is visible
      setRoles((prev) => prev.filter(x => x.role_id !== tempId));
      setName("");
      router.push(`/employer/roles/${roleId}/setup`);
    } catch (e:any) {
      setErr(e?.message || "Failed to create role");
    } finally {
      setBusy(false);
    }
  }

  const sorted = useMemo(() => roles.slice(), [roles]);

  return (
    <aside style={{
      width: 290,
      borderRight: "1px solid var(--border-default)",
      background: "var(--surface-1)",
      padding: "var(--space-4)",
      position: "sticky",
      top: 0,
      height: "100vh",
      overflow: "auto"
    }} className="texture-surface-1">
      <div style={{ marginBottom: "var(--space-4)" }}>
        <CompanyLogo size="md" variant="transparent" />
      </div>

      <Nav href="/employer/dashboard" active={isActive("/employer/dashboard")}>Master Dashboard</Nav>

      <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>ROLES</div>
        <button
          onClick={async () => { try { setErr(null); await fetchRoles(); } catch(e:any){ setErr(e?.message || "Failed to refresh"); } }}
          style={{
            fontSize: "var(--text-xs)", fontWeight: 500,
            border: "1px solid var(--border-default)",
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            borderRadius: 6,
            padding: "var(--space-1) var(--space-2)",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          title="Refresh roles"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderRadius: 6, border: "1px solid var(--color-error)", background: "rgba(239, 68, 68, 0.1)", color: "var(--color-error)", fontSize: "var(--text-xs)" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
        {sorted.map(r => (
          <Nav key={r.role_id} href={`/employer/roles/${r.role_id}`} active={isActive(`/employer/roles/${r.role_id}`)}>
            {r.name}{r.status !== "active" ? <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.65 }}>(paused)</span> : null}
          </Nav>
        ))}
        {sorted.length === 0 ? (
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", padding: "var(--space-2) var(--space-3)" }}>
            No roles yet. Add one below.
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>Add Role</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dock Worker"
          style={{
            width: "100%",
            padding: "var(--space-3)",
            borderRadius: 6,
            border: "1px solid var(--border-default)",
            outline: "none",
            background: "var(--surface-0)",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)"
          }}
        />
        <button
          onClick={addRole}
          disabled={busy || !name.trim()}
          style={{
            width: "100%",
            marginTop: "var(--space-3)",
            padding: "var(--space-3)",
            borderRadius: 6,
            border: "1px solid var(--accent-blue-dim)",
            background: "var(--accent-blue-glow)",
            color: "var(--accent-blue)",
            fontWeight: 500,
            fontSize: "var(--text-sm)",
            cursor: "pointer",
            opacity: busy || !name.trim() ? 0.5 : 1,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        >
          {busy ? "Creating..." : "Add Role"}
        </button>
      </div>
    </aside>
  );
}

function Nav({ href, active, children }: { href: string; active: boolean; children: any }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "var(--space-3) var(--space-3)",
        borderRadius: 6,
        textDecoration: "none",
        border: "1px solid " + (active ? "var(--accent-blue-dim)" : "var(--border-subtle)"),
        background: active ? "var(--accent-blue-glow)" : "var(--surface-2)",
        color: active ? "var(--accent-blue)" : "var(--text-primary)",
        fontWeight: 500,
        fontSize: "var(--text-sm)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      }}
      className="texture-interactive"
    >
      {children}
    </Link>
  );
}

async function safeText(r: Response) {
  try { return await r.text(); } catch { return ""; }
}
