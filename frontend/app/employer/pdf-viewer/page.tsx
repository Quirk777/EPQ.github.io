import { Suspense } from "react";
import PDFViewerClient from "./PDFViewerClient";

export default function PDFViewerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#fff" }}>Loading PDF viewer...</div>}>
      <PDFViewerClient />
    </Suspense>
  );
}
