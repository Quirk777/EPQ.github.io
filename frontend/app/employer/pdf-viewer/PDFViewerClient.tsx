"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function PDFViewerClient() {
  const searchParams = useSearchParams();
  const pdfUrl = searchParams?.get("url") || "";
  const candidateName = searchParams?.get("name") || "Candidate";
  
  const [showControls, setShowControls] = useState(true);

  // Add parameters to help browsers display PDF inline
  const displayUrl = pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0` : "";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${candidateName.replace(/\s+/g, "_")}_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!pdfUrl) {
    return (
      <div style={s.page}>
        <div style={s.errorContainer}>
          <h1 style={s.errorTitle}>No PDF URL provided</h1>
          <Link href="/employer/dashboard" style={s.btnPrimary}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Toolbar */}
      <div style={{ ...s.toolbar, opacity: showControls ? 1 : 0 }}>
        <div style={s.toolbarLeft}>
          <Link href="/employer/dashboard" style={s.toolbarBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </Link>
          <h1 style={s.toolbarTitle}>{candidateName} - Report</h1>
        </div>
        
        <div style={s.toolbarRight}>
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
            Download
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
      <iframe
        id="pdf-viewer"
        src={displayUrl}
        title="PDF Report"
        style={s.iframe}
      />
      
      {/* Fallback for browsers that don't support PDF display */}
      <div style={s.fallback}>
        <p>If the PDF doesn't display above, you can:</p>
        <button onClick={handleDownload} style={s.btnPrimary}>
          Download PDF
        </button>
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
    backgroundColor: "#1e293b",
    display: "flex",
    flexDirection: "column" as const,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    backgroundColor: "#0f172a",
    borderBottom: "1px solid #334155",
    transition: "opacity 0.3s ease",
    zIndex: 10,
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#f8fafc",
    margin: 0,
  },
  toolbarBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #475569",
    backgroundColor: "#334155",
    color: "#f8fafc",
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
  } as React.CSSProperties,
  fallback: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 40,
    backgroundColor: "#0f172a",
  } as React.CSSProperties,
  errorContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 40,
    height: "100vh",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f8fafc",
    margin: 0,
  },
  btnPrimary: {
    padding: "12px 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  } as React.CSSProperties,
};
