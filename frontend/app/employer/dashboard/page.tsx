import { Suspense } from 'react';
import DashboardClient from "./DashboardClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>
      <DashboardClient />
    </Suspense>
  );
}
