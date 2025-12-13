function inferBaseUrl() {
  // 0) Hard override for production frontends: always use VPS API domain over HTTPS
  try {
    if (typeof window !== 'undefined' && window.location) {
      const { hostname } = window.location;
      // Support Hostinger, custom domain, and Netlify deployments
      if (hostname === 'lightgoldenrodyellow-quail-668841.hostingersite.com' ||
          hostname === 'stanfordelaze.com' ||
          hostname === 'www.stanfordelaze.com' ||
          hostname === 'son61.netlify.app') {
        return 'https://srv1183099.hstgr.cloud';
      }
    }
  } catch {}

  // 1) Prefer explicit VITE_API_URL at build time (Vite inlines this)
  try {
    const raw = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || '';
    if (raw) {
      try {
        const u = new URL(raw);
        // If both are loopback but hosts differ (localhost vs 127.0.0.1), normalize to current page host
        if (typeof window !== 'undefined' && window.location) {
          const h = window.location.hostname;
          const isLoopback = (x) => x === 'localhost' || x === '127.0.0.1';
          if (isLoopback(u.hostname) && isLoopback(h) && u.hostname !== h) {
            u.hostname = h;
          }
        }
        return u.toString().replace(/\/$/, '');
      } catch {
        return String(raw).replace(/\/$/, '');
      }
    }
  } catch {}

  // 2) Fallbacks: infer from current window location
  try {
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname, port } = window.location;

      // If not on backend port 4000, assume we're on a frontend dev server and point to backend 4000
      if (port && port !== '4000') return `http://${hostname}:4000`;
      // Otherwise (served by backend or standard ports), use same origin
      return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
  } catch {}
  // 3) Last resort
  return 'http://localhost:4000';
}

function readLocalToken() {
  try {
    if (typeof window === 'undefined') return null;
    const t = window.localStorage.getItem('access_token') || window.sessionStorage.getItem('access_token');
    return t || null;
  } catch { return null; }
}

const BASE_URL = inferBaseUrl();
export function getApiBaseUrl() { return BASE_URL; }

// Pluggable token provider; the app can register a function that returns the current access token from auth state
let tokenProvider = null;
export function setAuthProvider(fn) { tokenProvider = typeof fn === 'function' ? fn : null; }

// Activity-aware background refresh to avoid idle timeouts while the user is active
// Access token is valid for 2 hours; we proactively refresh every 90 minutes to stay ahead
let __lastActivityAt = Date.now();
let __lastRefreshAt = 0;
let __refreshTimer = null;
function markActive() { __lastActivityAt = Date.now(); }
try {
  if (typeof window !== 'undefined' && window.addEventListener) {
    ['click','keydown','mousemove','touchstart','scroll','visibilitychange'].forEach(evt => {
      try { window.addEventListener(evt, markActive, { passive: true }); } catch {}
    });
    // Start scheduler once
    if (!__refreshTimer) {
      __refreshTimer = setInterval(async () => {
        try {
          // Don't attempt if we've already marked expired this session
          const expired = (() => { try { return window.sessionStorage?.getItem('auth_expired') === '1'; } catch { return false; } })();
          if (expired) return;
          const now = Date.now();
          // Proactively refresh every 90 minutes (before 2-hour token expires)
          const shouldRefresh = (now - __lastRefreshAt) > 90 * 60 * 1000;
          if (!shouldRefresh) return;
          // Best-effort refresh; ignore errors (request() path does robust handling on 401s anyway)
          const res = await fetch(`${BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
          if (res && res.ok) { __lastRefreshAt = now; }
        } catch {}
      }, 10 * 60 * 1000); // check every 10 minutes
    }
  }
} catch {}

// Notify app of session expiry and redirect to sign-in once
let __expiredNotified = false;
function isAuthOrExpiredPage() {
  try {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    const p = url.pathname.toLowerCase();
    if (url.searchParams.get('expired') === '1') return true;
    // Heuristic: common auth routes
    return p.endsWith('/login') || p.endsWith('/signin') || p.endsWith('/register');
  } catch { return false; }
}

function notifySessionExpired() {
  try {
    if (__expiredNotified) return;
    __expiredNotified = true;
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('auth:expired')); } catch {}
      try {
        // Best-effort clear of any non-HttpOnly tokens in web storage
        window.localStorage && window.localStorage.removeItem('access_token');
        window.sessionStorage && window.sessionStorage.removeItem('access_token');
        window.sessionStorage && window.sessionStorage.setItem('auth_expired', '1');
      } catch {}
      if (!isAuthOrExpiredPage()) {
        // Redirect to landing with expired flag, route-agnostic
        const url = new URL(window.location.href);
        if (!url.searchParams.has('expired')) url.searchParams.set('expired', '1');
        setTimeout(() => { window.location.replace(url.origin + '/' + (url.search ? url.search : '')); }, 50);
      }
    }
  } catch {}
}

function readCookieToken() {
  try {
    if (typeof document === 'undefined') return null;
    const raw = document.cookie || '';
    const map = Object.fromEntries(raw.split(';').map(s => s.trim()).filter(Boolean).map(kv => {
      const idx = kv.indexOf('=');
      const k = idx >= 0 ? decodeURIComponent(kv.slice(0, idx)) : kv;
      const v = idx >= 0 ? decodeURIComponent(kv.slice(idx + 1)) : '';
      return [k, v];
    }));
    // Common cookie names; adjust as needed to match backend config
    return map['access_token'] || map['auth_token'] || map['token'] || map['jwt'] || null;
  } catch { return null; }
}

async function resolveAuthHeader() {
  try {
    // Support both sync and async token providers. If tokenProvider returns a Promise,
    // await it. If it's not provided or returns falsy, fall back to cookie-based token.
    const maybeToken = tokenProvider ? tokenProvider() : null;
    let token = maybeToken ? await Promise.resolve(maybeToken) : null;
    if (!token) token = readLocalToken();
    if (!token) token = readCookieToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

class ApiError extends Error {
  constructor(status, body, text) {
    super(text || `Request failed: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT = 30000; // 30s
const MAX_RETRIES = 2; // Retry up to 2 times for server errors (total 3 attempts)
const RETRY_DELAY_BASE = 1000; // 1 second base delay, doubles each retry

// Request deduplication: prevent duplicate in-flight requests (e.g., double-clicks)
// Only deduplicates mutating requests (POST/PUT/PATCH/DELETE) with identical path+body
const pendingMutations = new Map();

function getMutationKey(method, path, body) {
  if (method === 'GET') return null; // Don't dedupe reads
  try {
    return `${method}:${path}:${JSON.stringify(body || {})}`;
  } catch {
    return `${method}:${path}`;
  }
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (server errors, network errors)
 */
function isRetryableError(error) {
  // Network errors (no response)
  if (!error.status && (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('timeout'))) {
    return true;
  }
  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  // Rate limiting (429) - retry after backoff
  if (error.status === 429) {
    return true;
  }
  return false;
}

async function request(path, { method = 'GET', body, headers = {}, timeout = DEFAULT_TIMEOUT, _retried, _skipDedupe, _retryCount = 0 } = {}) {
  // Deduplication: if an identical mutation is already in-flight, return its promise
  const mutationKey = _skipDedupe ? null : getMutationKey(method, path, body);
  if (mutationKey && pendingMutations.has(mutationKey)) {
    try { console.debug('[api.request] Deduped:', method, path); } catch {}
    return pendingMutations.get(mutationKey);
  }

  // Create the actual request promise
  const requestPromise = (async () => {
    const url = `${BASE_URL}/api${path}`;
    try { console.debug('[api.request]', method, url, body ? '(body)' : '', _retryCount > 0 ? `(retry ${_retryCount})` : ''); } catch {}

    // Setup timeout via AbortController
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutId;
    if (controller && timeout > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    // Resolve auth headers (supports async providers)
    const authHeaders = await resolveAuthHeader();

    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: controller ? controller.signal : undefined,
      });
    } catch (err) {
      // Timeout or network error - check if retryable
      if (timeoutId) clearTimeout(timeoutId);
      const networkError = err && err.name === 'AbortError' 
        ? new Error('Request aborted (timeout)') 
        : err;
      
      // Retry network errors with backoff
      if (_retryCount < MAX_RETRIES && isRetryableError(networkError)) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, _retryCount);
        try { console.warn(`[api.request] Network error, retrying in ${delay}ms...`, networkError.message); } catch {}
        await sleep(delay);
        return request(path, { method, body, headers, timeout, _retried, _skipDedupe: true, _retryCount: _retryCount + 1 });
      }
      throw networkError;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (!res.ok) {
      // Auto refresh flow: for 401 responses, try to refresh tokens once, then retry original request
      const expiredFlag = (() => { try { return (typeof window !== 'undefined') && (window.sessionStorage?.getItem('auth_expired') === '1' || new URL(window.location.href).searchParams.get('expired') === '1'); } catch { return false; } })();
      if (res.status === 401 && !_retried && !expiredFlag) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
          if (refreshRes.ok) {
            // Retry the original request once after successful refresh (skip dedupe for retry)
            return request(path, { method, body, headers: { ...headers }, timeout, _retried: true, _skipDedupe: true, _retryCount });
          }
          // Refresh failed: notify and redirect to sign-in
          notifySessionExpired();
        } catch {}
      }
      
      let bodyText = '';
      let parsed = null;
      try {
        bodyText = await res.text();
        try { parsed = JSON.parse(bodyText); } catch {}
      } catch {}
      const apiError = new ApiError(res.status, parsed, bodyText || `Request failed: ${res.status}`);
      
      // Retry server errors (5xx) and rate limits (429) with backoff
      if (_retryCount < MAX_RETRIES && isRetryableError(apiError)) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, _retryCount);
        try { console.warn(`[api.request] Server error ${res.status}, retrying in ${delay}ms...`); } catch {}
        await sleep(delay);
        return request(path, { method, body, headers, timeout, _retried, _skipDedupe: true, _retryCount: _retryCount + 1 });
      }
      
      throw apiError;
    }

    // No Content
    if (res.status === 204) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) return res.json();
    if (contentType.includes('application/octet-stream') || contentType.includes('application/pdf') || contentType.includes('application/zip')) return res.blob();
    return res.text();
  })();

  // Track mutation in-flight and clean up when done
  if (mutationKey) {
    pendingMutations.set(mutationKey, requestPromise);
    requestPromise.finally(() => {
      pendingMutations.delete(mutationKey);
    });
  }

  return requestPromise;
}

export const api = {
  drafts: {
    list({ branchId, sectionId, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/drafts${qs ? `?${qs}` : ''}`);
    },
    get(id) { return request(`/drafts/${encodeURIComponent(id)}`); },
    create(payload) { return request('/drafts', { method: 'POST', body: payload }); },
    update(id, payload) { return request(`/drafts/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }); },
    remove(id, options = {}) {
      const params = new URLSearchParams();
      if (options && options.overrideOwnerId) params.set('overrideOwnerId', String(options.overrideOwnerId));
      if (options && options.overridePin) params.set('overridePin', String(options.overridePin));
      const qs = params.toString();
      return request(`/drafts/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`, { method: 'DELETE' });
    },
  },
  sectionFunctions: {
    list({ branchId, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/section-functions${q}`);
    },
    create({ branchId, name, description } = {}) {
      return request('/section-functions', { method: 'POST', body: { branchId, name, description } });
    },
    update(id, data) {
      return request(`/section-functions/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/section-functions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  hrm: {
    overridePin: {
      get({ branchId } = {}) {
        const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        return request(`/hrm/override-pin${q}`);
      },
      set({ branchId, pin, graceSeconds } = {}) {
        return request('/hrm/override-pin/set', { method: 'POST', body: { branchId, pin, graceSeconds } });
      },
      verify({ branchId, pin } = {}) {
        return request('/hrm/override-pin/verify', { method: 'POST', body: { branchId, pin } });
      },
      setUser({ userId, branchId, pin } = {}) {
        return request('/hrm/override-pin/user/set', { method: 'POST', body: { userId, branchId, pin } });
      },
      verifyUser({ userId, branchId, pin } = {}) {
        return request('/hrm/override-pin/user/verify', { method: 'POST', body: { userId, branchId, pin } });
      },
    },
  },
  productTypes: {
    list({ branchId, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/product-types${q}`);
    },
    create({ branchId, name, description, allowedFunctionIds } = {}) {
      return request('/product-types', { method: 'POST', body: { branchId, name, description, allowedFunctionIds } });
    },
    update(id, data) {
      return request(`/product-types/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/product-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  categories: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const qs = params.toString();
      return request(`/categories${qs ? `?${qs}` : ''}`);
    },
    create({ name, code, branchId } = {}) {
      return request('/categories', { method: 'POST', body: { name, code, branchId } });
    },
    update(id, data) {
      return request(`/categories/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  shifts: {
    get(id) {
      return request(`/shifts/${encodeURIComponent(id)}`);
    },
    open({ branchId, sectionId, openingCash } = {}) {
      return request('/shifts/open', { method: 'POST', body: { branchId, sectionId, openingCash } });
    },
    currentMe() {
      return request('/shifts/current/me');
    },
    currentBranch({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/shifts/current/branch${q}`);
    },
    current({ branchId, sectionId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/shifts/current${q}`);
    },
    close(id, { closingCash } = {}) {
      return request(`/shifts/${encodeURIComponent(id)}/close`, { method: 'PUT', body: { closingCash } });
    },
    list({ branchId, sectionId, status, limit, offset } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      if (offset) params.set('offset', String(offset));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/shifts/list${q}`);
    },
  },
  branches: {
    list() { return request('/branches'); },
    publicList() {
      return request('/public/branches');
    },
    create(data) {
      return request('/branches', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/branches/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  reports: {
    overview({ branchId, from, to } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request(`/reports/overview${qs ? `?${qs}` : ''}`);
    },
    sales({ branchId, from, to } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request(`/reports/sales${qs ? `?${qs}` : ''}`);
    },
    types() {
      return request('/reports/types');
    },
    list({ branchId, type, from, to, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/reports${qs ? `?${qs}` : ''}`);
    },
    async exportOrders({ branchId, from, to } = {}) {
      // We will call the raw endpoint using fetch to better control response types
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const url = `${BASE_URL}/api/reports/export-orders${params.toString() ? `?${params.toString()}` : ''}`;
      const authHeaders = await resolveAuthHeader();
      const res = await fetch(url, { headers: { Accept: 'application/json,text/csv,*/*', ...authHeaders }, credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/csv')) {
        const blob = await res.blob();
        const filename = `orders_export_${Date.now()}.csv`;
        return { filename, blob };
      }
      const data = await res.json();
      const text = typeof data?.data === 'string' ? data.data : '';
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const filename = data?.filename || `orders_export_${Date.now()}.csv`;
      return { filename, blob };
    },
    download(id) {
      // Expect backend to return a pre-signed URL or file content; client will handle accordingly
      return request(`/reports/${encodeURIComponent(id)}/download`);
    },
    remove(id) {
      return request(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    shift({ shiftId, branchId, sectionId } = {}) {
      const params = new URLSearchParams();
      if (shiftId) params.set('shiftId', shiftId);
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/reports/shift${q}`);
    },
    // Helper namespaces for specific report categories
    tables: {
      list(params = {}) { return api.reports.list({ ...params, type: 'table' }); },
      remove(id) { return api.reports.remove(id); },
    },
    staff: {
      list(params = {}) { return api.reports.list({ ...params, type: 'staff' }); },
    },
    discounts: {
      list(params = {}) { return api.reports.list({ ...params, type: 'discounts' }); },
    },
    inventory: {
      list(params = {}) { return api.reports.list({ ...params, type: 'inventory' }); },
    },
    cashMovements: {
      list(params = {}) { return api.reports.list({ ...params, type: 'cash_movements' }); },
    },
    shiftRegisters({ branchId, sectionId, userId, status, from, to, limit, offset } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      if (userId) params.set('userId', userId);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (limit) params.set('limit', String(limit));
      if (offset) params.set('offset', String(offset));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/reports/register${q}`);
    },
  },
  discounts: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/discounts${q}`);
    },
    create(data) {
      return request('/discounts', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/discounts/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/discounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  async login({ username, password }) {
    return request('/auth/login', { method: 'POST', body: { username, password } });
  },
  async register({ username, email, password, branchName, branchLocation }) {
    return request('/auth/register', { method: 'POST', body: { username, email, password, branchName, branchLocation } });
  },
  async me() {
    return request('/users/me');
  },
  auth: {
    ping() {
      return request('/auth/ping', { method: 'POST' });
    },
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout errors; client will still clear local state
      }
    },
  },
  roles: {
    list({ branchId, includeArchived } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (includeArchived) params.set('includeArchived', 'true');
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/roles${q}`);
    },
    create({ branchId, name, permissions }) {
      return request('/roles', { method: 'POST', body: { branchId, name, permissions } });
    },
    update(id, data) {
      return request(`/roles/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/roles/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  users: {
    list({ branchId, includeArchived } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (includeArchived) params.set('includeArchived', 'true');
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/users${q}`);
    },
    create(data) {
      return request('/users', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/users/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    setPin(id, pin) {
      return request(`/users/${encodeURIComponent(id)}/pin`, { method: 'PUT', body: { pin } });
    },
    verifyPin({ userId, pin }) {
      return request('/users/verify-pin', { method: 'POST', body: { userId, pin } });
    },
    getPreferences() {
      return request('/users/me/preferences');
    },
    updatePreferences(data) {
      return request('/users/me/preferences', { method: 'PUT', body: data });
    },
    getRuntime() {
      return request('/users/me/runtime');
    },
    updateRuntime(data) {
      return request('/users/me/runtime', { method: 'PUT', body: data });
    },
  },
  // Backward-compatible user preference helpers used across UI
  userPrefs: {
    async get({ key, branchId } = {}) {
      const prefs = await api.users.getPreferences();
      const namespaced = branchId ? `${key}:${branchId}` : key;
      return prefs ? prefs[namespaced] ?? prefs[key] : undefined;
    },
    async set({ key, value, branchId } = {}) {
      const namespaced = branchId ? `${key}:${branchId}` : key;
      return api.users.updatePreferences({ [namespaced]: value });
    },
    async getMany({ keys = [], branchId } = {}) {
      const prefs = await api.users.getPreferences();
      return keys.map(k => ({ key: k, value: prefs ? (prefs[branchId ? `${k}:${branchId}` : k] ?? prefs[k]) : undefined }));
    },
    async setMany({ prefs = [], branchId } = {}) {
      const payload = {};
      for (const p of prefs) {
        const k = branchId ? `${p.key}:${branchId}` : p.key;
        payload[k] = p.value;
      }
      return api.users.updatePreferences(payload);
    },
  },
  customers: {
    list({ branchId, q, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (q) params.set('q', q);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/customers${qs ? `?${qs}` : ''}`);
    },
    mine({ branchId, q, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (q) params.set('q', q);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/customers/mine${qs ? `?${qs}` : ''}`);
    },
    create(data) {
      return request('/customers', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/customers/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  suppliers: {
    list({ branchId, q, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (q) params.set('q', q);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/suppliers${qs ? `?${qs}` : ''}`);
    },
    create(data) {
      return request('/suppliers', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/suppliers/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  purchaseOrders: {
    list({ branchId, supplierId, status, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (supplierId) params.set('supplierId', supplierId);
      if (status) params.set('status', status);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/purchase-orders${qs ? `?${qs}` : ''}`);
    },
    create(data) {
      return request('/purchase-orders', { method: 'POST', body: data });
    },
    get(id) {
      return request(`/purchase-orders/${encodeURIComponent(id)}`);
    },
    update(id, data) {
      return request(`/purchase-orders/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/purchase-orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  settings: {
    get({ branchId } = {}) {
      const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      return request(`/settings${q}`);
    },
    publicGet({ branchId } = {}) {
      const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      return request(`/settings/public${q}`);
    },
    update(data) {
      return request('/settings', { method: 'PUT', body: data });
    },
    async uploadLogo(file) {
      const url = `${BASE_URL}/api/settings/logo`;
      const form = new FormData();
      form.append('file', file);
      const authHeaders = await resolveAuthHeader();
      const res = await fetch(url, { method: 'POST', headers: { ...authHeaders }, body: form, credentials: 'include' });
      if (!res.ok) throw new Error(`Logo upload failed: ${res.status}`);
      return res.json();
    },
  },
  brands: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/brands${q}`);
    },
    create({ branchId, name } = {}) {
      return request('/brands', { method: 'POST', body: { branchId, name } });
    },
    update(id, data) {
      return request(`/brands/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/brands/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  subcategories: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/subcategories${q}`);
    },
    create({ branchId, name, code } = {}) {
      return request('/subcategories', { method: 'POST', body: { branchId, name, code } });
    },
    update(id, data) {
      return request(`/subcategories/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/subcategories/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  products: {
    list({ branchId, includeArchived, q, category, sortBy, order, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (includeArchived) params.set('includeArchived', 'true');
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (sortBy) params.set('sortBy', sortBy);
      if (order) params.set('order', order);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const qs = params.toString();
      return request(`/products${qs ? `?${qs}` : ''}`);
    },
    create(data) {
      return request('/products', { method: 'POST', body: data });
    },
    update(id, data) {
      return request(`/products/${id}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async uploadImage(productId, file) {
      const url = `${BASE_URL}/api/products/${encodeURIComponent(productId)}/image`;
      const form = new FormData();
      form.append('file', file);
      const authHeaders = await resolveAuthHeader();
      const res = await fetch(url, { method: 'POST', headers: { ...authHeaders }, body: form, credentials: 'include' });
      if (!res.ok) throw new Error(`Product image upload failed: ${res.status}`);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      return contentType.includes('application/json') ? res.json() : res.text();
    },
  },
  inventory: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/inventory${q}`);
    },
    aggregate({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/inventory/aggregate${q}`);
    },
    listBySection({ sectionId, sectionName, branchId } = {}) {
      const params = new URLSearchParams();
      if (sectionId) params.set('sectionId', sectionId);
      if (!sectionId && sectionName) params.set('sectionName', sectionName);
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/inventory/sections${q}`);
    },
    adjustInSection({ productId, sectionId, sectionName, branchId, delta, reason }) {
      const params = new URLSearchParams();
      if (sectionId) params.set('sectionId', sectionId);
      if (!sectionId && sectionName) params.set('sectionName', sectionName);
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/inventory/sections/${encodeURIComponent(productId)}/adjust${q}`, {
        method: 'PUT',
        body: { delta, reason },
      });
    },
    movements({ branchId, limit } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (limit) params.set('limit', String(limit));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/inventory/movements${q}`);
    },
    adjustments: {
      list({ branchId } = {}) {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        const q = params.toString() ? `?${params.toString()}` : '';
        return request(`/inventory/adjustments${q}`);
      },
    },
    settings: {
      get({ branchId } = {}) {
        const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        return request(`/inventory/settings${q}`);
      },
      setAllowOverselling({ branchId, allowOverselling } = {}) {
        return request('/inventory/settings/overselling', { method: 'PUT', body: { branchId, allowOverselling } });
      },
    },
    transfers: {
      list({ branchId } = {}) {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        const q = params.toString() ? `?${params.toString()}` : '';
        return request(`/inventory/transfers${q}`);
      },
    },
    transfer({ fromSectionId, toSectionId, fromSectionName, toSectionName, branchId, items }) {
      return request('/inventory/transfer', {
        method: 'POST',
        body: { fromSectionId, toSectionId, fromSectionName, toSectionName, branchId, items },
      });
    },
    releaseReservations({ sectionId, reservationKey } = {}) {
      if (!sectionId) throw new Error('sectionId is required');
      return request(`/inventory/sections/${encodeURIComponent(sectionId)}/release-reservations`, {
        method: 'POST',
        body: reservationKey ? { reservationKey } : {},
      });
    },
    releaseReservationsAll({ branchId } = {}) {
      const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
      return request(`/inventory/release-reservations-all${q}`);
    },
    adjust(productId, branchId, delta) {
      const q = `?branchId=${encodeURIComponent(branchId)}`;
      return request(`/inventory/${productId}/adjust${q}`, { method: 'PUT', body: { delta } });
    },
  },
  orders: {
    list({ branchId, from, to, page, pageSize } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (page) params.set('page', String(page));
      if (pageSize) params.set('pageSize', String(pageSize));
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/orders${q}`);
    },
    get(id) {
      return request(`/orders/${encodeURIComponent(id)}`);
    },
    update(id, { subtotal, discount, tax, total, taxRate } = {}) {
      const body = {};
      if (subtotal !== undefined) body.subtotal = subtotal;
      if (discount !== undefined) body.discount = discount;
      if (tax !== undefined) body.tax = tax;
      if (total !== undefined) body.total = total;
      if (taxRate !== undefined) body.taxRate = taxRate;
      return request(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body });
    },
    create({ branchId, sectionId, sectionName, items, payment, tableId, status, reservationKey, allowOverselling, subtotal, discount, tax, total, taxRate, serviceType, waiterId, overrideOwnerId, orderId } = {}) {
      const body = { branchId, items };
      if (sectionId) body.sectionId = sectionId;
      if (!sectionId && sectionName) body.sectionName = sectionName;
      if (payment) body.payment = payment;
      if (tableId) body.tableId = tableId;
      if (status) body.status = status;
      if (reservationKey) body.reservationKey = reservationKey;
      if (allowOverselling !== undefined) body.allowOverselling = allowOverselling;
      if (subtotal !== undefined) body.subtotal = subtotal;
      if (discount !== undefined) body.discount = discount;
      if (tax !== undefined) body.tax = tax;
      if (total !== undefined) body.total = total;
      if (taxRate !== undefined) body.taxRate = taxRate;
      if (serviceType !== undefined) body.serviceType = serviceType;
      if (waiterId !== undefined) body.waiterId = waiterId;
      if (overrideOwnerId) body.overrideOwnerId = overrideOwnerId;
      if (orderId) body.orderId = orderId;
      return request('/orders', { method: 'POST', body });
    },
    updateStatus(id, { status, overrideOwnerId } = {}) {
      const body = { status };
      if (overrideOwnerId) body.overrideOwnerId = overrideOwnerId;
      return request(`/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body });
    },
    addPayment(id, { method, amount, reference }) {
      return request(`/orders/${encodeURIComponent(id)}/payments`, { method: 'POST', body: { method, amount, reference } });
    },
    refund(id, { overrideOwnerId } = {}) {
      const body = {};
      if (overrideOwnerId) body.overrideOwnerId = overrideOwnerId;
      return request(`/orders/${encodeURIComponent(id)}/refund`, { method: 'POST', body });
    },
    refundItems(id, items, { overrideOwnerId } = {}) {
      const body = { items };
      if (overrideOwnerId) body.overrideOwnerId = overrideOwnerId;
      return request(`/orders/${encodeURIComponent(id)}/refund-items`, { method: 'POST', body });
    },
    logEvent(id, { action, meta } = {}) {
      return request(`/orders/${encodeURIComponent(id)}/events`, { method: 'POST', body: { action, meta } });
    },
  },
  prices: {
    effective({ branchId, sectionId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (sectionId) params.set('sectionId', sectionId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/prices${q}`);
    },
  },
  priceLists: {
    create({ name, branchId, sectionId, active } = {}) {
      return request('/price-lists', { method: 'POST', body: { name, branchId, sectionId, active } });
    },
    upsertEntries({ priceListId, branchId, sectionId, entries } = {}) {
      return request('/price-lists/entries', { method: 'POST', body: { priceListId, branchId, sectionId, entries } });
    },
  },
  sections: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/sections${q}`);
    },
    listAllowed({ branchId, productTypeId, productTypeName } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      if (productTypeId) params.set('productTypeId', productTypeId);
      if (!productTypeId && productTypeName) params.set('productTypeName', productTypeName);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/sections/allowed${q}`);
    },
    create({ branchId, name, description, func, sectionFunctionId }) {
      const body = { branchId, name, description, function: func };
      if (sectionFunctionId) body.sectionFunctionId = sectionFunctionId;
      return request('/sections', { method: 'POST', body });
    },
    update(id, { name, description, func, sectionFunctionId }) {
      const body = { name, description, function: func };
      if (sectionFunctionId !== undefined) body.sectionFunctionId = sectionFunctionId;
      return request(`/sections/${encodeURIComponent(id)}`, { method: 'PUT', body });
    },
    remove(id) {
      return request(`/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  serviceTypes: {
    list({ branchId } = {}) {
      const params = new URLSearchParams();
      if (branchId) params.set('branchId', branchId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/service-types${q}`);
    },
    create({ branchId, name, description } = {}) {
      return request('/service-types', { method: 'POST', body: { branchId, name, description } });
    },
    update(id, data) {
      return request(`/service-types/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/service-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  },
  tables: {
    list({ sectionId } = {}) {
      const params = new URLSearchParams();
      if (sectionId) params.set('sectionId', sectionId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/tables${q}`);
    },
    create({ sectionId, name, capacity } = {}) {
      return request(`/tables`, { method: 'POST', body: { sectionId, name, capacity } });
    },
    update(id, data) {
      return request(`/tables/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
    },
    remove(id) {
      return request(`/tables/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    lock(id) {
      return request(`/tables/${encodeURIComponent(id)}/lock`, { method: 'PUT' });
    },
    unlock(id) {
      return request(`/tables/${encodeURIComponent(id)}/unlock`, { method: 'PUT' });
    },
  },
  hrm: {
    overridePin: {
      get({ branchId } = {}) {
        const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        return request(`/hrm/override-pin${q}`);
      },
      set({ branchId, pin, graceSeconds } = {}) {
        return request('/hrm/override-pin/set', { method: 'POST', body: { branchId, pin, graceSeconds } });
      },
      verify({ branchId, pin } = {}) {
        return request('/hrm/override-pin/verify', { method: 'POST', body: { branchId, pin } });
      },
      setUser({ userId, branchId, pin } = {}) {
        return request('/hrm/override-pin/user/set', { method: 'POST', body: { userId, branchId, pin } });
      },
      verifyUser({ userId, branchId, pin } = {}) {
        return request('/hrm/override-pin/user/verify', { method: 'POST', body: { userId, branchId, pin } });
      },
    },
    employees: {
      list({ branchId, q } = {}) {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        if (q) params.set('q', q);
        const qstr = params.toString() ? `?${params.toString()}` : '';
        return request(`/hrm/employees${qstr}`);
      },
      create({ userId, branchId, jobTitle, hourlyRate, hireDate }) {
        return request('/hrm/employees', { method: 'POST', body: { userId, branchId, jobTitle, hourlyRate, hireDate } });
      },
      update(id, data) {
        return request(`/hrm/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
      },
      setPin(id, pin) {
        return request(`/hrm/employees/${encodeURIComponent(id)}/pin`, { method: 'PUT', body: { pin } });
      },
    },
    shifts: {
      list({ branchId, from, to, userId } = {}) {
        return request('/hrm/leaves', { method: 'POST', body: { userId, branchId, type, startDate, endDate, reason } });
      },
      approve(id, approverUserId) {
        return request(`/hrm/leaves/${encodeURIComponent(id)}/approve`, { method: 'POST', body: { approverUserId } });
      },
      reject(id, approverUserId, reason) {
        return request(`/hrm/leaves/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { approverUserId, reason } });
      },
      cancel(id, byUserId) {
        return request(`/hrm/leaves/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: { byUserId } });
      },
    },
    recruitment: {
      list({ branchId } = {}) {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        const q = params.toString() ? `?${params.toString()}` : '';
        return request(`/hrm/recruitment${q}`);
      },
      create({ branchId, title, department, status } = {}) {
        return request('/hrm/recruitment', { method: 'POST', body: { branchId, title, department, status } });
      },
      update(id, data) {
        return request(`/hrm/recruitment/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
      },
      remove(id) {
        return request(`/hrm/recruitment/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
    },
    reviews: {
      list({ branchId, userId } = {}) {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        if (userId) params.set('userId', userId);
        const q = params.toString() ? `?${params.toString()}` : '';
        return request(`/hrm/reviews${q}`);
      },
      create({ branchId, userId, rating, comments } = {}) {
        return request('/hrm/reviews', { method: 'POST', body: { branchId, userId, rating, comments } });
      },
      update(id, data) {
        return request(`/hrm/reviews/${encodeURIComponent(id)}`, { method: 'PUT', body: data });
      },
      remove(id) {
        return request(`/hrm/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
      },
    },
  },
  audit: {
    log({ action, userId, branchId, meta } = {}) {
      return request('/audit/log', { method: 'POST', body: { action, userId, branchId, meta } });
    },
  },
};
