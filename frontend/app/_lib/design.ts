export const colors = {
  primary: "#111",
  primaryHover: "#1f1f1f",
  text: "#0b1220",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  background: "#fafafa",
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  error: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#854d0e" },
  info: { bg: "#dbeafe", border: "#93c5fd", text: "#1e40af" }
};

export const btn = {
  primary: {
    padding: "10px 16px",
    borderRadius: 12,
    border: `1px solid ${colors.primary}`,
    background: colors.primary,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s"
  },
  secondary: {
    padding: "10px 16px",
    borderRadius: 12,
    border: `1px solid ${colors.primary}`,
    background: "#fff",
    color: colors.primary,
    fontWeight: 700,
    cursor: "pointer"
  }
};

export const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
};
