import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Coffee, LogIn, UserPlus } from 'lucide-react';

const LandingPage = ({ onSignInClick, onRegisterClick }) => {
  const [info, setInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}; } catch { return {}; }
  });
  const brandName = info?.name || '';
  const logoUrl = info?.logoUrl || '';

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      try { if (!cancelled) setInfo(JSON.parse(localStorage.getItem('businessInfo') || '{}') || {}); } catch {}
    };
    const fetchPublic = async () => {
      try {
        let branchId = undefined;
        try { branchId = localStorage.getItem('selectedBranchId') || undefined; } catch {}
        const s = await api.settings.publicGet(branchId ? { branchId } : {});
        const merged = {
          name: s?.businessName || '',
          logoUrl: s?.logoUrl || '',
          address: s?.address || '',
          phone: s?.phone || '',
          email: s?.email || '',
          currencySymbol: s?.currencySymbol || s?.currency || '₦',
          currency: s?.currency || 'NGN',
          theme: s?.theme || undefined,
        };
        if (!cancelled) setInfo(merged);
        try { localStorage.setItem('businessInfo', JSON.stringify(merged)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
      } catch {}
    };
    fetchPublic();
    window.addEventListener('storage', sync);
    window.addEventListener('businessInfoUpdated', sync);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', sync);
      window.removeEventListener('businessInfoUpdated', sync);
    };
  }, []);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-pink-500/10 to-indigo-600/10 z-0" />
      
      <motion.main 
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mb-8">
            {logoUrl ? (
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white shadow-2xl overflow-hidden">
                <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <motion.div 
                className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1, 1.05, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Coffee className="w-16 h-16 text-white" />
              </motion.div>
            )}
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold mb-4">
          <span className="gradient-text">{brandName}</span>
        </h1>
        <p className="max-w-2xl text-lg md:text-xl text-gray-600 mb-12">
          The all-in-one solution for managing your business. From Point of Sale to Inventory and Staff Management, we've got you covered.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={onSignInClick} 
              className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={onRegisterClick} 
              variant="outline" 
              className="w-full sm:w-auto h-14 px-8 text-lg font-semibold border-2 border-purple-600 text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-all"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Register
            </Button>
          </motion.div>
        </div>
      </motion.main>

      <footer className="absolute bottom-6 text-center text-gray-500 z-10">
        <p>&copy; {new Date().getFullYear()} {brandName}. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;