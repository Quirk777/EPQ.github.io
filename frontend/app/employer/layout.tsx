export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--surface)", color: "var(--text)" }}>
      {children}
    </div>
  );
}