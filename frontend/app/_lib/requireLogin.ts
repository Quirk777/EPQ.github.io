"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useRequireEmployerLogin() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employer/whoami", { credentials: "include" });
        if (cancelled) return;
        if (res.status === 401) router.replace("/employer/login");
      } catch {
        // If the proxy/backend is down, still send them to login as safest UX.
        if (!cancelled) router.replace("/employer/login");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);
}