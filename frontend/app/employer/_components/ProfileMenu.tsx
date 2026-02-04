"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AVATAR_KEY = "epq_employer_avatar_v1";

type Props = { email?: string; companyName?: string; };

export default function ProfileMenu({ email, companyName }: Props) {
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    try { setAvatar(localStorage.getItem(AVATAR_KEY)); } catch {}
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    router.replace("/employer/login");
  }

  const initials = (companyName || email || "EPQ").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open profile menu"
        style={{
          width: 40, height: 40, borderRadius: 999,
          border: "1px solid #e5e7eb",
          background: "#fff",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          cursor: "pointer",
          overflow: "hidden",
          padding: 0
        }}
        title="Profile"
      >
        {avatar ? (
          <img src={avatar} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute", right: 0, marginTop: 10, width: 300,
            borderRadius: 14, border: "1px solid #e5e7eb", background: "#fff",
            boxShadow: "0 18px 48px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 50,
          }}
        >
          <div style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Signed in</div>
            <div style={{ fontWeight: 900, marginTop: 2 }}>{companyName || "Employer"}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{email || ""}</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill>status: active</Pill>
              <Pill>plan: pilot</Pill>
              <Pill>insights: on</Pill>
            </div>
          </div>

          <div style={{ padding: 8 }}>
            <MenuLink href="/employer/profile" label="Profile & Settings" />
            <MenuLink href="/employer/settings/branding" label="Company Branding" />
            <MenuLink href="/employer/profile#subscription" label="Subscription" />
            <MenuLink href="/employer/profile#insights" label="Premium Insights" />
          </div>

          <div style={{ padding: 8, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={logout}
              style={{
                width: "100%", textAlign: "left",
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "10px 10px",
        borderRadius: 10,
        textDecoration: "none",
        border: "1px solid transparent",
        fontWeight: 700
      }}
    >
      {label}
    </Link>
  );
}

function Pill({ children }: { children: any }) {
  return (
    <span style={{
      fontSize: 12, padding: "6px 8px",
      border: "1px solid #e5e7eb",
      borderRadius: 999,
      background: "#fafafa",
      fontWeight: 700
    }}>
      {children}
    </span>
  );
}
