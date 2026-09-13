import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Users, Plus, Edit, Trash2, Box, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const BranchForm = ({ branch, onSave, onCancel }) => {
  const [name, setName] = useState(branch ? branch.name : '');
  const [location, setLocation] = useState(branch ? branch.location : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !location) {
      toast({
        title: "Validation Error",
        description: "Branch name and location are required.",
        variant: "destructive",
      });
      return;
    }
    onSave({
      id: branch ? branch.id : Date.now(),
      name,
      location,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="branch-name">Branch Name</Label>
        <Input
          id="branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Main Branch"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="branch-location">Location</Label>
        <Input
          id="branch-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., 123 Main St, Downtown"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{branch ? 'Save Changes' : 'Create Branch'}</Button>
      </DialogFooter>
    </form>
  );
};

const Branches = ({ onManageSections }) => {
  const [branches, setBranches] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const list = await api.branches.list();
        setBranches(Array.isArray(list) ? list : []);
      } catch {
        setBranches([]);
      }
    };
    loadBranches();
  }, []);

  const saveBranchesToState = (updatedBranches) => {
    setBranches(updatedBranches);
  };

  const handleSaveBranch = async (branchData) => {
    try {
      if (editingBranch) {
        await api.branches.update(branchData.id, { name: branchData.name, location: branchData.location });
        toast({ title: "Branch Updated!", description: `The "${branchData.name}" branch has been updated.` });
      } else {
        await api.branches.create({ name: branchData.name, location: branchData.location });
        toast({ title: "Branch Created!", description: `The "${branchData.name}" branch has been added.` });
      }
      const list = await api.branches.list();
      setBranches(Array.isArray(list) ? list : []);
    } catch (e) {
      toast({ title: 'Branch Save Failed', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setIsFormOpen(false);
      setEditingBranch(null);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    const branchToDelete = branches.find(b => b.id === branchId);
    try {
      await api.branches.remove(branchId);
      toast({ title: "Branch Deleted!", description: `The "${branchToDelete?.name || ''}" branch has been removed.` });
      const list = await api.branches.list();
      setBranches(Array.isArray(list) ? list : []);
    } catch (e) {
      toast({ title: 'Delete Failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const openAddForm = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
  };

  const openEditForm = (branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight gradient-text">Branch Management</h2>
          <p className="text-muted-foreground">Oversee and manage all your business locations.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
              <Plus className="w-4 h-4" /> Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
              <DialogDescription>
                {editingBranch ? 'Update the details for your branch.' : 'Create a new branch for your business.'}
              </DialogDescription>
            </DialogHeader>
            <BranchForm branch={editingBranch} onSave={handleSaveBranch} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch, index) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
          >
            <Card className="glass-effect h-full flex flex-col border-2 border-white/30 dark:border-white/10">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{branch.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{branch.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`mt-1 w-3 h-3 rounded-full ${branch.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} title={branch.status} />
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                 <div className="space-y-4 mb-4">
                    <div className="p-3 rounded-lg bg-background/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-muted-foreground">Staff</span>
                      </div>
                      <p className="text-xl font-bold gradient-text">{branch.staff}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-muted-foreground">Sections ({branch.sections?.length || 0})</span>
                      </div>
                      {branch.sections && branch.sections.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {branch.sections.map(section => (
                            <span key={section.id} className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                              {section.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No sections assigned.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onManageSections(branch)}>
                      <Settings2 className="w-4 h-4 mr-2" /> Manage Sections
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{branch.name}" branch.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBranch(branch.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                     <Button variant="outline" size="sm" onClick={() => openEditForm(branch)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Branches;