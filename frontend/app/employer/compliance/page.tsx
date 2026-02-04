import { Suspense } from 'react';
import ComplianceClientNew from './ComplianceClientNew';

export default function CompliancePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading compliance dashboard...</div>}>
      <ComplianceClientNew />
    </Suspense>
  );
}
