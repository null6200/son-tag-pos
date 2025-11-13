import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Building, Calendar, Globe, Phone, MapPin, User, Mail, Lock, Briefcase, FileText, Landmark, Clock, Hash } from 'lucide-react';

const timezones = ["Africa/Lagos", "America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney"];
const currencies = ["NGN", "USD", "EUR", "GBP"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const RegisterPage = ({ onRegister, onNavigateToLogin, onRegistered }) => {
  const [step, setStep] = useState(1);
  const [businessData, setBusinessData] = useState({
    businessName: '', startDate: '', currency: '', logo: null, website: '',
    businessContact: '', alternateContact: '', country: '', state: '',
    city: '', zipCode: '', landmark: '', timezone: '',
  });
  const [settingsData, setSettingsData] = useState({
    tax1Name: '', tax1No: '', tax2Name: '', tax2No: '',
    financialYearStart: 'January', stockAccountingMethod: 'FIFO',
  });
  const [ownerData, setOwnerData] = useState({
    prefix: '', firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '',
  });

  const fileInputRef = useRef(null);

  const validateStep1 = () => {
    const requiredFields = ['businessName', 'currency', 'country', 'state', 'city'];
    for (const field of requiredFields) {
      if (!businessData[field]) {
        toast({ title: "Validation Error", description: `Please fill in the '${field}' field.`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    const requiredFields = ['financialYearStart', 'stockAccountingMethod'];
    for (const field of requiredFields) {
      if (!settingsData[field]) {
        toast({ title: "Validation Error", description: `Please fill in the '${field}' field.`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    const requiredFields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];
    for (const field of requiredFields) {
        if (!ownerData[field]) {
            toast({ title: "Validation Error", description: `Please fill in a required owner field.`, variant: "destructive" });
            return false;
        }
    }
    if (ownerData.password !== ownerData.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => prev + 1);
  };
  
  const handlePrev = () => setStep(prev => prev - 1);

  const handleBusinessChange = (e) => setBusinessData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleBusinessSelect = (name, value) => setBusinessData(prev => ({ ...prev, [name]: value }));
  const handleSettingsChange = (e) => setSettingsData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSettingsSelect = (name, value) => setSettingsData(prev => ({ ...prev, [name]: value }));
  const handleOwnerChange = (e) => setOwnerData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessData(prev => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep3()) return;
    toast({ title: "Registration Successful!", description: "Your business is being set up." });
    try {
      await Promise.resolve(onRegister && onRegister(businessData, ownerData));
    } finally {
      if (onRegistered) onRegistered();
    }
  };
  
  const steps = [
    { id: 1, name: 'Business' },
    { id: 2, name: 'Business Settings' },
    { id: 3, name: 'Owner' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-right mb-4">
          <p>Already registered? <span onClick={onNavigateToLogin} className="font-semibold text-blue-400 hover:underline cursor-pointer">Sign In</span></p>
        </div>

        <h2 className="text-2xl font-bold mb-4">Register and Get Started in minutes</h2>
        <div className="flex justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.id} className={`flex-1 text-center p-4 rounded-md ${step >= s.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
              <span className="font-bold">{index + 1}. {s.name}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-gray-800 p-8 rounded-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && <BusinessDetailsForm data={businessData} onChange={handleBusinessChange} onSelect={handleBusinessSelect} onFileChange={handleFileChange} fileInputRef={fileInputRef} />}
                {step === 2 && <BusinessSettingsForm data={settingsData} onChange={handleSettingsChange} onSelect={handleSettingsSelect} />}
                {step === 3 && <OwnerForm data={ownerData} onChange={handleOwnerChange} />}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <Button type="button" onClick={handlePrev} variant="outline">Previous</Button>
              ) : <div />}
              
              {step < 3 ? (
                <Button type="button" onClick={handleNext}>Next</Button>
              ) : (
                <Button type="submit">Register</Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormField = ({ id, label, value, onChange, icon: Icon, required, type = "text", ...props }) => (
    <div className="space-y-2">
        <Label htmlFor={id} className="text-gray-300">{label}{required && <span className="text-red-500">*</span>}</Label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />}
            <Input id={id} name={id} value={value} onChange={onChange} required={required} type={type} className="bg-gray-700 border-gray-600 text-white pl-10" {...props} />
        </div>
    </div>
);

const SelectFormField = ({ id, label, value, onValueChange, options, icon: Icon, required, placeholder }) => (
    <div className="space-y-2">
        <Label htmlFor={id} className="text-gray-300">{label}{required && <span className="text-red-500">*</span>}</Label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />}
            <Select name={id} value={value} onValueChange={(val) => onValueChange(id, val)} required={required}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white pl-10 w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                    {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    </div>
);


const BusinessDetailsForm = ({ data, onChange, onSelect, onFileChange, fileInputRef }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField id="businessName" label="Business Name" value={data.businessName} onChange={onChange} icon={Building} required />
        <FormField id="startDate" label="Start Date" value={data.startDate} onChange={onChange} type="date" icon={Calendar} />
        <SelectFormField id="currency" label="Currency" value={data.currency} onValueChange={onSelect} options={currencies} icon={Globe} placeholder="Select Currency" required/>
        <div className="space-y-2">
            <Label htmlFor="logo">Upload Logo</Label>
            <div className="flex items-center gap-2">
                <Input readOnly value={data.logo ? "Logo selected" : "No file chosen"} className="bg-gray-700 border-gray-600"/>
                <Button type="button" onClick={() => fileInputRef.current.click()}>Browse</Button>
                <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
            </div>
        </div>
        <FormField id="website" label="Website" value={data.website} onChange={onChange} icon={Globe} />
        <FormField id="businessContact" label="Business contact number" value={data.businessContact} onChange={onChange} icon={Phone} />
        <FormField id="alternateContact" label="Alternate contact number" value={data.alternateContact} onChange={onChange} icon={Phone} />
        <FormField id="country" label="Country" value={data.country} onChange={onChange} icon={MapPin} required />
        <FormField id="state" label="State" value={data.state} onChange={onChange} icon={MapPin} required />
        <FormField id="city" label="City" value={data.city} onChange={onChange} icon={MapPin} required />
        <FormField id="zipCode" label="Zip Code" value={data.zipCode} onChange={onChange} icon={MapPin} />
        <FormField id="landmark" label="Landmark" value={data.landmark} onChange={onChange} icon={Landmark} />
        <SelectFormField id="timezone" label="Time zone" value={data.timezone} onValueChange={onSelect} options={timezones} icon={Clock} placeholder="Select Timezone" />
    </div>
);

const BusinessSettingsForm = ({ data, onChange, onSelect }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
        <FormField id="tax1Name" label="Tax 1 Name:" value={data.tax1Name} onChange={onChange} placeholder="GST / VAT / Other" icon={FileText} />
        <FormField id="tax1No" label="Tax 1 No.:" value={data.tax1No} onChange={onChange} icon={Hash} />
        <FormField id="tax2Name" label="Tax 2 Name:" value={data.tax2Name} onChange={onChange} placeholder="GST / VAT / Other" icon={FileText} />
        <FormField id="tax2No" label="Tax 2 No.:" value={data.tax2No} onChange={onChange} icon={Hash} />
        <SelectFormField id="financialYearStart" label="Financial year start month:" value={data.financialYearStart} onValueChange={onSelect} options={months} icon={Calendar} required />
        <SelectFormField id="stockAccountingMethod" label="Stock Accounting Method:" value={data.stockAccountingMethod} onValueChange={onSelect} options={["FIFO", "LIFO"]} icon={Briefcase} required />
    </div>
);

const OwnerForm = ({ data, onChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
        <div className="md:col-span-2 grid grid-cols-3 gap-6">
            <FormField id="prefix" label="Prefix:" value={data.prefix} onChange={onChange} placeholder="Mr / Mrs / Miss" icon={User} />
            <FormField id="firstName" label="First Name:" value={data.firstName} onChange={onChange} icon={User} required />
            <FormField id="lastName" label="Last Name:" value={data.lastName} onChange={onChange} icon={User} required />
        </div>
        <FormField id="username" label="Username:" value={data.username} onChange={onChange} icon={User} required />
        <FormField id="email" label="Email:" value={data.email} onChange={onChange} type="email" icon={Mail} required />
        <FormField id="password" label="Password:" value={data.password} onChange={onChange} type="password" icon={Lock} required />
        <FormField id="confirmPassword" label="Confirm Password:" value={data.confirmPassword} onChange={onChange} type="password" icon={Lock} required />
    </div>
);

export default RegisterPage;