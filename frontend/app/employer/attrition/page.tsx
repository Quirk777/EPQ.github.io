import { Suspense } from 'react';
import AttritionClientNew from './AttritionClientNew';

export default function AttritionPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading attrition risk analysis...</div>}>
      <AttritionClientNew />
    </Suspense>
  );
}
