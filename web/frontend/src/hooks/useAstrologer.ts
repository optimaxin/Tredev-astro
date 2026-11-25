import { useEffect, useState } from 'react';
import { astrologerService } from '../services/astrologerService';
import type { UiAstrologer } from '../services/astrologerService';

// Fetches a single astrologer's public profile by id. `notFound` is distinct
// from `loading` so callers can show a real "this astrologer doesn't exist"
// state instead of an infinite spinner.
export function useAstrologer(id: number | string | null | undefined) {
  const [astrologer, setAstrologer] = useState<UiAstrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const numericId = Number(id);
    if (!id || Number.isNaN(numericId)) { setLoading(false); setNotFound(true); return; }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    astrologerService.get(numericId)
      .then(result => {
        if (cancelled) return;
        if (!result) setNotFound(true);
        setAstrologer(result);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return { astrologer, loading, notFound };
}

// The site's current Featured/Celebrity Astrologer id — admin-configurable
// (see Admin's Featured Astrologer panel), not the old hardcoded
// RAGHAV_ASTROLOGER_ID constant. null means none is set right now; callers
// should degrade gracefully (no featured panel/badge/page) rather than
// assume one exists.
export function useFeaturedAstrologerId() {
  const [id, setId] = useState<number | null | undefined>(undefined); // undefined = still loading
  useEffect(() => {
    let cancelled = false;
    astrologerService.getFeaturedId().then(result => { if (!cancelled) setId(result); });
    return () => { cancelled = true; };
  }, []);
  return id;
}
