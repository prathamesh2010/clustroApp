import React, { useState, useEffect } from 'react';
import { PersonalDashboardSummaryDto, fmtMoney } from '@clustro/shared';
import { api } from '../../services/api';
import { History, ChevronRight, PieChart, Wallet, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface MyLedgerViewProps {
  onOpenCluster: (id: string) => void;
}

export const MyLedgerView: React.FC<MyLedgerViewProps> = ({ onOpenCluster }) => {
  const [data, setData] = useState<PersonalDashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ledger/dashboard').then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
      </div>
    );
  }

  if (!data || data.clusterSummaries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No ledger history yet"
        body="Join or create a cluster and add expenses to see your private financial involvement across all groups here."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Groww-style Financial Summary Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5 text-brand-700" />
            <span>You Paid</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {fmtMoney(data.personalPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all your groups</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>Your Share</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            {fmtMoney(data.personalOwed)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Your actual consumption</p>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <ArrowUpRight className={`w-3.5 h-3.5 ${data.personalNet >= 0 ? 'text-brand-700' : 'text-rose-600'}`} />
            <span>Net Position</span>
          </div>
          <p className={`text-xl font-extrabold mt-1 ${data.personalNet >= 0 ? 'text-brand-700' : 'text-rose-600'}`}>
            {data.personalNet >= 0 ? `+${fmtMoney(data.personalNet)}` : `-${fmtMoney(-data.personalNet)}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {data.personalNet >= 0 ? 'To receive across groups' : 'To pay across groups'}
          </p>
        </div>
      </div>

      {/* Category Spend Distribution */}
      {data.categoryBreakdown.length > 0 && (
        <div className="p-4.5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-brand-700" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Personal Spending by Category
              </h4>
            </div>
            <span className="text-xs font-extrabold text-slate-900">{fmtMoney(data.personalOwed)}</span>
          </div>

          <div className="space-y-2 pt-1">
            {data.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 capitalize">{cat.category.toLowerCase()}</span>
                  <span className="text-slate-900">{fmtMoney(cat.amount)} ({cat.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, cat.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster-by-Cluster Breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Involvement by Cluster ({data.clusterSummaries.length})
        </p>

        <div className="space-y-3">
          {data.clusterSummaries.map((c) => (
            <div
              key={c.clusterId}
              className="p-4.5 rounded-3xl bg-white border border-stone-200 shadow-xs space-y-3 hover:border-brand-300 transition-all"
            >
              <div
                onClick={() => onOpenCluster(c.clusterId)}
                className="flex items-start justify-between cursor-pointer group"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-800 transition-colors flex items-center gap-1.5">
                    {c.clusterName}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 transition-transform group-hover:translate-x-0.5" />
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total Group Spend: {fmtMoney(c.totalClusterExpense, c.currency)} · {c.clusterStatus}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                      c.myNet > 0.5
                        ? 'bg-brand-50 text-brand-700 border-brand-200'
                        : c.myNet < -0.5
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-stone-100 text-slate-500 border-stone-200'
                    }`}
                  >
                    {c.myNet > 0.5
                      ? `+${fmtMoney(c.myNet, c.currency)}`
                      : c.myNet < -0.5
                      ? `-${fmtMoney(-c.myNet, c.currency)}`
                      : 'Settled'}
                  </span>
                </div>
              </div>

              {/* Recent Expenses Involving User */}
              {c.recentExpenses.length > 0 && (
                <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs">
                  {c.recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between text-slate-600">
                      <span className="truncate max-w-[200px]">{exp.description}</span>
                      <span className="font-medium text-slate-800">Your Share: {fmtMoney(exp.myShare, c.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
