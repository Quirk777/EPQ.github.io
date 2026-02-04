"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AccountInfo = {
  employer_id: string;
  email: string;
  company_name: string;
};

type Role = {
  role_id: string;
  name: string;
};

export default function AccountCheckClient() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccountInfo() {
      try {
        // Get account info
        const meRes = await fetch("/api/employer/me", { credentials: "include" });
        if (!meRes.ok) {
          if (meRes.status === 401) {
            setError("Not logged in");
            return;
          }
          throw new Error("Failed to load account info");
        }
        const meData = await meRes.json();
        setAccount(meData);

        // Get roles
        const rolesRes = await fetch("/api/employer/roles", { credentials: "include" });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(Array.isArray(rolesData) ? rolesData : []);
        }
      } catch (e: any) {
        setError(e.message || "Failed to load account");
      } finally {
        setLoading(false);
      }
    }
    loadAccountInfo();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "48px auto", padding: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          Loading account info...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: "48px auto", padding: 24 }}>
        <div style={{ 
          padding: 16, 
          background: "#fee2e2", 
          border: "1px solid #fca5a5", 
          borderRadius: 8,
          marginBottom: 16
        }}>
          <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            Error
          </div>
          <div style={{ color: "#7f1d1d" }}>{error}</div>
        </div>
        <Link 
          href="/employer/login"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#3b82f6",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "48px auto", padding: 24 }}>
      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>
        Account Information
      </div>

      <div style={{ 
        padding: 24, 
        background: "white", 
        border: "1px solid #e5e7eb", 
        borderRadius: 12,
        marginBottom: 24
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Logged in as:
        </div>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#6b7280" }}>Email:</td>
              <td style={{ padding: "8px 0", fontWeight: 700, color: "#0b1220" }}>
                {account?.email || "Unknown"}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#6b7280" }}>Company:</td>
              <td style={{ padding: "8px 0" }}>{account?.company_name || "Unnamed"}</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#6b7280" }}>Employer ID:</td>
              <td style={{ padding: "8px 0", fontFamily: "monospace", fontSize: 13 }}>
                {account?.employer_id || "Unknown"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ 
        padding: 24, 
        background: "white", 
        border: "1px solid #e5e7eb", 
        borderRadius: 12,
        marginBottom: 24
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          Your Roles ({roles.length})
        </div>
        {roles.length === 0 ? (
          <div style={{ 
            padding: 16, 
            background: "#fef3c7", 
            border: "1px solid #fcd34d", 
            borderRadius: 8,
            color: "#92400e"
          }}>
            No roles found for this account. This is why your dashboard is empty.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: 12, color: "#6b7280", fontWeight: 600 }}>
                  Role ID
                </th>
                <th style={{ textAlign: "left", padding: 12, color: "#6b7280", fontWeight: 600 }}>
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, index) => (
                <tr key={role.role_id} style={{ borderTop: index > 0 ? "1px solid #f3f4f6" : undefined }}>
                  <td style={{ padding: 12, fontFamily: "monospace", fontSize: 13 }}>
                    {role.role_id}
                  </td>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    {role.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ 
        padding: 16, 
        background: "#dbeafe", 
        border: "1px solid #93c5fd", 
        borderRadius: 8,
        marginBottom: 24
      }}>
        <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
          Expected Account for Test Data:
        </div>
        <div style={{ color: "#1e3a8a", fontSize: 14 }}>
          • Email: <strong>tcholland123@gmail.com</strong> (with @)<br />
          • Employer ID: <strong style={{ fontFamily: "monospace" }}>99174e4d-d1f4-4385-8f1d-dacadc9cc1d2</strong><br />
          • Should have 1 role: <strong>Software Engineer (R-5f690fa9acec)</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Link 
          href="/employer/dashboard"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#3b82f6",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          Go to Dashboard
        </Link>
        <Link 
          href="/employer/logout"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#ef4444",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          Logout
        </Link>
      </div>
    </div>
  );
}
