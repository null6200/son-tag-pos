import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Coffee, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from '@/lib/api';

const LoginPage = ({ onLogin, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(() => {
    try { return localStorage.getItem('selectedBranchId') || ''; } catch { return ''; }
  });
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [brand, setBrand] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || 'null') || null; } catch { return null; }
  });
  const [expired, setExpired] = useState(() => {
    try { return new URL(window.location.href).searchParams.get('expired') === '1'; } catch { return false; }
  });

  useEffect(() => {
    // If redirected here with expired flag, clear it to prevent loops and allow auth flows
    try {
      if (expired) {
        window.sessionStorage && window.sessionStorage.removeItem('auth_expired');
        const url = new URL(window.location.href);
        if (url.searchParams.has('expired')) {
          url.searchParams.delete('expired');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? '?' + url.searchParams.toString() : '') + url.hash);
        }
      }
    } catch {}

    const sync = () => {
      try { setBrand(JSON.parse(localStorage.getItem('businessInfo') || 'null') || null); } catch {}
    };
    const onExpired = () => setExpired(true);
    window.addEventListener('storage', sync);
    window.addEventListener('businessInfoUpdated', sync);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('businessInfoUpdated', sync);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchBranches = async (attempt = 1) => {
      try {
        const list = await (api.branches.publicList?.() || api.branches.list());
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setBranches(list);
          try { localStorage.setItem('loungeBranchesCache', JSON.stringify(list)); } catch {}
          if (list.length === 1) setSelectedBranch(String(list[0].id));
          return true;
        }
      } catch {}
      try {
        const base = (import.meta.env?.VITE_API_URL) || 'http://localhost:4000';
        const res = await fetch(`${base}/api/public/branches?t=${Date.now()}`);
        if (!cancelled && res.ok) {
          const json = await res.json();
          const arr = Array.isArray(json) ? json : [];
          setBranches(arr);
          try { localStorage.setItem('loungeBranchesCache', JSON.stringify(arr)); } catch {}
          if (arr.length === 1) setSelectedBranch(String(arr[0].id));
          if (arr.length > 0) return true;
        }
      } catch {}
      // Fallback to cache
      const cached = localStorage.getItem('loungeBranchesCache');
      if (!cancelled && cached) {
        const arr = JSON.parse(cached);
        setBranches(Array.isArray(arr) ? arr : []);
        if (Array.isArray(arr) && arr.length === 1) setSelectedBranch(String(arr[0].id));
        if (Array.isArray(arr) && arr.length > 0) return true;
      }
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 800));
        return fetchBranches(attempt + 1);
      }
      if (!cancelled) setBranches([]);
      return false;
    };
    fetchBranches();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clear any lingering expired flags on user action
    try { window.sessionStorage && window.sessionStorage.removeItem('auth_expired'); } catch {}
    const requireBranch = Array.isArray(branches) && branches.length > 0;
    if (!email || !password || (requireBranch && !selectedBranch)) {
      toast({
        title: "Error",
        description: "Please fill in all fields, including selecting a branch.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      try { if (selectedBranch) localStorage.setItem('selectedBranchId', selectedBranch); } catch {}
      await onLogin({ email, password });
      const branchDetails = branches.find(b => b.id?.toString() === selectedBranch);
      toast({
        title: "Welcome back! 🎉",
        description: `Logged into ${branchDetails ? branchDetails.name : 'Selected branch'} as ${email}`,
      });
    } catch (err) {
      toast({ title: "Login failed", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-indigo-600/20" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-effect rounded-3xl p-8 shadow-2xl">
          {expired && (
            <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
              Session expired due to inactivity. Please sign in again.
            </div>
          )}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-center mb-8"
          >
            {brand?.logoUrl ? (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-4 shadow-lg overflow-hidden">
                <img src={brand.logoUrl} alt="logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 mb-4 shadow-lg">
                <Coffee className="w-10 h-10 text-white" />
              </div>
            )}
            <h1 className="text-4xl font-bold gradient-text mb-2">{brand?.name || ''}</h1>
            <p className="text-gray-600">Sign In to Your Business</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-gray-700 font-semibold">Branch</Label>
              <div className="relative">
                 <Select value={selectedBranch} onValueChange={(val) => { setSelectedBranch(val); try { localStorage.setItem('selectedBranchId', val); } catch {} }} disabled={!branches?.length}>
                    <SelectTrigger className="h-12 border-2 focus:border-purple-500 transition-all pl-10 disabled:opacity-60 disabled:cursor-not-allowed">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <SelectValue placeholder={branches?.length ? "Select a branch to log into" : "No branches found — continue without selecting"} />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.isArray(branches) && branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-2 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 border-2 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Don't have an account? <span onClick={onNavigateToRegister} className="font-semibold text-purple-600 hover:underline cursor-pointer">Register here</span>.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;