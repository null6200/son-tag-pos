import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit, Trash2, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';

const SectionForm = ({ section, onSave, onCancel, sectionFunctions }) => {
  const [name, setName] = useState(section ? section.name : '');
  const [description, setDescription] = useState(section ? section.description : '');
  const [sectionFunctionId, setSectionFunctionId] = useState(section ? section.sectionFunctionId || '' : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !sectionFunctionId) {
      toast({
        title: "Validation Error",
        description: "Section name and function are required.",
        variant: "destructive",
      });
      return;
    }
    onSave({
      id: section ? section.id : Date.now(),
      name,
      description,
      sectionFunctionId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="section-name">Section Name</Label>
        <Input
          id="section-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Rooftop Bar"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="section-function">Section Function</Label>
        <Select value={sectionFunctionId} onValueChange={setSectionFunctionId}>
          <SelectTrigger id="section-function">
            <SelectValue placeholder="Select a function" />
          </SelectTrigger>
          <SelectContent>
            {sectionFunctions.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="section-description">Description</Label>
        <Input
          id="section-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{section ? 'Save Changes' : 'Create Section'}</Button>
      </DialogFooter>
    </form>
  );
};

const SectionManagement = ({ branch, onBack }) => {
  const [sections, setSections] = useState([]);
  const [sectionFunctions, setSectionFunctions] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  useEffect(() => {
    const loadSections = async () => {
      try {
        if (!branch?.id) { setSections([]); return; }
        const rows = await api.sections.list({ branchId: branch.id });
        setSections(Array.isArray(rows) ? rows : []);
        const funcs = await api.sectionFunctions.list({ branchId: branch.id });
        const items = Array.isArray(funcs?.items) ? funcs.items : (Array.isArray(funcs) ? funcs : []);
        setSectionFunctions(items);
      } catch {
        setSections([]);
      }
    };
    loadSections();
  }, [branch.id]);

  const refresh = async () => {
    try {
      const rows = await api.sections.list({ branchId: branch.id });
      setSections(Array.isArray(rows) ? rows : []);
      const funcs = await api.sectionFunctions.list({ branchId: branch.id });
      const items = Array.isArray(funcs?.items) ? funcs.items : (Array.isArray(funcs) ? funcs : []);
      setSectionFunctions(items);
    } catch { setSections([]); }
  };

  const handleSaveSection = async (sectionData) => {
    try {
      if (editingSection) {
        await api.sections.update(editingSection.id, { name: sectionData.name, description: sectionData.description, sectionFunctionId: sectionData.sectionFunctionId });
        toast({ title: "Section Updated!", description: `The "${sectionData.name}" section has been updated.` });
      } else {
        await api.sections.create({ branchId: branch.id, name: sectionData.name, description: sectionData.description, sectionFunctionId: sectionData.sectionFunctionId });
        toast({ title: "Section Created!", description: `The "${sectionData.name}" section has been added.` });
      }
      await refresh();
    } catch (e) {
      toast({ title: 'Section Save Failed', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setIsFormOpen(false);
      setEditingSection(null);
    }
  };

  const handleDeleteSection = async (sectionId) => {
    const sectionToDelete = sections.find(s => s.id === sectionId);
    try {
      await api.sections.remove(sectionId);
      toast({ title: "Section Deleted!", description: `The "${sectionToDelete?.name || ''}" section has been removed.` });
      await refresh();
    } catch (e) {
      toast({ title: 'Delete Failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const openAddForm = () => {
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const openEditForm = (section) => {
    setEditingSection(section);
    setIsFormOpen(true);
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2 -ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Branches
            </Button>
            <h2 className="text-3xl font-bold tracking-tight gradient-text">Manage Sections</h2>
            <p className="text-muted-foreground">Operational areas for the "{branch.name}" branch.</p>
          </div>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2">
              <Plus className="w-4 h-4" /> Add Section
            </Button>
          </DialogTrigger>
        </div>

        <Card className="glass-effect border-2 border-white/30 dark:border-white/10">
          <CardHeader>
            <CardTitle>Section List</CardTitle>
            <CardDescription>All sections currently configured for this branch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.length > 0 ? (
                sections.map((section) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <Box className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{section.name}</p>
                        <p className="text-sm text-muted-foreground">{sectionFunctions.find(f => f.id === section.sectionFunctionId)?.name || (section.function || 'No function')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(section)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the "{section.name}" section.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSection(section.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No sections found. Add one to get started!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSection ? 'Edit Section' : 'Add New Section'}</DialogTitle>
          <DialogDescription>
            {editingSection ? `Update the details for your section in ${branch.name}.` : `Create a new section for the ${branch.name} branch.`}
          </DialogDescription>
        </DialogHeader>
        <SectionForm section={editingSection} onSave={handleSaveSection} onCancel={() => setIsFormOpen(false)} sectionFunctions={sectionFunctions} />
      </DialogContent>
    </Dialog>
  );
};

export default SectionManagement;