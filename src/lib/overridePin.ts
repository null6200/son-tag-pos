import { api } from '@/lib/api';

export type OverridePinResult = { ok: boolean; graceSeconds?: number };

const KEY_PREFIX = 'overridePin_';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export async function ensureOverridePin(branchId: string, promptFn: (opts: { title: string }) => Promise<string | null>): Promise<OverridePinResult> {
  if (!branchId) return { ok: false };

  try {
    const status = await api.hrm.overridePin.get({ branchId });
    const grace = Number(status?.graceSeconds ?? 5);

    const k = `${KEY_PREFIX}${branchId}`;
    const cached = JSON.parse(localStorage.getItem(k) || 'null') as { until: number } | null;
    if (cached && cached.until > nowSec()) {
      return { ok: true, graceSeconds: grace };
    }

    // Ask user for PIN using provided UI function
    const pin = await promptFn({ title: 'Enter override PIN' });
    if (!pin) return { ok: false };

    const res = await api.hrm.overridePin.verify({ branchId, pin });
    if (res?.ok) {
      const until = nowSec() + Number(res?.graceSeconds ?? grace);
      localStorage.setItem(k, JSON.stringify({ until }));
      return { ok: true, graceSeconds: res?.graceSeconds ?? grace };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export function clearOverridePinCache(branchId: string) {
  if (!branchId) return;
  localStorage.removeItem(`${KEY_PREFIX}${branchId}`);
}
