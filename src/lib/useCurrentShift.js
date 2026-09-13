import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

let cachedShift = null;
let lastCheckedAt = 0;
const STALE_MS = 5000;

export async function fetchCurrentShift({ branchId } = {}) {
  // 1) User-scoped current
  try {
    const meCur = await api.shifts.currentMe();
    if (meCur && meCur.id && !meCur.closedAt) return meCur;
  } catch {}
  // 2) Any current
  try {
    const anyCur = await api.shifts.current({});
    if (anyCur && anyCur.id && !anyCur.closedAt) return anyCur;
  } catch {}
  // 3) OPEN list fallback
  try {
    if (branchId) {
      const resp = await api.shifts.list({ branchId, status: 'OPEN', limit: 1, offset: 0 });
      const list = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
      if (list.length && !list[0].closedAt) return list[0];
    }
  } catch {}
  return null;
}

export function useCurrentShift({ branchId } = {}) {
  const [shift, setShift] = useState(cachedShift);
  const [loading, setLoading] = useState(!cachedShift);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  async function refresh(force = false) {
    try {
      const now = Date.now();
      if (!force && cachedShift && now - lastCheckedAt < STALE_MS) {
        setShift(cachedShift);
        setLoading(false);
        return cachedShift;
      }
      setLoading(true);
      const cur = await fetchCurrentShift({ branchId });
      // cache result
      cachedShift = cur;
      lastCheckedAt = Date.now();
      if (mounted.current) {
        setShift(cur);
        setLoading(false);
      }
      return cur;
    } catch (e) {
      if (mounted.current) {
        setError(e);
        setLoading(false);
      }
      return null;
    }
  }

  useEffect(() => {
    // on mount/branch change, ensure we have a fresh view
    refresh(!cachedShift);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  return { shift, loading, error, refresh };
}
