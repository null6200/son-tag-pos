import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Generic permission list renderer
 * Props:
 * - title?: string
 * - permissions: Array<{ label: string; key: string }>
 * - value: string[] (selected permission keys)
 * - onChange: (next: string[]) => void
 */
export function PermissionList({ title, permissions = [], value = [], onChange }) {
  const allChecked = permissions.length > 0 && permissions.every(p => value.includes(p.key));
  const indeterminate = !allChecked && permissions.some(p => value.includes(p.key));

  const toggleAll = (checked) => {
    if (checked) onChange?.(Array.from(new Set([...(value || []), ...permissions.map(p => p.key)])));
    else onChange?.((value || []).filter(k => !permissions.find(p => p.key === k)));
  };

  const toggleOne = (key, checked) => {
    if (checked) onChange?.(Array.from(new Set([...(value || []), key])));
    else onChange?.((value || []).filter(k => k !== key));
  };

  return (
    <div className="space-y-3">
      {title && <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>}
      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Checkbox id="select-all" checked={allChecked} indeterminate={indeterminate} onCheckedChange={toggleAll} />
          <Label htmlFor="select-all" className="text-sm">Select all</Label>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 scrollbar-track-transparent">
          {permissions.map((p) => {
            const checked = value.includes(p.key);
            const id = `perm-${p.key}`;
            return (
              <div key={p.key} className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                <Checkbox id={id} checked={checked} onCheckedChange={(c) => toggleOne(p.key, c)} />
                <Label htmlFor={id} className="text-sm">{p.label}</Label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PermissionList;
