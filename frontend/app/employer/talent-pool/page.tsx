import { Suspense } from 'react';
import TalentPoolClient from './TalentPoolClient';

export default function TalentPoolPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading talent pool...</div>}>
      <TalentPoolClient />
    </Suspense>
  );
}
