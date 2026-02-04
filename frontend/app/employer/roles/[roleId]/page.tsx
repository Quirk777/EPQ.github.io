"use client";

import { useParams } from "next/navigation";
import RoleDashboardClient from "./RoleDashboardClient";

export default function RoleDashboardPage() {
  const params = useParams() as { roleId?: string };
  const roleId = params?.roleId;

  // Guard against undefined so we never hit /roles/undefined/*
  if (!roleId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Missing role id</div>
        <div style={{ color: "#6b7280" }}>
          Go back to the dashboard and click a role again.
        </div>
      </div>
    );
  }

  return <RoleDashboardClient roleId={roleId} />;
}
