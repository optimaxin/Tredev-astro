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
