"use client";

import * as React from "react";
import Link from "next/link";

type DemoWalkthroughProps = {
  open: boolean;
  selectedRoleId?: string;
  onClose: () => void;
};

type WalkthroughStep = {
  title: string;
  eyebrow: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
};

const STORAGE_KEY = "epq_demo_walkthrough_dismissed";

function buildSteps(selectedRoleId?: string): WalkthroughStep[] {
  const setupHref = selectedRoleId
    ? `/employer/roles/${encodeURIComponent(selectedRoleId)}/setup`
    : "/employer/roles/create";

  return [
    {
      eyebrow: "Overview",
      title: "Welcome to EPQ",
      body: "EPQ helps employers create structured psychometric assessments, invite applicants, and review completed submissions through candidate reports.",
    },
    {
      eyebrow: "Step 1",
      title: "Create a role",
      body: "Start by defining the role, team, seniority, and work environment. These details keep the assessment tied to the job you are actually hiring for.",
      linkLabel: "Open role creation",
      linkHref: "/employer/roles/create",
    },
    {
      eyebrow: "Step 2",
      title: "Generate the assessment",
      body: "After a role exists, use the role setup page to create or update the EPQ assessment and generate an applicant link.",
      linkLabel: selectedRoleId ? "Open selected role setup" : "Create a role first",
      linkHref: setupHref,
    },
    {
      eyebrow: "Step 3",
      title: "Share the applicant link",
      body: "Send the generated link to applicants. They do not need employer dashboard access; the link takes them directly to the assessment experience.",
    },
    {
      eyebrow: "Applicant flow",
      title: "Applicants complete the EPQ",
      body: "Applicants enter their name and email, answer the assessment questions, and submit. They see a confirmation page when the assessment is complete.",
    },
    {
      eyebrow: "Dashboard",
      title: "Review completed applicants",
      body: "Completed applicants appear in the submissions table for the selected role. Use the role sidebar to switch between roles and their candidate lists.",
    },
    {
      eyebrow: "Reports",
      title: "Open the PDF report",
      body: "When a report is ready, open it from the candidate row or candidate detail page. Reports may briefly show as processing while generation finishes.",
    },
    {
      eyebrow: "Demo scope",
      title: "Understand demo and roadmap areas",
      body: "Core role creation, applicant assessment, dashboard review, and PDF report flow are the primary demo loop. Broader analytics, modules, branding, and talent workflow areas may contain demo or coming-soon functionality depending on available data.",
      linkLabel: "Open modules",
      linkHref: "/employer/modules",
    },
    {
      eyebrow: "Finish",
      title: "You are ready to demo",
      body: "The complete flow is: create a role, generate the assessment, share the applicant link, collect a submission, review the applicant, and open the PDF report.",
    },
  ];
}

export default function DemoWalkthrough({ open, selectedRoleId, onClose }: DemoWalkthroughProps) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const steps = React.useMemo(() => buildSteps(selectedRoleId), [selectedRoleId]);
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  React.useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  if (!open) return null;

  function closeAndStore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {}
    onClose();
  }

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="epq-demo-title">
      <section style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>{step.eyebrow}</div>
            <h2 id="epq-demo-title" style={styles.title}>{step.title}</h2>
          </div>
          <div style={styles.count}>{stepIndex + 1}/{steps.length}</div>
        </div>

        <div style={styles.progressTrack} aria-hidden="true">
          <div style={{ ...styles.progressFill, width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>

        <p style={styles.body}>{step.body}</p>

        {step.linkHref && step.linkLabel ? (
          <Link href={step.linkHref} style={styles.stepLink} onClick={closeAndStore}>
            {step.linkLabel}
          </Link>
        ) : null}

        <div style={styles.actions}>
          <button type="button" onClick={closeAndStore} style={styles.secondaryButton}>
            Skip
          </button>
          <div style={styles.navActions}>
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
              style={{ ...styles.secondaryButton, opacity: isFirst ? 0.5 : 1, cursor: isFirst ? "not-allowed" : "pointer" }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  closeAndStore();
                  return;
                }
                setStepIndex((current) => Math.min(steps.length - 1, current + 1));
              }}
              style={styles.primaryButton}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-4)",
    background: "rgba(0, 0, 0, 0.62)",
    backdropFilter: "blur(8px)",
  },
  card: {
    width: "min(560px, 100%)",
    maxHeight: "min(680px, calc(100vh - 32px))",
    overflowY: "auto",
    background: "var(--surface-1)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
    padding: "var(--space-6)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "var(--space-4)",
    alignItems: "flex-start",
  },
  eyebrow: {
    marginBottom: "var(--space-2)",
    color: "var(--accent-blue)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "var(--text-xl)",
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: "-0.02em",
  },
  count: {
    flex: "0 0 auto",
    padding: "var(--space-1) var(--space-2)",
    borderRadius: 6,
    background: "var(--surface-2)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontSize: "var(--text-xs)",
    fontWeight: 700,
  },
  progressTrack: {
    height: 6,
    marginTop: "var(--space-5)",
    borderRadius: 999,
    background: "var(--surface-2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--accent-blue)",
    transition: "width 180ms ease",
  },
  body: {
    margin: "var(--space-5) 0 0 0",
    color: "var(--text-secondary)",
    fontSize: "var(--text-base)",
    lineHeight: 1.65,
  },
  stepLink: {
    display: "inline-flex",
    marginTop: "var(--space-5)",
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    background: "var(--accent-mint-glow)",
    border: "1px solid var(--accent-mint-dim)",
    color: "var(--accent-mint)",
    textDecoration: "none",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-3)",
    flexWrap: "wrap",
    marginTop: "var(--space-6)",
    paddingTop: "var(--space-5)",
    borderTop: "1px solid var(--border-subtle)",
  },
  navActions: {
    display: "flex",
    gap: "var(--space-2)",
    flexWrap: "wrap",
  },
  secondaryButton: {
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
  },
  primaryButton: {
    padding: "var(--space-2) var(--space-4)",
    borderRadius: 6,
    border: "1px solid var(--accent-blue-dim)",
    background: "var(--accent-blue-glow)",
    color: "var(--accent-blue)",
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    fontWeight: 700,
  },
};
