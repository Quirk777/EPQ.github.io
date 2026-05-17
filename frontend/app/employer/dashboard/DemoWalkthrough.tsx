"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ACTIONS, EVENTS, Joyride, STATUS, type EventData, type Step } from "react-joyride";

const STORAGE_KEY = "epq_demo_walkthrough_dismissed";
const START_EVENT = "epq:start-demo-tour";

type TourStep = Step & {
  data?: {
    route?: string;
  };
};

function targetFor(...selectors: string[]) {
  if (typeof document === "undefined") return selectors[0];
  return selectors.find((selector) => document.querySelector(selector)) || selectors[0];
}

function buildSteps(): TourStep[] {
  return [
    {
      target: targetFor('[data-tour="dashboard-header"]', "body"),
      title: "Dashboard overview",
      content: "This is the employer control center for EPQ. It brings together roles, applicant submissions, candidate reports, and demo navigation.",
      placement: "bottom",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="roles-sidebar"]', '[data-tour="dashboard-header"]', "body"),
      title: "Roles sidebar",
      content: "Roles organize the assessment flow. Select a role to review submissions, open setup, and see the applicant pipeline for that specific position.",
      placement: "right",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="create-role-footer"]', '[data-tour="create-role-empty"]', '[data-tour="roles-sidebar"]', "body"),
      title: "Create role and assessment",
      content: "Start here to define the role and work environment. After the role exists, Setup EPQ creates the assessment and applicant link.",
      placement: "right",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="applicant-share"]', '[data-tour="setup-epq"]', '[data-tour="role-card"]', '[data-tour="create-role-footer"]', "body"),
      title: "Applicant link sharing",
      content: "This panel shows the next action for the selected role. If an assessment exists, copy the applicant link here. If not, use the setup button to create it.",
      placement: "bottom",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="submissions-table"]', '[data-tour="submissions-empty"]', '[data-tour="dashboard-main"]', "body"),
      title: "Submissions and candidates",
      content: "Completed applicants appear here for the selected role. If there are no applicants yet, EPQ shows a clean empty state with the next step instead of an error.",
      placement: "top",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="pdf-report-link"]', '[data-tour="candidate-details-link"]', '[data-tour="submissions-table"]', '[data-tour="submissions-empty"]', '[data-tour="dashboard-main"]', "body"),
      title: "PDF report viewing",
      content: "When report generation succeeds, open the PDF from the candidate row or detail page. If no PDF is present yet, this step uses the submissions area as context.",
      placement: "auto",
      data: { route: "/employer/dashboard" },
    },
    {
      target: targetFor('[data-tour="modules-hero"]', "body"),
      title: "Modules hub",
      content: "The Modules page shows the broader EPQ workspace. Active modules are clickable; roadmap modules are clearly marked as Coming Soon.",
      placement: "auto",
      data: { route: "/employer/modules" },
    },
    {
      target: targetFor('[data-tour="modules-active"]', '[data-tour="modules-hero"]', "body"),
      title: "Active modules",
      content: "These are the demo-ready product areas, including role setup, candidate review, analytics, scheduling, compliance, and related workflows.",
      placement: "top",
      data: { route: "/employer/modules" },
    },
    {
      target: targetFor('[data-tour="modules-coming-soon"]', '[data-tour="modules-active"]', "body"),
      title: "Coming Soon",
      content: "This section is intentionally roadmap/demo-only. It helps frame the product vision without implying every module is live today.",
      placement: "top",
      data: { route: "/employer/modules" },
    },
    {
      target: targetFor('[data-tour="analytics-header"]', "body"),
      title: "Analytics section",
      content: "Analytics gives a demo view of hiring funnel health and pipeline performance. Treat these charts as directional until connected to full production data.",
      placement: "auto",
      data: { route: "/employer/analytics" },
    },
    {
      target: targetFor('[data-tour="analytics-funnel"]', '[data-tour="analytics-metrics"]', "body"),
      title: "Pipeline insights",
      content: "Use this area to explain where candidates move through the process and where drop-off or bottlenecks may appear.",
      placement: "top",
      data: { route: "/employer/analytics" },
    },
    {
      target: targetFor('[data-tour="branding-upload"]', '[data-tour="branding-header"]', "body"),
      title: "Branding section",
      content: "Company Branding lets employers prepare the workspace for a more polished applicant and employer experience.",
      placement: "center",
      data: { route: "/employer/settings/branding" },
    },
    {
      target: targetFor('[data-tour="branding-upload"]', "body"),
      title: "Branding setup",
      content: "Logo upload and report branding are part of the trust layer. Some report branding may remain Coming Soon depending on your demo environment.",
      placement: "center",
      data: { route: "/employer/settings/branding" },
    },
    {
      target: targetFor('[data-tour="dashboard-header"]', "body"),
      title: "Tour complete",
      content: "The main story is: create a role, configure EPQ, share the applicant link, review submissions, open reports, and show the expanding modules around that core workflow.",
      placement: "center",
      data: { route: "/employer/dashboard" },
    },
  ];
}

export default function DemoWalkthrough() {
  const router = useRouter();
  const pathname = usePathname();
  const [tourActive, setTourActive] = React.useState(false);
  const [run, setRun] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [steps, setSteps] = React.useState<TourStep[]>([]);
  const [tourKey, setTourKey] = React.useState(0);

  function cleanupJoyridePortal() {
    const removePortal = () => {
      document.getElementById("react-joyride-portal")?.remove();
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
    };
    window.setTimeout(removePortal, 0);
    window.setTimeout(removePortal, 80);
  }

  const startTour = React.useCallback(() => {
    setTourKey((current) => current + 1);
    setTourActive(true);
    setRun(true);
    setStepIndex(0);
    if (pathname !== "/employer/dashboard") {
      router.push("/employer/dashboard");
    }
  }, [pathname, router]);

  React.useEffect(() => {
    function handleStart() {
      startTour();
    }

    window.addEventListener(START_EVENT, handleStart);
    return () => window.removeEventListener(START_EVENT, handleStart);
  }, [startTour]);

  React.useEffect(() => {
    try {
      if (pathname === "/employer/dashboard" && window.localStorage.getItem(STORAGE_KEY) !== "true") {
        startTour();
      }
    } catch {}
  }, [pathname, startTour]);

  React.useEffect(() => {
    if (!tourActive) {
      setSteps([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setSteps(buildSteps());
      setRun(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [tourActive, pathname, stepIndex]);

  React.useEffect(() => {
    if (!tourActive || steps.length === 0) return;

    const route = steps[stepIndex]?.data?.route;
    if (route && pathname !== route) {
      setRun(false);
      setSteps([]);
      cleanupJoyridePortal();
      router.push(route);
    }
  }, [tourActive, pathname, router, stepIndex, steps]);

  function finishTour() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setRun(false);
    setStepIndex(0);
    setTourActive(false);
    setSteps([]);
    setTourKey((current) => current + 1);
    cleanupJoyridePortal();
  }

  function moveTo(nextIndex: number) {
    const bounded = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const route = steps[bounded]?.data?.route;
    setStepIndex(bounded);
    if (route && pathname !== route) {
      setRun(false);
      setSteps([]);
      cleanupJoyridePortal();
      router.push(route);
    }
  }

  function handleJoyride(data: EventData) {
    const { action, index, status, type } = data;

    if (status === STATUS.SKIPPED) {
      finishTour();
      return;
    }

    if (status === STATUS.FINISHED) {
      if (index >= steps.length - 1) {
        finishTour();
        return;
      }
      moveTo(index + 1);
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (index >= steps.length - 1) {
        finishTour();
        return;
      }
      moveTo(index + 1);
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const movingBack = action === ACTIONS.PREV;
      moveTo(index + (movingBack ? -1 : 1));
    }
  }

  if (!tourActive || steps.length === 0) return null;

  return (
    <Joyride
      key={tourKey}
      continuous
      floatingOptions={{
        flipOptions: {
          padding: 16,
        },
        shiftOptions: {
          padding: 16,
        },
      }}
      onEvent={handleJoyride}
      options={{
        arrowColor: "#12131A",
        backgroundColor: "#12131A",
        buttons: ["back", "skip", "primary"],
        closeButtonAction: "skip",
        dismissKeyAction: false,
        overlayClickAction: false,
        overlayColor: "rgba(0, 0, 0, 0.68)",
        primaryColor: "#B4C7E7",
        scrollOffset: 96,
        showProgress: true,
        skipBeacon: true,
        spotlightPadding: 8,
        spotlightRadius: 8,
        targetWaitTimeout: 700,
        textColor: "#E8E9ED",
        width: "min(420px, calc(100vw - 32px))",
        zIndex: 1100,
      }}
      run={run && tourActive && steps.length > 0}
      scrollToFirstStep
      stepIndex={stepIndex}
      steps={steps}
      styles={{
        tooltip: {
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
          fontSize: 14,
          maxWidth: "calc(100vw - 32px)",
          overflowWrap: "break-word",
          wordBreak: "normal",
        },
        tooltipTitle: {
          color: "var(--text-primary)",
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 8,
        },
        tooltipContent: {
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          padding: "8px 0 16px",
        },
        buttonPrimary: {
          background: "var(--accent-blue-glow)",
          border: "1px solid var(--accent-blue-dim)",
          borderRadius: 6,
          color: "var(--accent-blue)",
          fontWeight: 700,
          padding: "8px 14px",
        },
        buttonBack: {
          color: "var(--text-secondary)",
          fontWeight: 700,
          marginRight: 8,
        },
        buttonSkip: {
          color: "var(--text-tertiary)",
          fontWeight: 700,
        },
      }}
      locale={{
        back: "Back",
        close: "Finish",
        last: "Finish",
        next: "Next",
        skip: "Skip",
      }}
    />
  );
}
