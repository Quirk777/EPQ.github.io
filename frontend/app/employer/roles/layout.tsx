import EmployerSidebar from "../_components/EmployerSidebar";
import Link from "next/link";

export default function AuthedEmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--surface-0)" }} className="texture-background">
      <EmployerSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--surface-1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border-subtle)"
        }} className="texture-surface-1">
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)"
          }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              Dashboard <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", marginLeft: "var(--space-3)" }}>Premium demo mode</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/employer/dashboard" style={chip()}>Home</Link>
              <Link href="/employer/profile" style={chip()}>Profile</Link>
              <Link href="/employer/settings" style={chip()}>Settings</Link>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function chip() {
  return {
    padding: "var(--space-2) var(--space-3)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-2)",
    textDecoration: "none",
    fontWeight: 500,
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  };
}