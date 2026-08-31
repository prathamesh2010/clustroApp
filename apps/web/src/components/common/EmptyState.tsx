import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, body, actionButton }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed border-stone-300 rounded-3xl bg-white/70 backdrop-blur-xs shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-display text-lg font-bold text-slate-800">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{body}</p>
      {actionButton && <div className="mt-4">{actionButton}</div>}
    </div>
  );
};
