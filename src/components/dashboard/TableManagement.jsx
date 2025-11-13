import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Circle, CheckCircle, Clock, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { RequirePermission, hasPermission } from '@/lib/permissions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const TableManagement = ({ user }) => {
  const [tables, setTables] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState('');
  const [tableSection, setTableSection] = useState('');
  const [tableStatus, setTableStatus] = useState('available');
  const [branchSections, setBranchSections] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // booking state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTable, setBookingTable] = useState(null);
  const [bookingName, setBookingName] = useState('');
  const [bookingCount, setBookingCount] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  // remember last selected section per branch via backend user prefs

  useEffect(() => {
    const load = async () => {
      try {
        // Load sections from backend (let backend derive branch if not provided)
        {
          const branchesSections = await api.sections.list({ branchId: user?.branchId || undefined });
          setBranchSections(Array.isArray(branchesSections) ? branchesSections : []);
          // Initialize selection from backend user prefs or first section
          let initial = '';
          try {
            const pref = await (api.userPrefs?.get?.({ key: 'lastTablesSection', branchId: user?.branchId }));
            const val = pref?.value || pref;
            if (val && (branchesSections || []).some(s => s.id === val)) initial = val;
          } catch {}
          // Fallback to localStorage in case server prefs are empty/not yet saved for this branch
          if (!initial) {
            try {
              const ls = localStorage.getItem('lastTablesSection');
              if (ls && (branchesSections || []).some(s => s.id === ls)) initial = ls;
            } catch {}
          }
          if (!initial) initial = (branchesSections && branchesSections[0]?.id) || '';
          if (initial && initial !== tableSection) setTableSection(initial);
          // If we have an initial, load tables
          if (initial) {
            const list = await api.tables.list({ sectionId: initial });
            setTables(list || []);
          } else {
            setTables([]);
          }
        }
      } catch (_) {
        setBranchSections([]);
        setTables([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.branchId]);

  // When tableSection changes, load tables and persist selection
  useEffect(() => {
    (async () => {
      try {
        if (tableSection) {
          if (user?.branchId) {
            try { await (api.userPrefs?.set?.({ key: 'lastTablesSection', branchId: user.branchId, value: tableSection })); } catch {}
          }
          try { localStorage.setItem('lastTablesSection', tableSection); } catch {}
          const list = await api.tables.list({ sectionId: tableSection });
          setTables(Array.isArray(list) ? list : []);
        }
      } catch (_) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSection]);

  const refreshTables = async () => {
    if (!tableSection) { setTables([]); return; }
    const list = await api.tables.list({ sectionId: tableSection });
    setTables(list || []);
  };

  const handleAddTable = () => {
    setCurrentTable(null);
    setTableName('');
    setTableCapacity('');
    // default the dialog's section to the current managed section if present
    setTableSection((prev) => prev || (branchSections[0]?.id || ''));
    setTableStatus('available');
    setIsDialogOpen(true);
  };

  const handleEditTable = (table) => {
    setCurrentTable(table);
    setTableName(table.name);
    setTableCapacity((table.capacity ?? '').toString());
    setTableSection(table.sectionId || table.section || '');
    setTableStatus(table.status || 'available');
    setIsDialogOpen(true);
  };

  const handleDeleteTable = (tableId) => {
    setConfirmDeleteId(tableId);
  };

  const handleSaveTable = () => {
    if (!tableName || !tableSection) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill out all fields." });
      return;
    }

    (async () => {
      try {
        if (currentTable) {
          await api.tables.update(currentTable.id, { name: tableName, sectionId: tableSection, capacity: tableCapacity ? parseInt(tableCapacity) : undefined, status: tableStatus });
          toast({ title: "Table Updated", description: "The table has been successfully updated." });
        } else {
          await api.tables.create({ sectionId: tableSection, name: tableName, capacity: tableCapacity ? parseInt(tableCapacity) : undefined, status: tableStatus });
          toast({ title: "Table Added", description: "The new table has been successfully added." });
        }
        await refreshTables();
        setIsDialogOpen(false);
      } catch (e) {
        toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
      }
    })();
  };

  const handleBookTable = (table) => {
    setBookingTable(table);
    setBookingName('');
    setBookingCount('');
    setBookingTime('');
    setBookingOpen(true);
  };

  const submitBooking = async () => {
    try {
      if (!bookingTable) return;
      await api.tables.update(bookingTable.id, {
        bookingName: bookingName || undefined,
        bookingCount: bookingCount ? parseInt(bookingCount) : undefined,
        bookingTime: bookingTime || undefined,
        status: 'reserved',
      });
      setBookingOpen(false);
      await refreshTables();
      toast({ title: 'Table booked', description: `${bookingTable.name} reserved${bookingTime ? ` for ${bookingTime}` : ''}.` });
    } catch (e) {
      toast({ title: 'Booking failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const getStatusVisuals = (status) => {
    switch (status) {
      case 'available':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'from-green-500/10 to-green-500/0', borderColor: 'border-green-300' };
      case 'occupied':
        return { icon: Utensils, color: 'text-orange-500', bgColor: 'from-orange-500/10 to-orange-500/0', borderColor: 'border-orange-300' };
      case 'reserved':
        return { icon: Clock, color: 'text-blue-500', bgColor: 'from-blue-500/10 to-blue-500/0', borderColor: 'border-blue-300' };
      default:
        return { icon: Circle, color: 'text-gray-500', bgColor: 'from-gray-500/10 to-gray-500/0', borderColor: 'border-gray-300' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Table Management</h2>
          <p className="text-gray-600">Manage seating, reservations, and table status for your branch.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">Manage Section</Label>
          <Select value={tableSection} onValueChange={(v) => setTableSection(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {branchSections.map((section) => (
                <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{currentTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={tableName} onChange={(e) => setTableName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="capacity" className="text-right">Capacity</Label>
                <Input id="capacity" type="number" value={tableCapacity} onChange={(e) => setTableCapacity(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Status</Label>
                <Select value={tableStatus} onValueChange={setTableStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="section" className="text-right">Section</Label>
                 <Select value={tableSection} onValueChange={setTableSection}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchSections.length > 0 ? branchSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                      )) : <SelectItem value="disabled" disabled>No sections found. Add sections in Branch Management.</SelectItem>}
                    </SelectContent>
                  </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSaveTable}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Top-right Add button matching the blue primary style */}
      <div className="flex justify-end mb-4">
        {(user?.role === 'ADMIN' || hasPermission(user?.permissions || [], 'add_tables')) ? (
          <Button onClick={handleAddTable}>Add Table</Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map((table) => {
          const { icon: Icon, color, bgColor, borderColor } = getStatusVisuals(table.status);
          return (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.03 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: table.id * 0.05 }}
            >
              <Card className={`glass-effect border-2 ${borderColor} bg-gradient-to-br ${bgColor} h-full flex flex-col justify-between`}>
                <div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl font-bold">{table.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <div className={`hidden sm:flex items-center gap-1.5 ${color}`}>
                          <Icon className="w-5 h-5" />
                          <span className="font-semibold capitalize text-sm">{table.status}</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="outline" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => toast({ title: table.name, description: `${(branchSections.find(s => s.id === table.sectionId)?.name) || table.section || 'Unknown'} • ${table.capacity ?? 'N/A'} seats • ${table.status}` })}>View Table</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTable(table)}>Edit Table</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBookTable(table)}>Book Table</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteTable(table.id)} disabled={table.status !== 'available'}>Delete Table</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{table.capacity ?? 'N/A'} Guests</span>
                      <span className="font-medium text-gray-400">{(branchSections.find(s => s.id === table.sectionId)?.name) || table.section || 'Unknown'}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {table.status === 'occupied' && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Order {table.order}</p>
                        <p className="text-lg font-bold gradient-text">${(table.total || 0).toFixed(2)}</p>
                      </div>
                    )}
                  </CardContent>
                </div>
                <CardContent className="flex flex-col gap-2 pt-2">
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => toast({ title: 'Coming soon', description: 'Order flow will be wired here.' })}
                  >
                     {table.status === 'available' ? 'Create Order' : 'View Details'}
                   </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Global Delete Confirm */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You can only delete available tables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (!confirmDeleteId) return; try { await api.tables.remove(confirmDeleteId); await refreshTables(); toast({ title: 'Table Deleted' }); } catch (e) { toast({ title: 'Delete failed', description: String(e?.message || e), variant: 'destructive' }); } finally { setConfirmDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booking Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Table{bookingTable ? ` • ${bookingTable.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <Input className="col-span-3" value={bookingName} onChange={(e) => setBookingName(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Guests</Label>
              <Input className="col-span-3" type="number" value={bookingCount} onChange={(e) => setBookingCount(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Time</Label>
              <Input className="col-span-3" type="datetime-local" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={submitBooking}>Save Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableManagement;