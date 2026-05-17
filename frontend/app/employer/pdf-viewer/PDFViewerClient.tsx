"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function safePdfPath(url: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return "";
    if (!parsed.pathname.startsWith("/api/employer/pdf/")) return "";
    return parsed.pathname;
  } catch {
    return "";
  }
}

function prefersPdfFallback() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isSmallSafari = window.matchMedia("(max-width: 760px)").matches && /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  return isIOS || isSmallSafari;
}

export default function PDFViewerClient() {
  const searchParams = useSearchParams();
  const rawPdfUrl = searchParams?.get("url") || "";
  const candidateName = searchParams?.get("name") || "Candidate";
  
  const [showControls, setShowControls] = useState(true);
  const pdfUrl = typeof window === "undefined" ? rawPdfUrl : safePdfPath(rawPdfUrl);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mobilePdfFallback, setMobilePdfFallback] = useState(false);

  const displayUrl = useMemo(() => {
    if (!pdfUrl) return "";
    // Hint to embedded viewers to minimize built-in UI; support varies by browser.
    return `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
  }, [pdfUrl]);
  const downloadUrl = pdfUrl ? `${pdfUrl}?download=1` : "";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${candidateName.replace(/\s+/g, "_")}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const openPdf = () => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    function updateFallback() {
      setMobilePdfFallback(prefersPdfFallback());
    }
    updateFallback();
    window.addEventListener("resize", updateFallback);
    window.addEventListener("orientationchange", updateFallback);
    return () => {
      window.removeEventListener("resize", updateFallback);
      window.removeEventListener("orientationchange", updateFallback);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function preflight() {
      if (!pdfUrl) return;
      setReady(false);
      setLoadError(null);
      setProcessing(false);
      try {
        const res = await fetch(pdfUrl, { method: "HEAD", credentials: "include" });
        if (res.status === 202) {
          if (!cancelled) setProcessing(true);
          return;
        }
        if (!res.ok) {
          const msg = (await res.text().catch(() => "")) || res.statusText || "PDF not available";
          if (!cancelled) setLoadError(`[${res.status}] ${msg}`);
          return;
        }

        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct && !ct.includes("application/pdf")) {
          if (!cancelled) setLoadError("PDF endpoint did not return a PDF.");
          return;
        }

        if (!cancelled) setReady(true);
      } catch (e) {
        const msg = (e as Error)?.message || "Failed to load PDF";
        if (!cancelled) setLoadError(msg);
      }
    }

    preflight();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  if (!pdfUrl) {
    return (
      <div className="epq-pdf-viewer-page" style={s.page}>
        <div style={s.errorContainer}>
          <h1 style={s.errorTitle}>No PDF URL provided</h1>
          <Link href="/employer/dashboard" style={s.btnPrimary}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="epq-pdf-viewer-page" style={s.page}>
        <div style={s.errorContainer}>
          <h1 style={s.errorTitle}>Report not available</h1>
          <p style={s.errorBody}>{loadError}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/employer/dashboard" style={s.btnPrimary}>
              Return to Dashboard
            </Link>
            <button onClick={handleDownload} style={s.toolbarBtn as React.CSSProperties}>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="epq-pdf-viewer-page" style={s.page}>
        <div style={s.errorContainer}>
          <h1 style={s.errorTitle}>Report still processing</h1>
          <p style={s.errorBody}>
            EPQ has received this applicant submission and is preparing the PDF report. Please refresh in a moment.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => window.location.reload()} style={s.btnPrimary}>
              Refresh Report
            </button>
            <Link href="/employer/dashboard" style={s.toolbarBtn}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="epq-pdf-viewer-page" style={s.page}>
      {/* Toolbar */}
      <div className="epq-pdf-toolbar" style={{ ...s.toolbar, opacity: showControls ? 1 : 0 }}>
        <div className="epq-pdf-toolbar-left" style={s.toolbarLeft}>
          <Link href="/employer/dashboard" style={s.toolbarBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Link>
          <h1 style={s.toolbarTitle}>{candidateName} - Report</h1>
        </div>
        
        <div className="epq-pdf-toolbar-right" style={s.toolbarRight}>
          <button onClick={handlePrint} style={s.toolbarBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
          
          <button onClick={handleDownload} style={s.toolbarBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download PDF
          </button>

          <button 
            onClick={() => setShowControls(!showControls)} 
            style={s.toolbarBtn}
            title="Toggle controls"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {showControls ? (
                <path d="M17 14l-5-5-5 5"/>
              ) : (
                <path d="M7 10l5 5 5-5"/>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div style={s.viewerShell}>
        {!ready ? (
          <div style={s.fallback}>
            <p style={s.fallbackText}>Loading report preview...</p>
          </div>
        ) : mobilePdfFallback ? (
          <div className="epq-pdf-mobile-fallback" style={s.mobileFallback}>
            <div style={s.mobileFallbackPanel}>
              <h1 style={s.errorTitle}>PDF preview is ready</h1>
              <p style={s.errorBody}>
                Mobile Safari may open PDFs more reliably in its native viewer. Open the report in a new tab, then use Safari Share or Download if needed.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={openPdf} style={s.btnPrimary}>
                  Open PDF
                </button>
                <button onClick={handleDownload} style={s.toolbarBtn as React.CSSProperties}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        ) : (
          <object
            data={displayUrl}
            type="application/pdf"
            style={s.pdfObject}
            aria-label="PDF report preview"
          >
            <iframe
              id="pdf-viewer"
              src={displayUrl}
              title="PDF Report"
              style={s.iframe}
            />
            <div style={s.fallback}>
              <p style={s.fallbackText}>The PDF preview is not available in this browser.</p>
              <button onClick={handleDownload} style={s.btnPrimary}>
                Download PDF
              </button>
            </div>
          </object>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--surface-0)",
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100dvh",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    padding: "12px 20px",
    backgroundColor: "var(--surface-1)",
    borderBottom: "1px solid var(--border-default)",
    transition: "opacity 0.3s ease",
    zIndex: 10,
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
    flex: "1 1 280px",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  toolbarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    minHeight: 44,
    borderRadius: 8,
    border: "1px solid var(--border-default)",
    backgroundColor: "var(--surface-2)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.2s ease",
  } as React.CSSProperties,
  iframe: {
    flex: 1,
    border: "none",
    width: "100%",
    height: "100%",
    background: "#ffffff",
  } as React.CSSProperties,
  viewerShell: {
    flex: 1,
    padding: "16px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
    background: "var(--surface-0)",
    minHeight: 0,
  } as React.CSSProperties,
  pdfObject: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "#ffffff",
  } as React.CSSProperties,
  fallback: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: "40px 20px",
    height: "100%",
    backgroundColor: "var(--surface-1)",
  } as React.CSSProperties,
  fallbackText: {
    color: "var(--text-secondary)",
    margin: 0,
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: "40px 20px",
    minHeight: "100dvh",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
  },
  errorBody: {
    color: "var(--text-secondary)",
    margin: 0,
    maxWidth: 640,
    textAlign: "center" as const,
    lineHeight: 1.4,
  },
  btnPrimary: {
    padding: "12px 20px",
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "var(--accent-blue-glow)",
    border: "1px solid var(--accent-blue-dim)",
    color: "var(--accent-blue)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
  mobileFallback: {
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--surface-0)",
  } as React.CSSProperties,
  mobileFallbackPanel: {
    width: "min(520px, 100%)",
    border: "1px solid var(--border-default)",
    borderRadius: 8,
    background: "var(--surface-1)",
    padding: 24,
    textAlign: "center" as const,
  } as React.CSSProperties,
};
