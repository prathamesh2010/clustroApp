import React from 'react';
import { ClusterRole } from '@clustro/shared';

interface RoleBadgeProps {
  role: ClusterRole | string;
  parentName?: string | null;
  isOffline?: boolean;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, parentName, isOffline }) => {
  let label = 'Member';
  let badgeCls = 'bg-stone-100 text-stone-700 border-stone-200';

  if (role === ClusterRole.OWNER || role === 'owner') {
    label = 'Owner';
    badgeCls = 'bg-brand-700 text-white border-brand-800';
  } else if (role === ClusterRole.HEAD || role === 'head') {
    label = 'Family Head';
    badgeCls = 'bg-amber-600 text-white border-amber-700';
  } else if (role === ClusterRole.INHERITED || role === 'inherited') {
    label = parentName ? `Rolls up to ${parentName}` : 'Dependent';
    badgeCls = 'bg-stone-200 text-stone-800 border-stone-300';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border shadow-xs ${badgeCls}`}
    >
      {label}
      {isOffline && <span className="text-[9px] opacity-75">(Offline)</span>}
    </span>
  );
};
