import * as React from "react";

type AlertProps = {
  type: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  onRetry?: () => void;
};

export default function Alert({ type, title, children, onRetry }: AlertProps) {
  const styles: Record<string, React.CSSProperties> = {
    error:   { border: "1px solid rgba(196, 137, 137, 0.35)", background: "rgba(196, 137, 137, 0.12)", color: "var(--color-error)" },
    success: { border: "1px solid rgba(133, 182, 156, 0.35)", background: "rgba(133, 182, 156, 0.12)", color: "var(--color-success)" },
    warning: { border: "1px solid rgba(196, 176, 137, 0.35)", background: "rgba(196, 176, 137, 0.12)", color: "var(--color-warning)" },
    info:    { border: "1px solid rgba(137, 163, 196, 0.35)", background: "rgba(137, 163, 196, 0.12)", color: "var(--color-info)" }
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
            background: "var(--surface-2)",
            color: "inherit",
            cursor: "pointer"
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
