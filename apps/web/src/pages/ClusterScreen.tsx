import React, { useState, useEffect, useCallback } from 'react';
import {
  ClusterDto,
  ExpenseDto,
  ActivityDto,
  ActivityLogDto,
  ClusterRole,
  ClusterStatus,
  fmtMoney,
} from '@clustro/shared';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getTypeMeta } from '../components/common/TypeIcon';
import { RoleBadge } from '../components/common/RoleBadge';
import { EmptyState } from '../components/common/EmptyState';
import { AddMemberModal } from '../components/cluster/AddMemberModal';
import { AddExpenseModal } from '../components/cluster/AddExpenseModal';
import { SettleModal } from '../components/cluster/SettleModal';
import { EditDatesModal } from '../components/cluster/EditDatesModal';
import { ChatDrawer } from '../components/cluster/ChatDrawer';
import { ActivitiesView } from '../components/cluster/ActivitiesView';
import { ReceiptLightbox } from '../components/cluster/ReceiptLightbox';

import {
  ArrowLeft,
  Plus,
  Wallet,
  UserPlus,
  Download,
  MessageCircle,
  History,
  Calendar,
  Clock,
  Trash2,
  Image as ImageIcon,
  Share2,
  Compass,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface ClusterScreenProps {
  clusterId: string;
  onBack: () => void;
}

export const ClusterScreen: React.FC<ClusterScreenProps> = ({ clusterId, onBack }) => {
  const { user } = useAuth();
  const [cluster, setCluster] = useState<ClusterDto | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDto[]>([]);
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showEditDates, setShowEditDates] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; name: string } | null>(null);

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchClusterData = useCallback(async () => {
    try {
      const [cRes, expRes, actRes, logsRes] = await Promise.all([
        api.get(`/clusters/${clusterId}`),
        api.get(`/clusters/${clusterId}/expenses`),
        api.get(`/clusters/${clusterId}/activities`),
        api.get(`/clusters/${clusterId}/activity`),
      ]);

      setCluster(cRes.data);
      setExpenses(expRes.data);
      setActivities(actRes.data);
      setActivityLogs(logsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchClusterData();
  }, [fetchClusterData]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Clusters
        </button>
        <EmptyState
          icon={AlertCircle}
          title="Cluster not found"
          body="You may not have permission to view this cluster or it may have been deleted."
        />
      </div>
    );
  }

  const isOwner = cluster.ownerId === user?.id;
  const meta = getTypeMeta(cluster.type);
  const Icon = meta.icon;
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);

  const handleStatusChange = async (newStatus: ClusterStatus) => {
    try {
      await api.patch(`/clusters/${clusterId}`, { status: newStatus });
      fetchClusterData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleSaveDates = async (data: { startDate?: string; endDate?: string }) => {
    await api.patch(`/clusters/${clusterId}`, data);
    fetchClusterData();
  };

  const handleAddMember = async (data: any) => {
    await api.post(`/clusters/${clusterId}/members`, data);
    fetchClusterData();
  };

  const handleAddExpense = async (formData: FormData) => {
    await api.post(`/clusters/${clusterId}/expenses`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    fetchClusterData();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    await api.delete(`/clusters/${clusterId}/expenses/${expenseId}`);
    fetchClusterData();
  };

  const handleAddActivity = async (data: any) => {
    await api.post(`/clusters/${clusterId}/activities`, data);
    fetchClusterData();
  };

  const handleDownloadCsv = () => {
    window.open(`/api/v1/clusters/${clusterId}/export/csv`, '_blank');
  };

  const handleCopyInviteCode = () => {
    if (cluster.inviteCode) {
      navigator.clipboard.writeText(cluster.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (selectedCategory === 'ALL') return true;
    return e.category === selectedCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(expenses.map((e) => e.category)))];

  return (
    <div className="pb-28 pt-3 px-4 max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isOwner ? (
          <select
            value={cluster.status}
            onChange={(e) => handleStatusChange(e.target.value as ClusterStatus)}
            className="text-xs font-bold border border-stone-200 rounded-full px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-brand-700 outline-none shadow-2xs"
          >
            <option value={ClusterStatus.LIVE}>Live / Active</option>
            <option value={ClusterStatus.PENDING}>Pending / Planning</option>
            <option value={ClusterStatus.ENDED}>Ended / Archived</option>
          </select>
        ) : (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-slate-600 border border-stone-200 capitalize">
            {cluster.status}
          </span>
        )}
      </div>

      {/* Cluster Identity Section */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${meta.bgColor} ${meta.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>
            {meta.label} Cluster
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {cluster.name}
        </h1>

        {cluster.description && (
          <p className="text-xs text-slate-500 leading-relaxed">{cluster.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {cluster.startDate && cluster.endDate
                ? `${cluster.startDate} → ${cluster.endDate}`
                : cluster.startDate
                ? `Started ${cluster.startDate}`
                : 'No dates set'}
            </span>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowEditDates(true)}
              className="text-[11px] font-bold text-brand-700 hover:text-brand-800 underline cursor-pointer"
            >
              Edit Dates
            </button>
          )}

          {cluster.inviteCode && (
            <button
              onClick={handleCopyInviteCode}
              className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3 h-3 text-brand-700" /> : <Share2 className="w-3 h-3 text-slate-500" />}
              <span>{copiedCode ? 'Code Copied!' : `Code: ${cluster.inviteCode}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Financial Ledger Card */}
      <div className="p-5.5 rounded-3xl bg-brand-700 text-white shadow-xl ledger-edge relative overflow-hidden space-y-4">
        <div className="relative z-10 space-y-1">
          <p className="text-brand-100 text-xs font-bold uppercase tracking-wider">
            Total Cluster Expense
          </p>
          <p className="font-display text-4xl sm:text-5xl font-extrabold text-white">
            {fmtMoney(totalExpense, cluster.currency)}
          </p>
          <p className="text-brand-100 text-xs font-medium pt-1">
            {expenses.length} entr{expenses.length === 1 ? 'y' : 'ies'} · {cluster.members.length} members
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex gap-2.5 pt-1 relative z-10">
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex-1 bg-white hover:bg-stone-50 text-brand-900 font-extrabold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
          <button
            onClick={() => setShowSettle(true)}
            className="flex-1 bg-brand-800/80 hover:bg-brand-800 border border-brand-400/40 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4" /> Settle Up
          </button>
        </div>
      </div>

      {/* Secondary Actions Bar */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setShowActivities((s) => !s)}
          className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            showActivities
              ? 'bg-brand-50 border-brand-700 text-brand-800'
              : 'bg-white border-stone-200 text-slate-700 hover:bg-stone-50'
          }`}
        >
          <Compass className="w-4 h-4 text-brand-700" />
          <span>Activities ({activities.length})</span>
        </button>

        <button
          onClick={handleDownloadCsv}
          className="py-2.5 px-3 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={() => setShowChat(true)}
          className="py-2.5 px-3 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-brand-700" />
          <span>Group Chat</span>
        </button>
      </div>

      {/* Activities Drawer / Section */}
      {showActivities && (
        <div className="p-4 rounded-3xl bg-stone-100/80 border border-stone-200 space-y-3">
          <ActivitiesView
            clusterId={clusterId}
            currency={cluster.currency}
            activities={activities}
            onAddActivity={handleAddActivity}
          />
        </div>
      )}

      {/* Members Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Members ({cluster.members.length})
          </p>
          <button
            onClick={() => setShowAddMember(true)}
            className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Member
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {cluster.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-stone-200/90 shadow-2xs"
            >
              <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-800 text-[11px] font-bold flex items-center justify-center uppercase">
                {m.displayName.charAt(0)}
              </div>
              <span className="text-xs font-bold text-slate-800">{m.displayName}</span>
              <RoleBadge
                role={m.role}
                parentName={m.parentMember?.displayName}
                isOffline={m.isPlaceholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Expenses ({expenses.length})
          </p>

          {/* Category Filter Pills */}
          {categories.length > 2 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-stone-100 text-slate-500 hover:bg-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses logged yet"
            body="Add the first expense — everyone in this cluster will immediately see the updated ledger."
            actionButton={
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Add first expense
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs flex gap-3.5 hover:border-brand-300 transition-all"
              >
                {/* Receipt Image Thumbnail */}
                {e.attachments.length > 0 && (
                  <button
                    onClick={() =>
                      setSelectedReceipt({
                        url: e.attachments[0].fileUrl,
                        name: e.attachments[0].fileName,
                      })
                    }
                    className="relative w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0 group cursor-pointer"
                  >
                    <img
                      src={e.attachments[0].fileUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {e.description}
                    </h4>
                    <p className="text-base font-extrabold text-slate-900 whitespace-nowrap">
                      {fmtMoney(e.amount, e.currency)}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Paid by <span className="font-semibold text-slate-800">{e.paidByMember?.displayName || 'Someone'}</span> · {e.expenseDate}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100 text-[11px] text-slate-400 font-medium">
                    <span>Split {e.splits.length} ways ({e.splitType})</span>

                    {(isOwner || e.createdByUserId === user?.id) && (
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log / History Section */}
      <div className="pt-2">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="w-full flex items-center justify-between py-2.5 px-3 rounded-2xl bg-white border border-stone-200 text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" /> Activity History ({activityLogs.length})
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>

        {showHistory && (
          <div className="mt-2 p-3.5 rounded-2xl bg-white border border-stone-200 space-y-2.5">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No activity logs recorded.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-brand-700 pl-3 py-0.5 space-y-0.5">
                  <p className="font-semibold text-slate-800">{log.summaryText}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-30 w-13 h-13 rounded-full bg-slate-900 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
        title="Open Cluster Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal
          clusterId={clusterId}
          currency={cluster.currency}
          members={cluster.members}
          activities={activities}
          onClose={() => setShowAddExpense(false)}
          onAdd={handleAddExpense}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          members={cluster.members}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
        />
      )}

      {showSettle && (
        <SettleModal
          clusterId={clusterId}
          currency={cluster.currency}
          onClose={() => setShowSettle(false)}
          onPaymentRecorded={fetchClusterData}
        />
      )}

      {showEditDates && (
        <EditDatesModal
          initialStartDate={cluster.startDate}
          initialEndDate={cluster.endDate}
          onClose={() => setShowEditDates(false)}
          onSave={handleSaveDates}
        />
      )}

      {showChat && (
        <ChatDrawer
          clusterId={clusterId}
          clusterName={cluster.name}
          onClose={() => setShowChat(false)}
        />
      )}

      {selectedReceipt && (
        <ReceiptLightbox
          imageUrl={selectedReceipt.url}
          fileName={selectedReceipt.name}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
