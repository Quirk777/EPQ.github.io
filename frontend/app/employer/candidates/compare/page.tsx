import { Suspense } from "react";
import CompareClient from "./CompareClient";

export default function Page() { 
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading comparison...</div>}>
      <CompareClient />
    </Suspense>
  );
}
