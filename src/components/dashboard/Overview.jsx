import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  FileText, 
  AlertCircle, 
  RefreshCw, 
  DollarSign, 
  CreditCard, 
  MinusCircle,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react';
import { format, subDays } from "date-fns";
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { hasAny } from '@/lib/permissions';

const colorPalette = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#eab308', 
  '#ec4899', '#14b8a6', '#6366f1', '#ef4444', '#84cc16'
];

// No demo/random data: dashboard should reflect real backend data. If none, show zeros.

const StatCard = ({ icon: Icon, title, value, color, index, formatCurrency }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency ? formatCurrency(value) : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-black/90 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className="label font-bold text-gray-800 dark:text-gray-200">{`${label}`}</p>
                {payload.map((pld) => (
                    <div key={pld.dataKey} style={{ color: pld.color }} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }}></div>
                        <span>{(pld.name === (window.__businessName || '')) ? 'Section' : pld.name}: {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(pld.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const formatYAxis = (tick) => {
    if (tick >= 1000000) {
        return `${(tick / 1000000).toFixed(1)}M`;
    }
    if (tick >= 1000) {
        return `${(tick/1000).toFixed(0)}K`;
    }
    return tick;
};

const Overview = ({ user }) => {
  const [locations, setLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [fullSalesData, setFullSalesData] = useState([]);
  const [filteredSalesData, setFilteredSalesData] = useState([]);
  const [stats, setStats] = useState([]);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [businessInfo, setBusinessInfo] = useState({});
  const [sections, setSections] = useState([]);
  const themes = [
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
    { id: 'emerald', name: 'Emerald' },
    { id: 'rose', name: 'Rose' },
    { id: 'slate', name: 'Slate' },
  ];
  const [date, setDate] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  const canSeeKPIs = hasAny(perms, [
    'view_purchase_sell_report',
    'view_profit_loss_report',
    'view_stock_related_reports',
    'view_home_data'
  ]);
  const canUseFilters = canSeeKPIs; // only allow filters for reporting-capable roles

  // KPI formatter: 1,234,567.89 (no currency symbol)
  const formatCurrency = (v) => {
    const n = Number(v || 0);
    try {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    } catch {
      try { return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch { return (n || 0).toFixed(2); }
    }
  };

  const applyTheme = (name) => {
    const root = document.documentElement;
    const THEMES = {
      light: { '--background': '255 255 255', '--foreground': '15 23 42', '--card': '255 255 255', '--primary': '59 130 246', '--accent': '16 185 129' },
      dark: { '--background': '2 6 23', '--foreground': '226 232 240', '--card': '15 23 42', '--primary': '99 102 241', '--accent': '244 63 94' },
      emerald: { '--background': '250 250 250', '--foreground': '15 23 42', '--card': '255 255 255', '--primary': '16 185 129', '--accent': '59 130 246' },
      rose: { '--background': '255 255 255', '--foreground': '24 24 27', '--card': '255 255 255', '--primary': '244 63 94', '--accent': '234 179 8' },
      slate: { '--background': '248 250 252', '--foreground': '15 23 42', '--card': '255 255 255', '--primary': '100 116 139', '--accent': '59 130 246' },
    };
    const t = THEMES[String(name || '').toLowerCase()] || THEMES.light;
    try { Object.entries(t).forEach(([k, v]) => root.style.setProperty(k, v)); root.setAttribute('data-theme', String(name || 'light')); } catch {}
  };

  const handleThemeChange = async (themeId) => {
    try {
      const branchId = (selectedLocation && selectedLocation !== 'all') ? selectedLocation : (user?.branchId || user?.branch?.id);
      await api.settings.update({ branchId, theme: themeId });
      const next = { ...businessInfo, theme: themeId };
      setBusinessInfo(next);
      try { localStorage.setItem('businessInfo', JSON.stringify(next)); } catch {}
      applyTheme(themeId);
      try { window.dispatchEvent(new CustomEvent('theme:changed', { detail: { theme: themeId } })); } catch {}
    } catch {}
  };

  useEffect(() => {
    (async () => {
      if (!canUseFilters) {
        setBranches([]);
        setLocations([]);
        setSelectedLocation('all');
        return;
      }
      try {
        const list = await api.branches.list();
        const safe = Array.isArray(list) ? list : [];
        setBranches(safe);
        const allLocations = [{ id: 'all', name: 'All Locations' }, ...safe];
        setLocations(allLocations);
        if (safe.length > 0) setSelectedLocation('all');
      } catch {
        setBranches([]);
        setLocations([{ id: 'all', name: 'All Locations' }]);
        setSelectedLocation('all');
      }
    })();
  }, [canUseFilters]);

  // Load sections for the selected branch (or union across branches when 'All Locations') to populate legend
  useEffect(() => {
    (async () => {
      if (!canUseFilters) { setSections([]); return; }
      if (selectedLocation && selectedLocation !== 'all') {
        // Single branch
        try {
          const secs = await api.sections.list({ branchId: selectedLocation });
          setSections(Array.isArray(secs) ? secs : []);
        } catch { setSections([]); }
        return;
      }
      // All locations: merge unique section names across all branches
      try {
        const ids = (branches || []).map(b => b.id).filter(Boolean);
        const lists = await Promise.all(ids.map(async (bid) => {
          try { const arr = await api.sections.list({ branchId: bid }); return Array.isArray(arr) ? arr : []; } catch { return []; }
        }));
        const merged = [];
        const seen = new Set();
        for (const arr of lists) {
          for (const s of arr) {
            const name = s?.name || '';
            if (!name || seen.has(name)) continue;
            seen.add(name);
            merged.push({ id: s.id, name });
          }
        }
        setSections(merged);
      } catch { setSections([]); }
    })();
  }, [selectedLocation, canUseFilters, JSON.stringify(branches)]);

  useEffect(() => {
    (async () => {
      if (!canUseFilters) {
        // Stricter view: do not hit protected report endpoints
        setFullSalesData([]);
        setStats([]);
        return;
      }
      if (!branches || branches.length === 0) {
        setFullSalesData([]);
        setStats([
          { title: 'Total Sales', value: 0, icon: ShoppingCart, color: 'bg-cyan-500' },
          { title: 'Net Sales', value: 0, icon: FileText, color: 'bg-green-500' },
          { title: 'Invoice Due', value: 0, icon: AlertCircle, color: 'bg-orange-500' },
          { title: 'Total Sell Return', value: 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Total Purchase', value: 0, icon: DollarSign, color: 'bg-cyan-500' },
          { title: 'Purchase Due', value: 0, icon: CreditCard, color: 'bg-orange-500' },
          { title: 'Total Purchase Return', value: 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Expense', value: 0, icon: MinusCircle, color: 'bg-red-500' },
        ]);
        return;
      }

      const from = date.from?.toISOString();
      const to = date.to?.toISOString();
      try {
        // Aggregate all branches if 'all' selected; otherwise single branch
        const branchId = (selectedLocation && selectedLocation !== 'all') ? selectedLocation : undefined;
        const res = await api.reports.overview({ branchId, from, to });
        const daily = Array.isArray(res?.daily) ? res.daily : [];
        const dailyByBranch = Array.isArray(res?.dailyByBranch) ? res.dailyByBranch : [];
        const dailyBySection = Array.isArray(res?.dailyBySection) ? res.dailyBySection : [];

        const combined = [];
        const canonicalSections = (sections || []).map(s => String(s.name || '').trim()).filter(Boolean);
        const canonicalLower = canonicalSections.map(n => n.toLowerCase());

        const allByDate = new Map(daily.map(r => [r.date, r.value]));
        const allDatesSet = new Set([
          ...daily.map(r => r.date),
          ...dailyByBranch.map(r => r.date),
          ...dailyBySection.map(r => r.date),
        ]);
        const allDates = [...allDatesSet].sort((a,b) => a.localeCompare(b));

        const getValueForSection = (row, sectionName) => {
          if (!row) return 0;
          const exact = row[sectionName];
          if (exact != null) return Number(exact || 0);
          const keys = Object.keys(row).filter(k => k !== 'date');
          const target = String(sectionName).toLowerCase();
          for (const k of keys) {
            const nk = String(k).trim();
            if (!nk) continue;
            const low = nk.toLowerCase();
            if (low === target) return Number(row[k] || 0);
          }
          return 0;
        };

        for (const dateKey of allDates) {
          const base = { date: dateKey };
          const sourceRow = (dailyBySection.length ? dailyBySection : dailyByBranch).find(r => r.date === dateKey) || {};
          for (const name of canonicalSections) {
            base[name] = getValueForSection(sourceRow, name);
          }
          base['All sections'] = Number(allByDate.get(dateKey) || 0);
          combined.push(base);
        }

        try {
          if (!dailyBySection.length) {
            const targetBranches = branchId ? [branchId] : (branches || []).map(b => b.id).filter(Boolean);
            const lists = await Promise.all(targetBranches.map(async (bid) => {
              try { return await api.orders.list({ branchId: bid, from, to }); } catch { return []; }
            }));
            const allOrders = lists.flatMap(resp => Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []));
            const nameById = Object.fromEntries((sections || []).map(s => [s.id, s.name]));
            const perDaySection = new Map();
            for (const o of allOrders) {
              const rawDate = o?.createdAt || o?.date || o?.issuedAt;
              const d = rawDate ? new Date(rawDate) : null;
              if (!d || !isFinite(d)) continue;
              const day = d.toISOString().slice(0,10);
              const secName = (o?.sectionName || nameById[o?.sectionId]) || null;
              if (!secName) continue;
              const total = Number(o?.totalAmount ?? o?.total ?? 0) || 0;
              if (!perDaySection.has(day)) perDaySection.set(day, {});
              const bucket = perDaySection.get(day);
              bucket[secName] = Number(bucket[secName] || 0) + Math.max(0, total);
            }
            for (const row of combined) {
              const day = row.date?.slice(0,10);
              const bucket = day ? perDaySection.get(day) : null;
              if (!bucket) continue;
              for (const [sec, amt] of Object.entries(bucket)) {
                const idx = canonicalLower.indexOf(String(sec).toLowerCase());
                if (idx === -1) continue;
                const key = canonicalSections[idx];
                row[key] = Number(row[key] || 0) + Number(amt || 0);
              }
            }
          }
        } catch {}

        setFullSalesData(combined);

        const t = res?.totals || {};
        const invoiceDueValue = Number(t.invoiceDue || 0);

        let totalSellReturnFallback = 0;
        try {
          const targetBranches = branchId ? [branchId] : (branches || []).map(b => b.id).filter(Boolean);
          const lists = await Promise.all(targetBranches.map(async (bid) => {
            const resp = await api.orders.list({ branchId: bid, from, to });
            return Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
          }));
          const allOrders = lists.flat();
          const returns = allOrders.filter(o => {
            const status = String(o?.status || '').toUpperCase();
            const type = String(o?.type || '').toUpperCase();
            const hasRefundField = Number(o?.refundTotal || o?.refundedAmount || 0) > 0;
            const negativeTotal = Number(o?.totalAmount ?? o?.total ?? 0) < 0;
            const negativeItems = Array.isArray(o?.items) && o.items.every(it => Number(it?.qty || 0) < 0);
            return status === 'REFUNDED' || status === 'CANCELLED' || o?.refunded === true || hasRefundField || negativeTotal || type === 'RETURN' || negativeItems;
          });
          totalSellReturnFallback = returns.reduce((sum, o) => {
            const refund = Number(o?.refundTotal ?? o?.refundedAmount ?? 0);
            if (refund > 0) return sum + Math.abs(refund);
            const total = Number(o?.totalAmount ?? o?.total ?? 0);
            return sum + Math.abs(total);
          }, 0);
        } catch {}

        const apiTotalSellReturn = Number(t.totalSellReturn || 0);
        const totalSellReturnValue = apiTotalSellReturn > 0 ? apiTotalSellReturn : totalSellReturnFallback;

        setStats([
          { title: 'Total Sales', value: t.totalSales || 0, icon: ShoppingCart, color: 'bg-cyan-500' },
          { title: 'Net Sales', value: t.netSales || 0, icon: FileText, color: 'bg-green-500' },
          { title: 'Invoice Due', value: invoiceDueValue || 0, icon: AlertCircle, color: 'bg-orange-500' },
          { title: 'Total Sell Return', value: totalSellReturnValue || 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Total Purchase', value: t.totalPurchase || 0, icon: DollarSign, color: 'bg-cyan-500' },
          { title: 'Purchase Due', value: t.purchaseDue || 0, icon: CreditCard, color: 'bg-orange-500' },
          { title: 'Total Purchase Return', value: t.totalPurchaseReturn || 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Expense', value: t.expense || 0, icon: MinusCircle, color: 'bg-red-500' },
        ]);
      } catch (e) {
        console.error(e);
        setFullSalesData([]);
        setStats([
          { title: 'Total Sales', value: 0, icon: ShoppingCart, color: 'bg-cyan-500' },
          { title: 'Net Sales', value: 0, icon: FileText, color: 'bg-green-500' },
          { title: 'Invoice Due', value: 0, icon: AlertCircle, color: 'bg-orange-500' },
          { title: 'Total Sell Return', value: 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Total Purchase', value: 0, icon: DollarSign, color: 'bg-cyan-500' },
          { title: 'Purchase Due', value: 0, icon: CreditCard, color: 'bg-orange-500' },
          { title: 'Total Purchase Return', value: 0, icon: RefreshCw, color: 'bg-red-500' },
          { title: 'Expense', value: 0, icon: MinusCircle, color: 'bg-red-500' },
        ]);
      }
    })();
  }, [branches, selectedLocation, date, refreshSeq, canUseFilters, sections, businessInfo?.name]);

  // Listen for global refresh events from POS (e.g., when suspended bills are paid)
  useEffect(() => {
    const handler = () => setRefreshSeq((n) => n + 1);
    try { window.addEventListener('reports:refresh', handler); } catch {}
    return () => { try { window.removeEventListener('reports:refresh', handler); } catch {} };
  }, []);

  // Load business settings for branding and currency
  useEffect(() => {
    (async () => {
      try {
        const branchId = (selectedLocation && selectedLocation !== 'all') ? selectedLocation : (user?.branchId || user?.branch?.id);
        const s = await api.settings.get(branchId ? { branchId } : {});
        const info = {
          name: s?.businessName || '',
          logoUrl: s?.logoUrl || '',
          address: s?.address || '',
          phone: s?.phone || '',
          email: s?.email || '',
          currency: s?.currency || '',
          currencySymbol: s?.currencySymbol || '',
        };
        setBusinessInfo(info);
        try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
      } catch {}
    })();
  }, [selectedLocation, user?.branchId]);

  useEffect(() => {
    const filtered = fullSalesData.map(d => ({ ...d, date: d.date }));
    setFilteredSalesData(filtered);
  }, [fullSalesData]);
  
  // Derive series names from data plus known section names for selected branch
  const dynamicBranchNames = Array.from(new Set([
    ...(filteredSalesData.flatMap(row => Object.keys(row).filter(k => {
      const nk = String(k).trim();
      if (nk === 'date') return false;
      if (nk.toLowerCase() === 'all sections') return false;
      if (businessInfo?.name && nk === businessInfo.name) return false;
      return true;
    }))),
    ...((sections || []).map(s => s.name).filter(Boolean)),
  ]));
  const chartLocations = dynamicBranchNames.map((name, index) => ({
    name,
    color: colorPalette[index % colorPalette.length],
  }));

  const totalSeries = { name: 'All sections', color: '#ef4444' };

  // Always base legend/series on sections + aggregate, regardless of location selection
  const displayedChartKeys = [...chartLocations.map(l => l.name), totalSeries.name];

  // Build monthly series for the current financial year (Jan-Dec of current year)
  const currentYear = new Date().getFullYear();
  const monthKeys = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), 'MMM-yyyy'));
  const allKeys = Array.from(new Set([
    ...dynamicBranchNames,
    totalSeries.name,
  ]));
  const monthlyMap = new Map();
  for (const mk of monthKeys) {
    monthlyMap.set(mk, Object.fromEntries([['month', mk], ...allKeys.map(k => [k, 0]) ]));
  }
  for (const row of filteredSalesData) {
    const d = new Date(row.date);
    if (!isFinite(d)) continue;
    if (d.getFullYear() !== currentYear) continue;
    const mk = format(d, 'MMM-yyyy');
    const base = monthlyMap.get(mk) || { month: mk };
    for (const key of Object.keys(row)) {
      if (key === 'date') continue;
      if (!allKeys.includes(key)) continue;
      base[key] = Number(base[key] || 0) + Number(row[key] || 0);
    }
    monthlyMap.set(mk, base);
  }
  const monthlyData = monthKeys.map(k => monthlyMap.get(k) || { month: k });

  // Legend filter: click a section name to show only that line; click 'All sections' to show all
  const [legendSelection, setLegendSelection] = useState('all');
  const handleLegendClick = (name) => {
    if (name === totalSeries.name) { setLegendSelection('all'); return; }
    setLegendSelection(prev => (prev === name ? 'all' : name));
  };
  const baseKeys = legendSelection === 'all'
    ? displayedChartKeys
    : displayedChartKeys.filter(k => k === legendSelection);
  // Final guard against business name leaking as a series key
  const effectiveKeys = baseKeys.filter(k => k !== (businessInfo?.name || ''));

  const renderLegend = (props) => {
    const items = (props && props.payload) ? props.payload : [];
    // Build consistent order: sections first, then total when available
    const names = displayedChartKeys;
    const colorsByName = Object.fromEntries([
      ...chartLocations.map(l => [l.name, l.color]),
      [totalSeries.name, totalSeries.color],
    ]);
    // Expose business name globally so CustomTooltip can map it
    try { window.__businessName = businessInfo?.name || ''; } catch {}
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {names.map((n) => {
          const active = legendSelection === 'all' || legendSelection === n || (n === totalSeries.name && legendSelection === 'all');
          return (
            <div key={n} onClick={() => handleLegendClick(n)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: legendSelection === 'all' || legendSelection === n ? 1 : 0.4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorsByName[n] }} />
              <span style={{ fontSize: 12 }}>{n === (businessInfo?.name || '') ? 'Section' : n}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-dashboard-header text-white p-6 -m-6 mb-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {businessInfo?.logoUrl ? (
              <img src={businessInfo.logoUrl} alt="logo" className="h-8 w-auto object-contain" />
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold">{businessInfo?.name || 'Dashboard'}</h1>
              <p className="text-white/80 text-sm">Welcome {user?.username || 'there'}</p>
            </div>
          </div>
          {canUseFilters && (
          <div className="flex items-center gap-4">
            <div className="w-56">
               <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="bg-white/20 border-white/30 text-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="w-56">
              <Select value={businessInfo?.theme || 'light'} onValueChange={handleThemeChange}>
                <SelectTrigger className="bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"secondary"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          )}
        </div>
      </div>

      {canSeeKPIs && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-6">
          {stats.map((stat, index) => (
            <StatCard key={stat.title} {...stat} index={index} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}

      <div className="p-6 pt-0">
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Sales Last 30 Days</h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredSalesData} margin={{ top: 10, right: 160, left: 16, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.15)" />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} angle={-40} dy={20} height={60} />
                  <YAxis tickFormatter={formatYAxis} fontSize={12} tickLine={false} axisLine={false} label={{ value: `Total Sales (${businessInfo?.currency || 'NGN'})`, angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: 12 }} content={renderLegend} />
                  {chartLocations
                    .filter(loc => effectiveKeys.includes(loc.name))
                    .map(loc => (
                      <Line key={loc.name} type="monotone" dataKey={loc.name} stroke={loc.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} name={loc.name} />
                    ))}
                  {effectiveKeys.includes(totalSeries.name) && (
                    <Line type="monotone" dataKey={totalSeries.name} stroke={totalSeries.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name={totalSeries.name} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>


{/* Current Financial Year (monthly) */}
<div className="p-6 pt-0">
<Card className="bg-white dark:bg-slate-800">
<CardContent className="p-4">
<h2 className="text-lg font-semibold mb-4">Sales Current Financial Year</h2>
<div className="h-[350px]">
<ResponsiveContainer width="100%" height="100%">
  <LineChart data={monthlyData} margin={{ top: 10, right: 160, left: 16, bottom: 10 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.15)" />
    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
    <YAxis tickFormatter={formatYAxis} fontSize={12} tickLine={false} axisLine={false} label={{ value: `Total Sales (${businessInfo?.currency || 'NGN'})`, angle: -90, position: 'insideLeft' }}/>
    <Tooltip content={<CustomTooltip />} />
    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: 12 }} content={renderLegend} />
    {chartLocations
      .filter(loc => effectiveKeys.includes(loc.name))
      .map(loc => (
        <Line key={loc.name} type="monotone" dataKey={loc.name} stroke={loc.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} name={loc.name} />
      ))}
    {effectiveKeys.includes(totalSeries.name) && (
      <Line type="monotone" dataKey={totalSeries.name} stroke={totalSeries.color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} name={totalSeries.name} />
    )}
  </LineChart>
</ResponsiveContainer>
</div>
</CardContent>
</Card>
</div>

</div>
);
};

export default Overview;