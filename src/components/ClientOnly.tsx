'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * ClientOnly — render `children` only after the client has mounted.
 * Used to wrap components whose initial render depends on browser-only
 * state (timestamps, random session ids, localStorage values, etc.) so
 * React server HTML and first client paint match.
 *
 * While unmounted we render an inert fallback that occupies the same
 * layout footprint to avoid layout shift when hydration completes.
 */
export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return <>{hasMounted ? children : fallback}</>;
}