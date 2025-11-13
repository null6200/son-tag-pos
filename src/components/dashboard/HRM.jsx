import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCog, Wallet, Calendar, FileText, KeyRound, Eye, EyeOff, UserPlus, Briefcase, Star, X, Check, Plus, Trash2, ArrowLeft, Clock, PhoneOff, CalendarPlus, CalendarClock, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';

const HRM = ({ user }) => {
    const [activeModule, setActiveModule] = useState(null);
    const [overridePin, setOverridePin] = useState('');
    const [graceWindow, setGraceWindow] = useState(5);
    const [showPin, setShowPin] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);

    useEffect(() => {
      const savedSettings = JSON.parse(localStorage.getItem('loungeSettings'));
      if (savedSettings) {
        setOverridePin(savedSettings.overridePin || '');
        setGraceWindow(savedSettings.graceWindow || 5);
      }

      const allRoles = JSON.parse(localStorage.getItem('loungeRoles') || '[]');
      const currentUserRole = allRoles.find(r => r.name === user.role);
      if (currentUserRole) {
        setUserPermissions(currentUserRole.permissions);
      }

      // Load override PIN status from backend for this branch
      (async () => {
        try {
          const branchId = user?.branchId || user?.branch?.id;
          if (!branchId) return;
          const s = await api.hrm.overridePin.get({ branchId });
          if (s && typeof s.graceSeconds === 'number') setGraceWindow(Number(s.graceSeconds));
        } catch {}
      })();
    }, [user.role, user?.branchId]);

    const handleSavePinSettings = async () => {
      const settingsToSave = JSON.parse(localStorage.getItem('loungeSettings')) || {};
      const updatedSettings = { ...settingsToSave, overridePin, graceWindow };
      localStorage.setItem('loungeSettings', JSON.stringify(updatedSettings));
      try {
        const branchId = user?.branchId || user?.branch?.id;
        if (branchId) await api.hrm.overridePin.set({ branchId, pin: overridePin, graceSeconds: Number(graceWindow) || 5 });
        toast({ title: `✅ Override PIN Settings Saved`, description: "Saved to server." });
      } catch (e) {
        toast({ title: 'Failed to save PIN', description: String(e?.message || e), variant: 'destructive' });
      }
    };

    const generateRandomPin = () => {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      setOverridePin(pin);
      toast({ title: "New PIN Generated", description: "Click Save to apply." });
    };

    const hrmModules = [
        { id: 'employees', title: 'Employees', icon: UserPlus, description: 'Manage employee profiles and override PINs.' },
        { id: 'shift', title: 'Shift Management', icon: Clock, description: 'Assign and manage staff shifts.' },
        { id: 'payroll', title: 'Payroll', icon: Wallet, description: 'Manage salaries, deductions, and pay slips.' },
        { id: 'leave', title: 'Leave Management', icon: Calendar, description: 'Track employee leave requests and balances.' },
        { id: 'recruitment', title: 'Recruitment', icon: UserCog, description: 'Manage job openings and candidate applications.' },
        { id: 'performance', title: 'Performance', icon: FileText, description: 'Conduct employee performance reviews.' },
    ];
    
    const canManagePin = userPermissions.includes('manage_override_pin') || userPermissions.includes('all');

    const renderContent = () => {
        if (activeModule) {
            return <ModuleView module={activeModule} onBack={() => setActiveModule(null)} />;
        }

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold gradient-text mb-2">Human Resource Management</h2>
                    <p className="text-gray-600 dark:text-gray-400">Oversee all aspects of your workforce</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hrmModules.map((module, index) => {
                    const Icon = module.icon;
                    return (
                        <motion.div
                        key={module.title}
                        whileHover={{ scale: 1.03, y: -5 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        >
                        <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50 h-full flex flex-col">
                            <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                                <Icon className="w-6 h-6 text-white" />
                                </div>
                                <CardTitle>{module.title}</CardTitle>
                            </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{module.description}</p>
                            <Button
                                variant="outline"
                                onClick={() => setActiveModule(module)}
                            >
                                Manage {module.title}
                            </Button>
                            </CardContent>
                        </Card>
                        </motion.div>
                    );
                    })}
                </div>
                
                {canManagePin && (
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.25 }}
                    >
                    <Card className="glass-effect border-2 border-white/30 dark:border-slate-700/50">
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound />Override/Void PIN</CardTitle>
                        <CardDescription>Manage the master PIN for authorizing sensitive actions like voiding items.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="override-pin-hrm">Master PIN</Label>
                            <div className="relative">
                                <Input id="override-pin-hrm" type={showPin ? 'text' : 'password'} value={overridePin} onChange={(e) => setOverridePin(e.target.value)} placeholder="4-digit PIN" />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPin(!showPin)}>
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="grace-window-hrm">Grace Window (seconds)</Label>
                            <Input id="grace-window-hrm" type="number" value={graceWindow} onChange={(e) => setGraceWindow(parseInt(e.target.value, 10))} placeholder="e.g., 5" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={generateRandomPin}>Generate Random PIN</Button>
                            <Button onClick={handleSavePinSettings}>Save PIN Settings</Button>
                        </div>
                        </CardContent>
                    </Card>
                    </motion.div>
                )}
            </div>
        );
    }

    return <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>;
};

const ModuleView = ({ module, onBack }) => {
    const renderModuleContent = () => {
        switch (module.id) {
            case 'employees': return <EmployeesManagement />;
            case 'shift': return <ShiftManagement />;
            case 'payroll': return <PayrollManagement />;
            case 'leave': return <LeaveManagement />;
            case 'recruitment': return <RecruitmentManagement />;
            case 'performance': return <PerformanceManagement />;
            default: return <p>Module not found.</p>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold gradient-text">{module.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400">{module.description}</p>
                </div>
            </div>
            {renderModuleContent()}
        </motion.div>
    );
};

// Employees management (profiles + PIN) — backend-powered
const EmployeesManagement = () => {
  const [profiles, setProfiles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', jobTitle: '', hourlyRate: '' });
  const [pinInput, setPinInput] = useState({});

  const load = async () => {
    const s = (() => {
      try { return JSON.parse(localStorage.getItem('loungeUser') || 'null'); } catch { return null; }
    })();
    const branchId = s?.branchId || s?.branch?.id || '';
    if (!branchId) return;
    try {
      setLoading(true);
      const [plist, ulist] = await Promise.all([
        api.hrm.employees.list({ branchId }),
        api.users.list({ branchId }),
      ]);
      setProfiles(plist || []);
      setAllUsers(ulist || []);
    } catch (e) {
      toast({ title: 'Failed to load employees', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (isAssignOpen) load(); }, [isAssignOpen]);

  const createProfile = async () => {
    if (!form.userId) {
      toast({ title: 'Select a user', variant: 'destructive' });
      return;
    }
    try {
      await api.hrm.employees.create({
        userId: form.userId,
        branchId,
        jobTitle: form.jobTitle || undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      });
      setIsCreateOpen(false);
      setForm({ userId: '', jobTitle: '', hourlyRate: '' });
      await load();
      toast({ title: 'Employee profile created' });
    } catch (e) {
      toast({ title: 'Create failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const setPin = async (id, pin) => {
    try {
      await api.hrm.employees.setPin(id, pin || '');
      setPinInput(prev => ({ ...prev, [id]: '' }));
      toast({ title: pin ? 'PIN set' : 'PIN cleared' });
    } catch (e) {
      toast({ title: 'PIN update failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Employees</h3>
          <p className="text-sm text-gray-500">Manage employee profiles</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2"/>New Profile</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Employee Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={form.userId} onValueChange={(v) => setForm(prev => ({ ...prev, userId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.username} ({u.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input value={form.jobTitle} onChange={e => setForm(prev => ({ ...prev, jobTitle: e.target.value }))} placeholder="e.g., Barista" />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input type="number" value={form.hourlyRate} onChange={e => setForm(prev => ({ ...prev, hourlyRate: e.target.value }))} placeholder="e.g., 8.5" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={createProfile}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${profiles.length} profiles`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Hourly</TableHead>
                <TableHead>Override PIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles || []).map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-semibold">{p.user?.username}</div>
                    <div className="text-xs text-gray-500">{p.user?.email}</div>
                  </TableCell>
                  <TableCell>{p.jobTitle || '—'}</TableCell>
                  <TableCell>{p.hourlyRate ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input className="w-[120px]" type="password" placeholder="Set PIN" value={pinInput[p.id] || ''} onChange={e => setPinInput(prev => ({ ...prev, [p.id]: e.target.value }))} />
                      <Button size="sm" onClick={() => setPin(p.id, pinInput[p.id])}>Set</Button>
                      <Button size="sm" variant="outline" onClick={() => setPin(p.id, '')}>Clear</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const ShiftManagement = () => {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', start: '', end: '', note: '' });

  const load = async () => {
    const s = (() => { try { return JSON.parse(localStorage.getItem('loungeUser') || 'null'); } catch { return null; } })();
    const branchId = s?.branchId || s?.branch?.id || '';
    if (!branchId) return;
    try {
      setLoading(true);
      const [u, a] = await Promise.all([
        api.users.list({ branchId, includeArchived: false }),
        api.hrm.shifts.list({ branchId }),
      ]);
      setUsers(u || []);
      setAssignments(a || []);
    } catch (e) {
      try {
        const fallback = JSON.parse(localStorage.getItem('loungeUsers') || '[]');
        setUsers(fallback);
      } catch {}
      toast({ title: 'Failed to load shifts', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (isAssignOpen) load(); }, [isAssignOpen]);

  const assign = async () => {
    if (!form.userId || !form.start) {
      toast({ title: 'User and start time required', variant: 'destructive' });
      return;
    }
    try {
      await api.hrm.shifts.assign({
        userId: form.userId,
        branchId: (() => { try { const s = JSON.parse(localStorage.getItem('loungeUser') || 'null'); return s?.branchId || s?.branch?.id || ''; } catch { return ''; } })(),
        start: form.start,
        end: form.end || undefined,
        note: form.note || undefined,
      });
      setIsAssignOpen(false);
      setForm({ userId: '', start: '', end: '', note: '' });
      await load();
      toast({ title: 'Shift assigned' });
    } catch (e) {
      toast({ title: 'Assign failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const update = async (id, patch) => {
    try {
      await api.hrm.shifts.update(id, patch);
      await load();
      toast({ title: 'Shift updated' });
    } catch (e) {
      toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const remove = async (id) => {
    try {
      await api.hrm.shifts.remove(id);
      await load();
      toast({ title: 'Shift removed' });
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Shift Assignments</CardTitle>
            <CardDescription>Assign and manage staff shifts.</CardDescription>
          </div>
          <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogTrigger asChild>
              <Button>Assign Shift</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Shift</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Staff</Label>
                  <Select value={String(form.userId || '')} onValueChange={(v) => setForm(prev => ({ ...prev, userId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input type="datetime-local" value={form.start} onChange={e => setForm(prev => ({ ...prev, start: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input type="datetime-local" value={form.end} onChange={e => setForm(prev => ({ ...prev, end: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Input value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                <Button onClick={assign}>Assign</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming</CardTitle>
          <CardDescription>{loading ? 'Loading…' : `${assignments.length} items`}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignments || []).map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.user?.username}</TableCell>
                  <TableCell>{new Date(a.start).toLocaleString()}</TableCell>
                  <TableCell>{a.end ? new Date(a.end).toLocaleString() : '—'}</TableCell>
                  <TableCell>{a.note || '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => update(a.id, { status: 'COMPLETED' })}>Complete</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

const PayrollManagement = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);

    const getBranchId = () => {
        try { const s = JSON.parse(localStorage.getItem('loungeUser') || 'null'); return s?.branchId || s?.branch?.id || ''; } catch { return ''; }
    };

    const load = async () => {
        const branchId = getBranchId();
        if (!branchId) { setStaff([]); return; }
        try {
            setLoading(true);
            const [users, payroll] = await Promise.all([
                api.users.list({ branchId }),
                api.hrm.payroll.list({ branchId }),
            ]);
            const entries = Array.isArray(payroll?.items) ? payroll.items : (Array.isArray(payroll) ? payroll : []);
            const merged = (users || []).map(u => ({
                ...u,
                salary: (entries.find(p => String(p.userId) === String(u.id))?.salary) ?? ''
            }));
            setStaff(merged);
        } catch (e) {
            setStaff([]);
            toast({ title: 'Failed to load payroll', description: String(e?.message || e), variant: 'destructive' });
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSalaryChange = (staffId, newSalary) => {
        setStaff(prev => prev.map(s => s.id === staffId ? { ...s, salary: newSalary } : s));
    };

    const handleSaveSalaries = async () => {
        try {
            const branchId = getBranchId();
            await Promise.all(
                staff
                  .filter(s => s.salary !== undefined && s.salary !== null && s.salary !== '')
                  .map(s => api.hrm.payroll.set({ branchId, userId: s.id, salary: Number(s.salary) || 0 }))
            );
            toast({ title: "Salaries Saved", description: "Staff salary information has been updated on the server." });
        } catch (e) {
            toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
        } finally {
            await load();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Payroll</CardTitle>
                <CardDescription>{loading ? 'Loading…' : 'Set basic monthly salaries for your staff.'}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Salary ($)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staff.map(s => (
                            <TableRow key={s.id}>
                                <TableCell>{s.username}</TableCell>
                                <TableCell>{s.role}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={s.salary || ''} 
                                        onChange={(e) => handleSalaryChange(s.id, e.target.value)}
                                        className="w-[150px]"
                                        placeholder="Enter salary"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <DialogFooter className="p-6 pt-0">
                <Button onClick={handleSaveSalaries}>Save Salaries</Button>
            </DialogFooter>
        </Card>
    );
};

const LeaveManagement = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [staff, setStaff] = useState([]);
    const [isScheduleLeaveOpen, setIsScheduleLeaveOpen] = useState(false);
    const [isExtendLeaveOpen, setIsExtendLeaveOpen] = useState(false);
    const [leaveToExtend, setLeaveToExtend] = useState(null);
    const [newLeave, setNewLeave] = useState({ staffId: '', startDate: '', endDate: '', reason: '' });
    const [newEndDate, setNewEndDate] = useState('');

    const getBranchId = () => {
        try {
            const s = JSON.parse(localStorage.getItem('loungeUser') || 'null');
            return s?.branchId || s?.branch?.id || '';
        } catch { return ''; }
    };

    const reload = async () => {
        const branchId = getBranchId();
        if (!branchId) { setLeaveRequests([]); setStaff([]); return; }
        try {
            const [users, leaves] = await Promise.all([
                api.users.list({ branchId }),
                api.hrm.leaves.list({ branchId }),
            ]);
            setStaff(Array.isArray(users) ? users : []);
            const items = Array.isArray(leaves?.items) ? leaves.items : (Array.isArray(leaves) ? leaves : []);
            setLeaveRequests(items);
        } catch {
            setStaff([]);
            setLeaveRequests([]);
        }
    };

    useEffect(() => { reload(); }, []);

    const handleScheduleLeave = async () => {
        if (!newLeave.staffId || !newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
            toast({ title: "Missing Information", description: "Please fill all fields.", variant: "destructive" });
            return;
        }
        try {
            const branchId = getBranchId();
            await api.hrm.leaves.create({
                branchId,
                userId: newLeave.staffId,
                startDate: newLeave.startDate,
                endDate: newLeave.endDate,
                reason: newLeave.reason,
                status: 'Scheduled',
            });
            toast({ title: "Leave Scheduled", description: `Leave has been scheduled.` });
            setIsScheduleLeaveOpen(false);
            setNewLeave({ staffId: '', startDate: '', endDate: '', reason: '' });
            await reload();
        } catch (e) {
            toast({ title: 'Schedule failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handleStatusChange = async (requestId, status) => {
        try {
            await api.hrm.leaves.update(requestId, { status });
            toast({ title: `Leave status updated to "${status}"` });
            await reload();
        } catch (e) {
            toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handleCallOffLeave = async (requestId) => {
        try {
            await api.hrm.leaves.update(requestId, { status: 'Called Off', endDate: new Date().toISOString().split('T')[0] });
            toast({ title: "Leave Called Off" });
            await reload();
        } catch (e) {
            toast({ title: 'Update failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handleDeleteLeave = async (requestId) => {
        try {
            await api.hrm.leaves.remove(String(requestId));
            toast({ title: "Leave Canceled" });
            await reload();
        } catch (e) {
            toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const openExtendLeaveModal = (request) => {
        setLeaveToExtend(request);
        setNewEndDate(request.endDate);
        setIsExtendLeaveOpen(true);
    };

    const handleExtendLeave = async () => {
        if (!newEndDate) {
            toast({ title: "Invalid Date", description: "Please select a new end date.", variant: "destructive" });
            return;
        }
        try {
            await api.hrm.leaves.update(leaveToExtend.id, { endDate: newEndDate, status: 'Extended' });
            toast({ title: "Leave Extended" });
            setIsExtendLeaveOpen(false);
            setLeaveToExtend(null);
            await reload();
        } catch (e) {
            toast({ title: 'Extend failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const isLeaveFuture = (leave) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(leave.startDate);
        return startDate > today;
    };
    
    return (
        <>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Leave Requests</CardTitle>
                        <CardDescription>Review and manage employee leave requests.</CardDescription>
                    </div>
                    <Button onClick={() => setIsScheduleLeaveOpen(true)}>
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Schedule Leave
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaveRequests.length > 0 ? leaveRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.staffName}</TableCell>
                                    <TableCell>{req.startDate} to {req.endDate}</TableCell>
                                    <TableCell>{req.reason}</TableCell>
                                    <TableCell>{req.status}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {req.status === 'Pending' && (
                                            <>
                                                <Button size="sm" variant="outline" className="text-green-500" onClick={() => handleStatusChange(req.id, 'Approved')}><Check className="w-4 h-4 mr-2" />Approve</Button>
                                                <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleStatusChange(req.id, 'Rejected')}><X className="w-4 h-4 mr-2" />Reject</Button>
                                            </>
                                        )}
                                        {req.status === 'Scheduled' && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(req.id, 'On Leave')}><PlayCircle className="w-4 h-4 mr-2" />Start Leave</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleDeleteLeave(req.id)}><Trash2 className="w-4 h-4 mr-2" />Cancel</Button>
                                            </>
                                        )}
                                        {['On Leave', 'Extended'].includes(req.status) && (
                                            <>
                                                <Button size="sm" variant="outline" onClick={() => handleCallOffLeave(req.id)}><PhoneOff className="w-4 h-4 mr-2" />Call Off</Button>
                                                <Button size="sm" variant="outline" onClick={() => openExtendLeaveModal(req)}><CalendarClock className="w-4 h-4 mr-2" />Extend</Button>
                                            </>
                                        )}
                                        {isLeaveFuture(req) && req.status === 'Approved' && (
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteLeave(req.id)}><Trash2 className="w-4 h-4 mr-2" />Cancel</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan="5" className="text-center">No leave requests found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isScheduleLeaveOpen} onOpenChange={setIsScheduleLeaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule New Leave</DialogTitle>
                        <DialogDescription>Create a new leave plan for a staff member.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Staff Member</Label>
                            <Select value={newLeave.staffId} onValueChange={value => setNewLeave({ ...newLeave, staffId: value })}>
                                <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                                <SelectContent>
                                    {staff.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.username}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Start Date</Label>
                                <Input id="start-date" type="date" value={newLeave.startDate} onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">End Date</Label>
                                <Input id="end-date" type="date" value={newLeave.endDate} onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Input id="reason" value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} placeholder="e.g., Annual Vacation" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsScheduleLeaveOpen(false)}>Cancel</Button>
                        <Button onClick={handleScheduleLeave}>Schedule Leave</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isExtendLeaveOpen} onOpenChange={setIsExtendLeaveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Leave</DialogTitle>
                        <DialogDescription>Extend the leave for {leaveToExtend?.staffName}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p>Current End Date: {leaveToExtend?.endDate}</p>
                        <div className="space-y-2">
                            <Label htmlFor="new-end-date">New End Date</Label>
                            <Input id="new-end-date" type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsExtendLeaveOpen(false)}>Cancel</Button>
                        <Button onClick={handleExtendLeave}>Confirm Extension</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};


const RecruitmentManagement = () => {
    const [jobOpenings, setJobOpenings] = useState([]);
    const [newOpening, setNewOpening] = useState({ title: '', department: '' });

    const getBranchId = () => {
        try { const s = JSON.parse(localStorage.getItem('loungeUser') || 'null'); return s?.branchId || s?.branch?.id || ''; } catch { return ''; }
    };

    const reload = async () => {
        try {
            const branchId = getBranchId();
            const res = await api.hrm.recruitment.list({ branchId });
            const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
            setJobOpenings(items);
        } catch { setJobOpenings([]); }
    };

    useEffect(() => { reload(); }, []);

    const handleAddOpening = async () => {
        if (!newOpening.title || !newOpening.department) {
            toast({ title: "Missing Information", description: "Please provide a title and department.", variant: "destructive" });
            return;
        }
        try {
            await api.hrm.recruitment.create({ branchId: getBranchId(), title: newOpening.title, department: newOpening.department, status: 'Open' });
            setNewOpening({ title: '', department: '' });
            await reload();
            toast({ title: "Job Opening Added" });
        } catch (e) {
            toast({ title: 'Create failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    const handleDeleteOpening = async (id) => {
        try {
            await api.hrm.recruitment.remove(String(id));
            await reload();
            toast({ title: "Job Opening Deleted" });
        } catch (e) {
            toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recruitment</CardTitle>
                <CardDescription>Manage job openings and track applicants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="job-title">Job Title</Label>
                        <Input id="job-title" value={newOpening.title} onChange={e => setNewOpening({...newOpening, title: e.target.value})} placeholder="e.g., Senior Barista" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={newOpening.department} onChange={e => setNewOpening({...newOpening, department: e.target.value})} placeholder="e.g., Bar Operations" />
                    </div>
                    <Button onClick={handleAddOpening}><Plus className="w-4 h-4 mr-2" /> Add Opening</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobOpenings.map(job => (
                            <TableRow key={job.id}>
                                <TableCell>{job.title}</TableCell>
                                <TableCell>{job.department}</TableCell>
                                <TableCell>{job.status}</TableCell>
                                <TableCell>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDeleteOpening(job.id)}><Trash2 className="w-4 h-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const PerformanceManagement = () => {
    const [reviews, setReviews] = useState([]);
    const [staff, setStaff] = useState([]);
    const [newReview, setNewReview] = useState({ staffId: '', rating: 0, comments: '' });

    const getBranchId = () => {
        try { const s = JSON.parse(localStorage.getItem('loungeUser') || 'null'); return s?.branchId || s?.branch?.id || ''; } catch { return ''; }
    };

    const reload = async () => {
        try {
            const branchId = getBranchId();
            const [users, revs] = await Promise.all([
                api.users.list({ branchId }),
                api.hrm.reviews.list({ branchId })
            ]);
            setStaff(Array.isArray(users) ? users : []);
            const items = Array.isArray(revs?.items) ? revs.items : (Array.isArray(revs) ? revs : []);
            setReviews(items);
        } catch { setReviews([]); setStaff([]); }
    };

    useEffect(() => { reload(); }, []);

    const handleAddReview = async () => {
        if (!newReview.staffId || !newReview.rating) {
            toast({ title: "Missing Information", description: "Please select a staff member and provide a rating.", variant: "destructive" });
            return;
        }
        try {
            await api.hrm.reviews.create({ branchId: getBranchId(), userId: newReview.staffId, rating: Number(newReview.rating), comments: newReview.comments });
            setNewReview({ staffId: '', rating: 0, comments: '' });
            await reload();
            toast({ title: "Review Added" });
        } catch (e) {
            toast({ title: 'Create failed', description: String(e?.message || e), variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance Reviews</CardTitle>
                <CardDescription>Log and track employee performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Staff Member</Label>
                        <Select value={newReview.staffId} onValueChange={value => setNewReview({...newReview, staffId: value})}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                            <SelectContent>
                                {staff.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.username}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Rating (1-5)</Label>
                        <Input type="number" min="1" max="5" value={newReview.rating} onChange={e => setNewReview({...newReview, rating: parseInt(e.target.value)})} className="w-[100px]" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label>Comments</Label>
                        <Input value={newReview.comments} onChange={e => setNewReview({...newReview, comments: e.target.value})} placeholder="e.g., Excellent customer service" />
                    </div>
                    <Button onClick={handleAddReview}><Plus className="w-4 h-4 mr-2" /> Add Review</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comments</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reviews.map(review => (
                            <TableRow key={review.id}>
                                <TableCell>{review.staffName}</TableCell>
                                <TableCell>{review.date}</TableCell>
                                <TableCell>{review.rating}/5</TableCell>
                                <TableCell>{review.comments}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default HRM;