import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Shield, Clock, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const Staff = ({ user }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const branchId = user?.branchId || user?.branch?.id || undefined;
        let rows;
        try {
          rows = await api.users.list(branchId ? { branchId } : {});
        } catch {
          rows = [];
        }
        const items = Array.isArray(rows?.items) ? rows.items : (Array.isArray(rows) ? rows : []);
        const mapped = items.map(u => ({
          id: u.id,
          name: u.username || u.fullName || u.firstName || u.surname || `user-${u.id}`,
          role: (u.role && String(u.role)) || 'Staff',
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          status: u.status || (u.active === false ? 'off' : 'active'),
          shift: u.shift || '—',
          branch: (u.branch && (u.branch.name || u.branch.title)) || (u.branchName || ''),
        }));
        if (!cancelled) setStaff(mapped);
      } catch {
        if (!cancelled) setStaff([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.branchId]);

  const getRoleColor = (role) => {
    const colors = {
      'Manager': 'from-purple-500 to-pink-600',
      'Barista': 'from-blue-500 to-cyan-600',
      'Waiter': 'from-green-500 to-emerald-600',
      'Chef': 'from-orange-500 to-red-600',
      'Cashier': 'from-indigo-500 to-purple-600',
    };
    return colors[role] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">Staff & Permissions</h2>
          <p className="text-gray-600">Manage your team, roles, and access levels</p>
        </div>
        <Button
          onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </Button>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading staff...</div>
      )}

      {!loading && staff.length === 0 && (
        <div className="text-sm text-gray-500">No staff found for this branch.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && staff.map((member) => (
          <motion.div
            key={member.id}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: member.id * 0.05 }}
          >
            <Card className="glass-effect border-2 border-white/30 flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRoleColor(member.role)} flex items-center justify-center shadow-lg`}>
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">{member.role}</span>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} title={member.status === 'active' ? 'On Duty' : 'Off Duty'} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                   <div className="text-sm">
                     <span className="text-gray-600">Permissions:</span>
                     <div className="flex flex-wrap gap-1 mt-1">
                        {member.permissions.map(p => (
                            <span key={p} className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{p}</span>
                        ))}
                     </div>
                   </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Branch:</span>
                    <span className="font-semibold">{member.branch || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Shift:
                    </span>
                    <span className="font-semibold">{member.shift}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => toast({ title: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀" })}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1.5"/>
                    Edit
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

export default Staff;