import React from 'react';
import { ClusterDto, fmtMoney } from '@clustro/shared';
import { getTypeMeta } from '../common/TypeIcon';
import { ChevronRight, Calendar, Users } from 'lucide-react';

interface ClusterCardProps {
  cluster: ClusterDto;
  onOpen: () => void;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({ cluster, onOpen }) => {
  const meta = getTypeMeta(cluster.type);
  const Icon = meta.icon;

  const dateLabel = () => {
    if (!cluster.startDate && !cluster.endDate) return null;
    if (cluster.startDate && cluster.endDate) return `${cluster.startDate} → ${cluster.endDate}`;
    if (cluster.startDate) return `Started ${cluster.startDate}`;
    return `Ends ${cluster.endDate}`;
  };

  const myBalance = cluster.myBalance;

  return (
    <div
      onClick={onOpen}
      className="w-full text-left bg-white border border-stone-200/90 rounded-2xl p-4.5 hover:border-brand-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${meta.bgColor} ${meta.color} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-800 transition-colors">
              {cluster.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
              <span className="capitalize">{meta.label}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {cluster.memberCount || cluster.members.length} members
              </span>
            </div>
          </div>
        </div>

        {/* Total Spend */}
        <div className="text-right">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Spend</p>
          <p className="text-base font-extrabold text-slate-900 mt-0.5">
            {fmtMoney(cluster.totalExpense || 0, cluster.currency)}
          </p>
        </div>
      </div>

      {/* Footer Info: Dates & Personal Balance */}
      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
        <div className="text-slate-500 font-medium flex items-center gap-1.5 truncate">
          {dateLabel() ? (
            <>
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{dateLabel()}</span>
            </>
          ) : (
            <span className="text-slate-400 italic">No dates set</span>
          )}
        </div>

        {/* Personal Balance Chip */}
        {myBalance && (
          <div className="shrink-0 ml-2">
            {myBalance.net > 0.5 ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                You get {fmtMoney(myBalance.net, cluster.currency)}
              </span>
            ) : myBalance.net < -0.5 ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                You owe {fmtMoney(-myBalance.net, cluster.currency)}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-500">
                Settled
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
