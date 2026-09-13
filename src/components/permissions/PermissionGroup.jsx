import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * PermissionGroup
 * Props:
 * - title: string
 * - permissions: Array<{ label: string; key: string }>
 * - value: string[]
 * - onChange: (next: string[]) => void
 */
export default function PermissionGroup({ title, permissions = [], value = [], onChange, hint }) {
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
      {title && (
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
          {hint && (
            <span className="group relative inline-flex items-center">
              <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] leading-4 text-center cursor-default">i</span>
              <span className="pointer-events-none absolute left-0 top-5 z-10 hidden group-hover:block whitespace-normal text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md shadow-md px-3 py-2 w-64 text-left">
                {hint}
              </span>
            </span>
          )}
        </div>
      )}
      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
        {permissions.length > 1 && (
          <div className="flex items-center gap-2 mb-2">
            <Checkbox id={`${title}-all`} checked={allChecked} indeterminate={indeterminate} onCheckedChange={toggleAll} />
            <Label htmlFor={`${title}-all`} className="text-sm">Select all</Label>
          </div>
        )}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-400 hover:scrollbar-thumb-gray-500 scrollbar-track-transparent">
          {permissions.map((p) => {
            const id = `${title}-${p.key}`;
            const checked = value.includes(p.key);
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
