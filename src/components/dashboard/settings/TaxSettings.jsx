import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';

const TaxSettings = ({ onBack }) => {
  const [taxSettings, setTaxSettings] = useState({
    tax1Name: '',
    tax1Number: '',
    tax2Name: '',
    tax2Number: '',
    enableInlineTax: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await api.taxes?.get?.();
        if (data) setTaxSettings(prev => ({ ...prev, ...data }));
      } catch {}
    })();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaxSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked) => {
    setTaxSettings(prev => ({ ...prev, enableInlineTax: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.taxes?.update?.(taxSettings);
      toast({ title: '✅ Settings Updated', description: 'Your tax settings have been successfully saved.' });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold gradient-text">Tax Settings</h2>
          <p className="text-muted-foreground">Manage your tax rates and configurations.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Sales and Purchase Tax</CardTitle>
          <CardDescription>These taxes will be used in invoices.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InputField id="tax1Name" name="tax1Name" label="Tax 1 Name:" value={taxSettings.tax1Name} onChange={handleInputChange} placeholder="e.g., VAT, GST" />
              <InputField id="tax1Number" name="tax1Number" label="Tax 1 Rate (%):" value={taxSettings.tax1Number} onChange={handleInputChange} placeholder="e.g., 10" type="number" />
              <InputField id="tax2Name" name="tax2Name" label="Tax 2 Name:" value={taxSettings.tax2Name} onChange={handleInputChange} placeholder="e.g., Service Charge" />
              <InputField id="tax2Number" name="tax2Number" label="Tax 2 Rate (%):" value={taxSettings.tax2Number} onChange={handleInputChange} placeholder="e.g., 5" type="number" />
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Checkbox id="enableInlineTax" checked={taxSettings.enableInlineTax} onCheckedChange={handleCheckboxChange} />
              <label htmlFor="enableInlineTax" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable inline tax in purchase and sell
              </label>
              <Info className="h-4 w-4 text-muted-foreground ml-2" title="If enabled, you can select different tax rates for each product during a sale or purchase." />
            </div>
            
            <div className="flex justify-center pt-8">
              <Button type="submit" size="lg" className="bg-pink-600 hover:bg-pink-700 text-white">Update Settings</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const InputField = ({ id, name, label, value, onChange, placeholder, type = "text" }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative flex items-center">
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  </div>
);

export default TaxSettings;
