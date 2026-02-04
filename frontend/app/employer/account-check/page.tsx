import { Suspense } from "react";
import AccountCheckClient from "./AccountCheckClient";

export default function AccountCheckPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <AccountCheckClient />
    </Suspense>
  );
}
