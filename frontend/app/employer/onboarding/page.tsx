"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireEmployerLogin } from "../../_lib/requireLogin";

function hasCompleted() {
  try { return localStorage.getItem("employer_onboarding_done") === "1"; } catch { return false; }
}

export default function EmployerOnboardingGate() {
  useRequireEmployerLogin();
  const router = useRouter();

  useEffect(() => {
    if (hasCompleted()) router.replace("/employer/dashboard");
    else router.replace("/employer/onboarding/epq");
  }, [router]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Preparing your workspace…</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        One moment while we load your onboarding.
      </p>
    </div>
  );
}