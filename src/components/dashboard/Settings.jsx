import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Bell, Database, Printer, FileText, Briefcase, Percent, Tag, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import CategoryManagement from '@/components/dashboard/settings/CategoryManagement';
import SubCategoryManagement from '@/components/dashboard/settings/SubCategoryManagement';
import BrandManagement from '@/components/dashboard/settings/BrandManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const Settings = ({ theme, setTheme, user, setActiveTab }) => {
  const [printerType, setPrinterType] = React.useState('thermal');
  const [printerAddress, setPrinterAddress] = React.useState('');
  const [invoicePrefix, setInvoicePrefix] = React.useState('INV-');
  const [invoiceStartNumber, setInvoiceStartNumber] = React.useState(1);
  const [invoiceLayout, setInvoiceLayout] = React.useState('default');
  const [receiptFooterNote, setReceiptFooterNote] = React.useState('');
  const [invoiceFooterNote, setInvoiceFooterNote] = React.useState('');
  const [branches, setBranches] = React.useState([]);
  const [targetBranchId, setTargetBranchId] = React.useState('');
  const [overridePin, setOverridePin] = React.useState('');
  const [graceWindow, setGraceWindow] = React.useState(5);
  const [showPin, setShowPin] = React.useState(false);
  const [emailEnabled, setEmailEnabled] = React.useState(false);
  const [pushEnabled, setPushEnabled] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const defaultBranchId = user?.branchId || user?.branch?.id || '';
        setTargetBranchId(defaultBranchId);
        const bs = await api.branches.list();
        setBranches(bs || []);
        if (defaultBranchId) {
          const s = await api.hrm.overridePin.get({ branchId: defaultBranchId });
          if (typeof s?.graceSeconds === 'number') setGraceWindow(Number(s.graceSeconds));
          const cfg = await api.settings.get({ branchId: defaultBranchId });
          if (cfg) {
            if (cfg.printerType) setPrinterType(cfg.printerType);
            if (typeof cfg.printerAddress === 'string') setPrinterAddress(cfg.printerAddress);
            if (cfg.invoicePrefix) setInvoicePrefix(cfg.invoicePrefix);
            if (typeof cfg.invoiceStartNumber === 'number') setInvoiceStartNumber(cfg.invoiceStartNumber);
            if (cfg.invoiceLayout) setInvoiceLayout(cfg.invoiceLayout);
            if (typeof cfg.receiptFooterNote === 'string') setReceiptFooterNote(cfg.receiptFooterNote);
            if (typeof cfg.invoiceFooterNote === 'string') setInvoiceFooterNote(cfg.invoiceFooterNote);
          }
          // Load notification prefs
          try {
            const prefs = await api.userPrefs.getMany({ keys: ['notifications:email', 'notifications:push'], branchId: defaultBranchId });
            const emailVal = prefs.find(p => p.key === 'notifications:email')?.value;
            const pushVal = prefs.find(p => p.key === 'notifications:push')?.value;
            setEmailEnabled(Boolean(emailVal));
            setPushEnabled(Boolean(pushVal));
          } catch {}
        }
      } catch {}
    })();
  }, [user?.branchId]);

  const handleFeatureClick = () => {
    toast({
      title: "🚧 Feature in development!",
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const toggleEmailNotifications = async () => {
    try {
      const next = !emailEnabled;
      setEmailEnabled(next);
      await api.userPrefs.set({ key: 'notifications:email', value: next, branchId: targetBranchId || user?.branchId });
      toast({ title: 'Email notifications', description: next ? 'Enabled' : 'Disabled' });
    } catch (e) {
      setEmailEnabled(prev => !prev); // revert
      toast({ title: 'Failed to update', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const togglePushNotifications = async () => {
    try {
      const next = !pushEnabled;
      setPushEnabled(next);
      await api.userPrefs.set({ key: 'notifications:push', value: next, branchId: targetBranchId || user?.branchId });
      toast({ title: 'Push notifications', description: next ? 'Enabled' : 'Disabled' });
    } catch (e) {
      setPushEnabled(prev => !prev);
      toast({ title: 'Failed to update', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    try {
      const branchId = user?.branchId || user?.branch?.id;
      const { filename, blob } = await api.reports.exportOrders({ branchId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `orders_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'Export started', description: filename });
    } catch (e) {
      toast({ title: 'Export failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleClearLocalData = () => {
    try {
      const ok = typeof window !== 'undefined' ? window.confirm('This will clear all local data stored by this application on this browser. This action cannot be undone. Continue?') : false;
      if (!ok) return;
      try { if (typeof localStorage !== 'undefined') localStorage.clear(); } catch {}
      try { if (typeof sessionStorage !== 'undefined') sessionStorage.clear(); } catch {}
      try {
        if (typeof caches !== 'undefined' && caches?.keys) {
          caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
        }
      } catch {}
      toast({ title: 'Local data cleared', description: 'All local browser data has been removed. Reloading…' });
      try { setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 500); } catch {}
    } catch (e) {
      toast({ title: 'Failed to clear local data', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleSaveOverride = async () => {
    try {
      if (!targetBranchId) {
        toast({ title: 'Select a branch', description: 'Choose a branch to apply the PIN.', variant: 'destructive' });
        return;
      }
      await api.hrm.overridePin.set({ branchId: targetBranchId, pin: overridePin, graceSeconds: Number(graceWindow) || 5 });
      toast({ title: 'Override PIN saved', description: 'PIN and grace window updated for the selected branch.' });
      setOverridePin('');
    } catch (e) {
      toast({ title: 'Failed to save PIN', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setOverridePin(pin);
    toast({ title: 'Generated PIN', description: 'Click Save to apply to the selected branch.' });
  };

  const handleSaveSettings = async (settingName) => {
    try {
      if (!targetBranchId) { toast({ title: 'Select a branch', variant: 'destructive' }); return; }
      await api.settings.update({
        branchId: targetBranchId,
        printerType,
        printerAddress,
        invoicePrefix,
        invoiceStartNumber,
        invoiceLayout,
        receiptFooterNote,
        invoiceFooterNote,
      });
      try {
        const s = await api.settings.get({ branchId: targetBranchId });
        const info = {
          name: s?.businessName || '',
          logoUrl: s?.logoUrl || '',
          address: s?.address || '',
          phone: s?.phone || '',
          email: s?.email || '',
          currencySymbol: s?.currencySymbol || s?.currency || '₦',
          currency: s?.currency || '',
          receiptFooterNote: s?.receiptFooterNote || '',
          invoiceFooterNote: s?.invoiceFooterNote || '',
        };
        try { localStorage.setItem('businessInfo', JSON.stringify(info)); window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
      } catch {}
      toast({ title: `✅ ${settingName} Settings Saved`, description: 'Saved to server.' });
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage your application settings and preferences.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SettingCard
          title="Business Settings"
          description="Manage name, logo, currency, etc."
          icon={Briefcase}
          onClick={() => setActiveTab('business-settings')}
          delay={0.1}
        />
        <SettingCard
          title="Tax Settings"
          description="Manage tax rates for purchase & sell."
          icon={Percent}
          onClick={() => setActiveTab('tax-settings')}
          delay={0.15}
        />
        <SettingCard
          title="Discount Settings"
          description="Create and manage sales discounts."
          icon={Tag}
          onClick={() => setActiveTab('discount-settings')}
          delay={0.2}
        />
        <SettingCard
          title="Section Functions"
          description="Create, edit, or delete section functions."
          icon={Database}
          onClick={() => setActiveTab('settings-section-functions')}
          delay={0.25}
        />
        <SettingCard
          title="Product Types"
          description="Manage product types and allowed section functions."
          icon={FileText}
          onClick={() => setActiveTab('settings-product-types')}
          delay={0.3}
        />
        <SettingCard
          title="Service Types"
          description="Manage POS service types (Dine-in, Takeaway, Delivery)."
          icon={FileText}
          onClick={() => setActiveTab('settings-service-types')}
          delay={0.32}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <CategoryManagement user={user} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
      >
        <SubCategoryManagement user={user} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <BrandManagement user={user} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'dark' ? <Moon /> : <Sun />}
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/20 dark:bg-slate-800/20">
              <Label htmlFor="theme-switch" className="font-semibold text-gray-700 dark:text-gray-300">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Label>
              <div className="flex items-center space-x-2">
                <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <Switch
                  id="theme-switch"
                  checked={theme === 'dark'}
                  onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                />
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Override PIN management moved here */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound />Override / Void PIN</CardTitle>
            <CardDescription>Manage branch-level override PIN used for destructive actions in POS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label>Branch</Label>
                <Select value={targetBranchId} onValueChange={setTargetBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {(branches || []).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>New PIN</Label>
                <div className="relative">
                  <Input type={showPin ? 'text' : 'password'} value={overridePin} onChange={(e) => setOverridePin(e.target.value)} placeholder="4-digit PIN" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPin(p => !p)}>
                    {showPin ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Grace (seconds)</Label>
                <Input type="number" min="0" value={graceWindow} onChange={(e) => setGraceWindow(parseInt(e.target.value || '0', 10))} />
              </div>
              <div className="flex items-end gap-2 md:col-span-1">
                <Button type="button" onClick={generateRandomPin}>Generate</Button>
                <Button type="button" onClick={handleSaveOverride}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Printer />Receipt Printer Settings</CardTitle>
            <CardDescription>Configure your receipt printer for the POS.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="printer-type">Printer Type</Label>
              <Select value={printerType} onValueChange={setPrinterType}>
                <SelectTrigger id="printer-type">
                  <SelectValue placeholder="Select printer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thermal">Thermal Printer (80mm)</SelectItem>
                  <SelectItem value="standard">Standard A4 Printer</SelectItem>
                  <SelectItem value="network">Network Printer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="printer-address">Printer Name / IP Address</Label>
              <Input id="printer-address" value={printerAddress} onChange={(e) => setPrinterAddress(e.target.value)} placeholder="e.g., EPSON_TM-T20II or 192.168.1.100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer-note">Receipt Footer Note</Label>
              <Input id="receipt-footer-note" value={receiptFooterNote} onChange={(e) => setReceiptFooterNote(e.target.value)} placeholder="e.g., Thank you for your patronage" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleFeatureClick}>Test Print</Button>
              <Button onClick={() => handleSaveSettings('Printer')}>Save Printer Settings</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText />Invoice Settings</CardTitle>
            <CardDescription>Customize your invoice schemes and layouts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Invoice Scheme</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
                  <Input id="invoice-prefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} placeholder="e.g., INV-" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-start">Start Number</Label>
                  <Input id="invoice-start" type="number" value={invoiceStartNumber} onChange={(e) => setInvoiceStartNumber(parseInt(e.target.value, 10))} placeholder="e.g., 1" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Invoice Layout</h4>
              <div className="space-y-2">
                <Label htmlFor="invoice-layout">Layout Template</Label>
                <Select value={invoiceLayout} onValueChange={setInvoiceLayout}>
                  <SelectTrigger id="invoice-layout">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Layout</SelectItem>
                    <SelectItem value="compact">Compact Layout</SelectItem>
                    <SelectItem value="detailed">Detailed Layout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Invoice Footer</h4>
              <div className="space-y-2">
                <Label htmlFor="invoice-footer-note">Invoice Footer Note</Label>
                <Input id="invoice-footer-note" value={invoiceFooterNote} onChange={(e) => setInvoiceFooterNote(e.target.value)} placeholder="e.g., Goods sold are not returnable" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => handleSaveSettings('Invoice')}>Save Invoice Settings</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell />Notifications</CardTitle>
            <CardDescription>Manage how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/20 dark:bg-slate-800/20">
              <Label htmlFor="email-notifications" className="text-gray-700 dark:text-gray-300">Email Notifications</Label>
              <Switch id="email-notifications" checked={emailEnabled} onCheckedChange={toggleEmailNotifications} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/20 dark:bg-slate-800/20">
              <Label htmlFor="push-notifications" className="text-gray-700 dark:text-gray-300">Push Notifications</Label>
              <Switch id="push-notifications" checked={pushEnabled} onCheckedChange={togglePushNotifications} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database />Data Management</CardTitle>
            <CardDescription>Manage your application data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/20 dark:bg-slate-800/20">
              <div className="flex flex-col">
                <Label className="font-semibold text-gray-700 dark:text-gray-300">Export Data</Label>
                <span className="text-sm text-gray-600 dark:text-gray-400">Export your data to a CSV file.</span>
              </div>
              <Button variant="outline" onClick={handleExport}>Export</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/20 dark:bg-slate-800/20">
              <div className="flex flex-col">
                <Label className="font-semibold text-red-700 dark:text-red-500">Clear Local Data</Label>
                <span className="text-sm text-gray-600 dark:text-gray-400">This will clear all local storage data. This action cannot be undone.</span>
              </div>
              <Button variant="destructive" onClick={handleClearLocalData}>Clear Data</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

const SettingCard = ({ title, description, icon: Icon, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50 cursor-pointer hover:shadow-lg transition-shadow h-full" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  </motion.div>
);

export default Settings;