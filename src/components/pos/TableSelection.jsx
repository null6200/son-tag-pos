import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Utensils, CheckCircle, Lock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const TableSelection = ({ session, setSession, user }) => {
  const [tables, setTables] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState(null);

  useEffect(() => {
    const loadSections = async () => {
      try {
        if (!user?.branchId) return;
        const rows = await api.sections.list({ branchId: user.branchId });
        setSections(rows || []);
        // prefer a non-store/kitchen section if possible
        const preferred = (rows || []).find(s => !String(s.name||'').toLowerCase().includes('store') && !String(s.name||'').toLowerCase().includes('kitchen')) || (rows && rows[0]);
        const resolvedSectionId = session?.sectionId || preferred?.id || null;
        setSectionId(resolvedSectionId);
        if (resolvedSectionId) {
          const tables = await api.tables.list({ sectionId: resolvedSectionId });
          setTables((tables || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, status: t.locked ? 'occupied' : 'available', capacity: t.capacity || 0, locked_by: t.lockedBy || null })));
        } else {
          setTables([]);
        }
      } catch (e) {
        setSections([]);
        setTables([]);
      }
    };
    loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branchId]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        if (!sectionId) return;
        const rows = await api.tables.list({ sectionId });
        setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, status: t.locked ? 'occupied' : 'available', capacity: t.capacity || 0, locked_by: t.lockedBy || null })));
      } catch {
        setTables([]);
      }
    };
    loadTables();
  }, [sectionId]);

  const handleSelectTable = async (table) => {
    if (table.status !== 'available') {
      toast({ title: 'Table Not Available', description: `This table is currently ${table.status}.`, variant: 'destructive' });
      return;
    }
    try {
      await api.tables.lock(table.id);
      const rows = await api.tables.list({ sectionId });
      setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, status: t.locked ? 'occupied' : 'available', capacity: t.capacity || 0, locked_by: t.lockedBy || null })));
      setSession({ ...session, sectionId, table: { id: table.id, name: table.name, status: 'occupied' } });
      toast({ title: `Table ${table.name} Selected`, description: `Locked by ${user.username}` });
    } catch (e) {
      const message = (e && e.message) ? e.message : 'Failed to lock table';
      toast({ title: 'Lock Failed', description: message, variant: 'destructive' });
      // try refresh in case conflict/409
      try {
        const rows = await api.tables.list({ sectionId });
        setTables((rows || []).map(t => ({ id: t.id, name: t.name || t.code || t.id, status: t.locked ? 'occupied' : 'available', capacity: t.capacity || 0, locked_by: t.lockedBy || null })));
      } catch {}
    }
  };

  const getStatusVisuals = (table) => {
    if (table.locked_by && table.locked_by !== user.username) {
      return { icon: Lock, color: 'text-red-500', bgColor: 'from-red-500/10', borderColor: 'border-red-300' };
    }
    switch (table.status) {
      case 'available':
        return { icon: CheckCircle, color: 'text-green-500', bgColor: 'from-green-500/10', borderColor: 'border-green-300' };
      case 'occupied':
        return { icon: Utensils, color: 'text-orange-500', bgColor: 'from-orange-500/10', borderColor: 'border-orange-300' };
      case 'reserved':
        return { icon: User, color: 'text-blue-500', bgColor: 'from-blue-500/10', borderColor: 'border-blue-300' };
      default:
        return { icon: Utensils, color: 'text-gray-500', bgColor: 'from-gray-500/10', borderColor: 'border-gray-300' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">Select a Table</h2>
        <p className="text-gray-600">Choose a table to start an order</p>
        {sections?.length > 0 && (
          <div className="mt-3">
            <label className="text-sm mr-2">Section:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={sectionId || ''}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {tables.map((table) => {
          const { icon: Icon, color, bgColor, borderColor } = getStatusVisuals(table);
          const isLockedByOther = table.locked_by && table.locked_by !== user.username;
          return (
            <motion.div
              key={table.id}
              whileHover={{ scale: 1.03 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: table.id * 0.05 }}
            >
              <Card
                onClick={() => handleSelectTable(table)}
                className={`glass-effect border-2 ${borderColor} bg-gradient-to-br ${bgColor} h-full flex flex-col cursor-pointer hover:shadow-xl transition-all ${isLockedByOther ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-4xl font-bold">{table.name}</CardTitle>
                  <div className={`flex items-center justify-center gap-1.5 ${color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold capitalize text-sm">{isLockedByOther ? 'Locked' : table.status}</span>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-xs text-gray-500">{table.capacity} Guests</p>
                  {table.locked_by && <p className="text-xs text-gray-500 mt-1">By: {table.locked_by}</p>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TableSelection;