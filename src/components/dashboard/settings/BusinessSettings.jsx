
import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Briefcase, Calendar, Percent, Globe, Clock, Hash, Edit, Code, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
// import { api } from '@/lib/api';

const timezones = [
  "Africa/Lagos", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"
];
const currencies = [
  "NGN - Nigeria Naira", "USD - US Dollar", "EUR - Euro", "GBP - British Pound"
];
const months = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const BusinessSettings = ({ onBack, user }) => {
  const [settings, setSettings] = useState({
    businessName: '',
    startDate: '',
    profitPercent: 0,
    currency: '',
    currencySymbolPlacement: 'before',
    timezone: '',
    logo: null,
    financialYearStart: 'January',
    stockAccountingMethod: 'FIFO',
    transactionEditDays: 30,
    dateFormat: 'mm/dd/yyyy',
    timeFormat: '24',
    currencyPrecision: 2,
    quantityPrecision: 2,
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);
  // moved Override PIN to Settings page

  useEffect(() => {
    (async () => {
      try {
        const branchId = user?.branchId;
        if (!branchId) return;
        const data = await api.settings.get({ branchId });
        if (data) {
          setSettings(prev => ({ ...prev, ...data, logo: data.logoUrl || '' }));
          if (data.logoUrl) setLogoPreview(data.logoUrl);
        }
      } catch {
        // keep defaults if backend unavailable
      }
    })();
  }, [user?.branchId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        // Keep preview only; actual upload happens on submit
        setLogoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const branchId = user?.branchId;
      if (!branchId) { toast({ title: 'Missing branch', description: 'No active branch to save settings to.', variant: 'destructive' }); return; }
      let logoUrl = settings.logo || '';
      if (logoFile) {
        try {
          const uploaded = await api.settings.uploadLogo(logoFile);
          logoUrl = uploaded?.url || logoUrl;
        } catch (errUp) {
          toast({ title: 'Logo upload failed', description: String(errUp?.message || errUp), variant: 'destructive' });
        }
      }
      await api.settings.update({
        branchId,
        businessName: settings.businessName,
        currency: settings.currency,
        logoUrl,
      });
      // persist to localStorage for immediate UI update
      try {
        const s = await api.settings.get({ branchId });
        const info = {
          name: s?.businessName || settings.businessName,
          logoUrl: s?.logoUrl || logoUrl || '',
          address: s?.address || '',
          phone: s?.phone || '',
          email: s?.email || '',
          currencySymbol: s?.currencySymbol || s?.currency || '₦',
          currency: s?.currency || settings.currency || 'NGN',
          theme: s?.theme || undefined,
        };
        localStorage.setItem('businessInfo', JSON.stringify(info));
        try { window.dispatchEvent(new Event('businessInfoUpdated')); } catch {}
      } catch {}
      toast({ title: '✅ Settings Updated', description: 'Your business settings have been successfully saved.' });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  // override pin handlers moved

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold gradient-text">Business Settings</h2>
          <p className="text-muted-foreground">Manage your core business configuration.</p>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Column 1 */}
              <div className="space-y-6">
                <InputField id="businessName" name="businessName" label="Business Name" value={settings.businessName} onChange={handleInputChange} icon={Briefcase} required />
                <SelectField id="currency" name="currency" label="Currency" value={settings.currency} onValueChange={(val) => handleSelectChange('currency', val)} options={currencies} icon={Globe} />
                <div className="space-y-2">
                  <Label htmlFor="logo">Upload Logo</Label>
                  <div className="flex items-center gap-4">
                    <Input id="logo-display" className="flex-grow" readOnly value={settings.logo ? 'Logo uploaded' : 'No logo selected'} />
                    <Button type="button" onClick={() => fileInputRef.current.click()}>Browse</Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  </div>
                  {logoPreview && <img src={logoPreview} alt="Logo preview" className="mt-2 h-16 w-auto object-contain border p-1 rounded-md" />}
                  <p className="text-xs text-muted-foreground">Previous logo (if exists) will be replaced.</p>
                </div>
                <InputField id="transactionEditDays" name="transactionEditDays" label="Transaction Edit Days" type="number" value={settings.transactionEditDays} onChange={handleInputChange} icon={Edit} required />
                <SelectField id="currencyPrecision" name="currencyPrecision" label="Currency Precision" value={settings.currencyPrecision} onValueChange={(val) => handleSelectChange('currencyPrecision', val)} options={[0,1,2,3,4]} icon={Hash} />
              </div>
              
              {/* Column 2 */}
              <div className="space-y-6">
                 <InputField id="startDate" name="startDate" label="Start Date" type="date" value={settings.startDate} onChange={handleInputChange} icon={Calendar} required />
                 <SelectField id="currencySymbolPlacement" name="currencySymbolPlacement" label="Currency Symbol Placement" value={settings.currencySymbolPlacement} onValueChange={(val) => handleSelectChange('currencySymbolPlacement', val)} options={[{value: 'before', label: 'Before amount'}, {value: 'after', label: 'After amount'}]} icon={Code} />
                 <SelectField id="financialYearStart" name="financialYearStart" label="Financial Year Start Month" value={settings.financialYearStart} onValueChange={(val) => handleSelectChange('financialYearStart', val)} options={months} icon={Calendar} />
                 <SelectField id="dateFormat" name="dateFormat" label="Date Format" value={settings.dateFormat} onValueChange={(val) => handleSelectChange('dateFormat', val)} options={['mm/dd/yyyy', 'dd/mm/yyyy', 'yyyy/mm/dd']} icon={Calendar} required />
                 <SelectField id="quantityPrecision" name="quantityPrecision" label="Quantity Precision" value={settings.quantityPrecision} onValueChange={(val) => handleSelectChange('quantityPrecision', val)} options={[0,1,2,3,4]} icon={Hash} />
              </div>

              {/* Column 3 */}
              <div className="space-y-6">
                <InputField id="profitPercent" name="profitPercent" label="Default Profit Percent" type="number" step="0.01" value={settings.profitPercent} onChange={handleInputChange} icon={Percent} required />
                <SelectField id="timezone" name="timezone" label="Time Zone" value={settings.timezone} onValueChange={(val) => handleSelectChange('timezone', val)} options={timezones} icon={Clock} />
                <SelectField id="stockAccountingMethod" name="stockAccountingMethod" label="Stock Accounting Method" value={settings.stockAccountingMethod} onValueChange={(val) => handleSelectChange('stockAccountingMethod', val)} options={['FIFO', 'LIFO']} icon={Hash} required />
                <SelectField id="timeFormat" name="timeFormat" label="Time Format" value={settings.timeFormat} onValueChange={(val) => handleSelectChange('timeFormat', val)} options={[{value: '12', label: '12 Hour'}, {value: '24', label: '24 Hour'}]} icon={Clock} required />
              </div>
            </div>
            <div className="flex justify-end pt-8">
              <Button type="submit" size="lg" className="bg-pink-600 hover:bg-pink-700 text-white">Update Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Override PIN controls moved to main Settings page */}
    </motion.div>
  );
};

const InputField = ({ id, name, label, value, onChange, type = "text", icon: Icon, required, ...props }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && <span className="text-destructive">*</span>}
    </Label>
    <div className="relative flex items-center">
      {Icon && <Icon className="absolute left-3 h-4 w-4 text-muted-foreground" />}
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="pl-10"
        {...props}
      />
    </div>
  </div>
);

const SelectField = ({ id, name, label, value, onValueChange, options, icon: Icon, required }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>
      {label}
      {required && <span className="text-destructive">*</span>}
    </Label>
    <div className="relative flex items-center">
       {Icon && <Icon className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />}
      <Select id={id} name={name} value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger className="w-full pl-10">
          <SelectValue placeholder={`Select ${label}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option, index) => (
            <SelectItem key={index} value={typeof option === 'object' ? option.value : option}>
              {typeof option === 'object' ? option.label : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);


export default BusinessSettings;
