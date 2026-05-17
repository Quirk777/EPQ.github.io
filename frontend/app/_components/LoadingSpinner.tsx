export default function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: "2px solid var(--border-strong)",
        borderTopColor: "var(--accent-blue)",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite"
      }}
    />
  );
}
