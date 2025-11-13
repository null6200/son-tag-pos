
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import LoginPage from '@/pages/LoginPage';
import Dashboard from '@/pages/Dashboard';
import { Toaster } from '@/components/ui/toaster';
import LandingPage from '@/pages/LandingPage';
import RegisterPage from '@/pages/RegisterPage';
import { api, setAuthProvider } from '@/lib/api';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'login', 'register', 'dashboard'
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [draftToLoad, setDraftToLoad] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [initialShift, setInitialShift] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || 'null'); } catch { return null; }
  });

  // Ensure a new business starts with fresh local data
  // Preserve user-managed master data: categories, sub categories, brands
  // Also preserve cached products and stock by branch across refresh/login
  const clearLoungeStorage = () => {
    const preserveExact = new Set(['loungeCategories', 'loungeSubCategories', 'loungeBrands']);
    const preservePrefixes = ['loungeProducts:', 'loungeStockLevels:'];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith('lounge')) continue;
      if (preserveExact.has(k)) continue;
      if (preservePrefixes.some((p) => k.startsWith(p))) continue;
      keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  };

  useEffect(() => {
    // Theme setup (pre-login default)
    document.body.classList.add('new-dashboard-style');

    // One-time cleanup to wipe legacy demo/local data
    try {
      if (!localStorage.getItem('loungeClearedV1')) {
        clearLoungeStorage();
        localStorage.setItem('loungeClearedV1', 'true');
      }
    } catch {}

    // Fetch public branding for landing/login before auth
    (async () => {
      try {
        // Resolve branchId preference
        let branchId = undefined;
        try {
          const cachedSelected = localStorage.getItem('selectedBranchId');
          if (cachedSelected) branchId = cachedSelected;
          if (!branchId) {
            const cachedUser = JSON.parse(localStorage.getItem('loungeUser') || 'null');
            if (cachedUser?.branchId || cachedUser?.branch?.id) branchId = cachedUser.branchId || cachedUser.branch.id;
          }
        } catch {}
        if (!branchId) {
          try {
            const branches = await api.branches.publicList?.();
            if (Array.isArray(branches) && branches.length > 0) branchId = branches[0].id || branches[0].branchId || branches[0]._id;
          } catch {}
        }
        const s = await api.settings.publicGet(branchId ? { branchId } : {});
        if (s) {
          const info = {
            name: s.businessName || '',
            logoUrl: s.logoUrl || '',
            address: s.address || '',
            phone: s.phone || '',
            email: s.email || '',
            currencySymbol: s.currencySymbol || s.currency || '₦',
            currency: s.currency || s.currencyCode || 'NGN',
            theme: s.theme || undefined,
          };
          setBusinessInfo(info);
          try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
        }
      } catch {}
    })();

    // Attempt cookie-based session if present (no header yet)
    api.me()
      .then(async (user) => {
        setCurrentUser(user);
        try { localStorage.setItem('loungeUser', JSON.stringify(user || null)); } catch {}
        try {
          const prefs = await api.users.getPreferences();
          const t = prefs?.theme === 'dark' ? 'dark' : 'light';
          setTheme(t);
          document.documentElement.classList.toggle('dark', t === 'dark');
        } catch {}
        try {
          const cur = await api.shifts.current({});
          if (cur && cur.id && !cur.closedAt) setInitialShift(cur);
        } catch {}
        setView('dashboard');
      })
      .catch(() => {
        setView('landing');
      });
  }, []);

  // Keep API Authorization header in sync with in-memory token
  useEffect(() => {
    setAuthProvider(() => authToken || null);
  }, [authToken]);

  const handleSetTheme = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    // Persist to backend when logged in
    try {
      if (currentUser?.id) {
        await api.users.updatePreferences({ theme: newTheme });
      }
    } catch {}
  };

  const handleLogin = async ({ email, password }) => {
    const { token, user } = await api.login({ username: email, password });
    clearLoungeStorage();
    try { if (token) { localStorage.setItem('access_token', token); sessionStorage.setItem('access_token', token); } } catch {}
    setAuthToken(token);
    setCurrentUser(user);
    try { localStorage.setItem('loungeUser', JSON.stringify(user || null)); } catch {}
    // Load branch-scoped business settings right after login
    try {
      let branchId = user?.branchId || user?.branch?.id;
      if (!branchId) {
        try {
          const branches = await api.branches.list();
          if (Array.isArray(branches) && branches.length) {
            branchId = branches[0].id;
            try { localStorage.setItem('selectedBranchId', branchId); } catch {}
          }
        } catch {}
      }
      if (branchId) {
        const s = await api.settings.get({ branchId });
        if (s) {
          const info = {
            name: s.businessName || 'Lounge ERP',
            logoUrl: s.logoUrl || '',
            address: s.address || '',
            phone: s.phone || '',
            email: s.email || '',
            currencySymbol: s.currencySymbol || s.currency || '₦',
            currency: s.currency || s.currencyCode || 'NGN',
            theme: s.theme || undefined,
          };
          try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
        }
      }
    } catch {}
    try {
      const prefs = await api.users.getPreferences();
      const t = prefs?.theme === 'dark' ? 'dark' : 'light';
      setTheme(t);
      document.documentElement.classList.toggle('dark', t === 'dark');
    } catch {}
    try {
      const cur = await api.shifts.current({});
      if (cur && cur.id && !cur.closedAt) setInitialShift(cur);
      else setInitialShift(null);
    } catch { setInitialShift(null); }
    setView('dashboard');
  };
  
  const handleRegister = async (businessData, ownerData) => {
    try {
      console.log('[Register] Starting registration', { businessData, ownerData });
      // Register the user (Prisma/JWT)
      const regResult = await api.register({
        username: ownerData.username || ownerData.email,
        email: ownerData.email,
        password: ownerData.password,
        branchName: businessData.businessName || undefined,
        branchLocation: [businessData.city, businessData.state, businessData.country].filter(Boolean).join(', ') || undefined,
      });
      console.log('[Register] Registration result:', regResult);
      // Immediately log in the user
      const loginResult = await api.login({ username: ownerData.email, password: ownerData.password });
      console.log('[Register] Login result:', loginResult);
      clearLoungeStorage();
      // In JWT mode, cookie is also set. Keep token in memory if provided
      try { if (loginResult?.token) { setAuthToken(loginResult.token); localStorage.setItem('access_token', loginResult.token); sessionStorage.setItem('access_token', loginResult.token); } } catch {}
      // Always try to fetch the current user after login
      try {
        const user = await api.me();
        console.log('[Register] api.me() result:', user);
        setCurrentUser(user);
      } catch (err) {
        console.log('[Register] api.me() failed:', err);
        setCurrentUser(null);
      }
      try {
        const prefs = await api.users.getPreferences();
        const t = prefs?.theme === 'dark' ? 'dark' : 'light';
        setTheme(t);
        document.documentElement.classList.toggle('dark', t === 'dark');
      } catch {}
      // Persist business settings immediately for this branch
      try {
        const me = await api.me();
        const branchId = me?.branchId || me?.branch?.id;
        if (branchId) {
          await api.settings.update({ branchId, businessName: businessData.businessName, currency: businessData.currency });
          let s = await api.settings.get({ branchId });
          let info = {
            name: s?.businessName || s?.name || businessData.businessName,
            logoUrl: s?.logoUrl || '',
            address: s?.address || '',
            phone: s?.phone || '',
            email: s?.email || '',
            currencySymbol: s?.currencySymbol || s?.currency || '₦',
            currency: s?.currency || businessData.currency || 'NGN',
            theme: s?.theme || undefined,
          };
          // If a logo was provided during registration, upload and override
          try {
            if (businessData?.logo) {
              const toBlob = async (dataUrl) => {
                const res = await fetch(dataUrl);
                return res.blob();
              };
              const blob = await toBlob(businessData.logo);
              const file = new File([blob], 'logo.png', { type: blob.type || 'image/png' });
              const up = await api.settings.uploadLogo(file);
              if (up && up.url) {
                info.logoUrl = up.url;
                try { await api.settings.update({ branchId, logoUrl: up.url }); } catch {}
              }
            }
          } catch {}
          try { localStorage.setItem('businessInfo', JSON.stringify(info)); } catch {}
        }
      } catch {}
      try {
        const cur = await api.shifts.current({});
        if (cur && cur.id && !cur.closedAt) setInitialShift(cur); else setInitialShift(null);
      } catch { setInitialShift(null); }
      setView('dashboard');
    } catch (e) {
      console.log('[Register] Registration or login error:', e);
      setView('register');
    }
  };

  const handleLogout = () => {
    // Clear in-memory state first
    setCurrentUser(null);
    setAuthToken(null);
    setView('landing');

    // Clear access tokens from storages
    try {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('loungeUser');
      localStorage.removeItem('loungeShiftRegister');
    } catch {}

    // Proactively clear common auth cookies so api.me() won't re-auth via cookie
    try {
      const cookieNames = ['access_token', 'auth_token', 'token', 'jwt'];
      const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; expires=${past}; path=/;`;
      });
    } catch {}
  };

  const handleSetDraftToLoad = (draft) => {
    setDraftToLoad(draft);
  };
  
  const handleClearDraftToLoad = () => {
    setDraftToLoad(null);
  };

  const renderContent = () => {
    switch (view) {
      case 'login':
        return <LoginPage onLogin={handleLogin} onNavigateToRegister={() => setView('register')} />;
      case 'register':
        return <RegisterPage onRegister={handleRegister} onNavigateToLogin={() => setView('login')} onRegistered={() => setView('dashboard')} />;
      case 'dashboard':
        return (
          <Dashboard 
            user={currentUser} 
            onLogout={handleLogout} 
            theme={theme} 
            setTheme={handleSetTheme}
            initialShift={initialShift}
            draftToLoad={draftToLoad}
            onSetDraftToLoad={handleSetDraftToLoad}
            onClearDraftToLoad={handleClearDraftToLoad}
          />
        );
      case 'landing':
      default:
        return <LandingPage onSignInClick={() => setView('login')} onRegisterClick={() => setView('register')} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>{(businessInfo && businessInfo.name) ? businessInfo.name : ''}</title>
        <meta name="description" content="SonTag POS/ERP software: Comprehensive ERP system for lounge management with POS, inventory, staff management, and multi-branch capabilities" />
      </Helmet>
      
      {renderContent()}
      
      <Toaster />
    </>
  );
}
