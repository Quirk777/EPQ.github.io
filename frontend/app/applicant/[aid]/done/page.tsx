import Link from "next/link";
import type { CSSProperties } from "react";

type PageProps = {
  params: { aid: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function DonePage({ params, searchParams }: PageProps) {
  const raw =
    (searchParams?.candidate_id as string | undefined) ??
    (searchParams?.candidateId as string | undefined) ??
    (searchParams?.cid as string | undefined);

  const candidate_id = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="surface-texture-fine" style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>Submitted</div>
        <h1 style={styles.title}>Thank you</h1>
        <p style={styles.copy}>
          Your assessment was submitted successfully. The employer will contact you soon.
        </p>

        {candidate_id ? (
          <div style={styles.referenceBox}>
            <div style={styles.referenceLabel}>Candidate ID</div>
            <div style={styles.referenceValue}>{candidate_id}</div>
          </div>
        ) : null}

        <div style={styles.meta}>
          Assessment: <span style={styles.mono}>{params.aid}</span>
        </div>

        <div style={styles.actions}>
          <Link href="/" style={styles.linkButton}>
            Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--surface-0)",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-6)",
  },
  card: {
    width: "min(560px, 100%)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "var(--surface-1)",
    padding: "var(--space-8)",
    textAlign: "center",
  },
  badge: {
    display: "inline-flex",
    padding: "var(--space-1) var(--space-3)",
    borderRadius: 999,
    border: "1px solid var(--color-success)",
    background: "rgba(133, 182, 156, 0.12)",
    color: "var(--color-success)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "var(--space-4)",
  },
  title: {
    margin: "0 0 var(--space-3) 0",
    fontSize: "var(--text-2xl)",
    fontWeight: 600,
    letterSpacing: "-0.03em",
  },
  copy: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "var(--text-base)",
    lineHeight: 1.6,
  },
  referenceBox: {
    margin: "var(--space-6) auto 0",
    padding: "var(--space-4)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    background: "var(--surface-2)",
    textAlign: "left",
  },
  referenceLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
    marginBottom: "var(--space-2)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  referenceValue: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    overflowWrap: "anywhere",
  },
  meta: {
    marginTop: "var(--space-4)",
    color: "var(--text-tertiary)",
    fontSize: "var(--text-sm)",
  },
  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  actions: {
    marginTop: "var(--space-6)",
  },
  linkButton: {
    display: "inline-flex",
    padding: "var(--space-3) var(--space-5)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    textDecoration: "none",
    fontWeight: 600,
  },
};
