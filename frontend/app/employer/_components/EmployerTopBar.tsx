"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileMenu from "./ProfileMenu";
import CompanyLogo from "../../components/CompanyLogo";

export default function EmployerTopBar() {
  const path = usePathname();
  const [userData, setUserData] = useState<{ email?: string; companyName?: string }>({});

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUserData({ email: data.email, companyName: data.company_name });
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    }
    fetchUser();
  }, []);

  // Hide on auth pages (so it doesn't look weird before login)
  const hide =
    path?.startsWith("/employer/login") ||
    path?.startsWith("/employer/signup");

  if (hide) return null;

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "rgba(255,255,255,0.9)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid #eef2f7",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/employer/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <CompanyLogo size="lg" variant="transparent" />
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ProfileMenu email={userData.email} companyName={userData.companyName} />
        </div>
      </div>
    </div>
  );
}

function chip() {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    fontWeight: 800,
    background: "#fff",
    color: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 8
  } as const;
}
