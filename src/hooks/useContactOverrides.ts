import { useEffect, useState } from 'react';
import { subscribeToOverrides, type ContactOverride } from '@/lib/firestore';

export function useContactOverrides(viewerUid: string | null) {
  const [overrides, setOverrides] = useState<Record<string, ContactOverride>>({});

  useEffect(() => {
    if (!viewerUid) return;
    const unsub = subscribeToOverrides(viewerUid, setOverrides);
    return unsub;
  }, [viewerUid]);

  const getDisplayName = (subjectUid: string, fallback: string | undefined | null) => {
    const ov = overrides[subjectUid];
    return ov?.nickname?.trim() || fallback || 'Unknown';
  };

  return { overrides, getDisplayName };
}
