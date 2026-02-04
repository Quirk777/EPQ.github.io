import * as React from "react";

type AlertProps = {
  type: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  onRetry?: () => void;
};

export default function Alert({ type, title, children, onRetry }: AlertProps) {
  const styles: Record<string, React.CSSProperties> = {
    error:   { border: "1px solid #fca5a5", background: "#fef2f2", color: "#991b1b" },
    success: { border: "1px solid #86efac", background: "#f0fdf4", color: "#166534" },
    warning: { border: "1px solid #fde047", background: "#fefce8", color: "#854d0e" },
    info:    { border: "1px solid #93c5fd", background: "#eff6ff", color: "#1e40af" }
  };

  return (
    <div style={{ ...styles[type], padding: 14, borderRadius: 12, marginTop: 14 }}>
      {title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>}
      <div>{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 10,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid currentColor",
            background: "white",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
