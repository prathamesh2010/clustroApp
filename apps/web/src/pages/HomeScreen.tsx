import React, { useState, useEffect } from 'react';
import { ClusterDto, fmtMoney, ClusterStatus } from '@clustro/shared';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ClusterCard } from '../components/cluster/ClusterCard';
import { NewClusterModal } from '../components/cluster/NewClusterModal';
import { MyLedgerView } from '../components/ledger/MyLedgerView';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  KeyRound,
  Users,
  Compass,
  Sparkles,
  Loader2,
  RefreshCw,
  Wallet,
  TrendingUp,
} from 'lucide-react';

interface HomeScreenProps {
  onOpenCluster: (clusterId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenCluster }) => {
  const { user } = useAuth();
  const [clusters, setClusters] = useState<ClusterDto[]>([]);
  const [tab, setTab] = useState<'live' | 'pending' | 'ended' | 'ledger'>('live');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showNewCluster, setShowNewCluster] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const fetchClusters = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/clusters');
      setClusters(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleCreateCluster = async (data: any) => {
    const res = await api.post('/clusters', data);
    await fetchClusters(true);
    if (res.data?.id) {
      onOpenCluster(res.data.id);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await api.post('/clusters/join', { inviteCode: inviteCode.trim() });
      setShowJoinModal(false);
      setInviteCode('');
      await fetchClusters(true);
      if (res.data?.id) {
        onOpenCluster(res.data.id);
      }
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  const tabs = [
    { id: 'live', label: 'Live Groups' },
    { id: 'pending', label: 'Pending / Planning' },
    { id: 'ended', label: 'Ended / Archived' },
    { id: 'ledger', label: 'My Ledger' },
  ];

  const filteredClusters = clusters.filter((c) => {
    if (tab === 'live') return c.status === ClusterStatus.LIVE;
    if (tab === 'pending') return c.status === ClusterStatus.PENDING;
    if (tab === 'ended') return c.status === ClusterStatus.ENDED;
    return true;
  });

  const totalAllClustersSpend = clusters.reduce((sum, c) => sum + (c.totalExpense || 0), 0);

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-5">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400">Welcome back</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {user?.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-brand-700" />
            <span>Join by Code</span>
          </button>
        </div>
      </div>

      {/* Hero Financial Card */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl ledger-edge relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Total Spend Across Your Clusters
          </p>
          <p className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {fmtMoney(totalAllClustersSpend, user?.defaultCurrency || 'INR')}
          </p>
          <div className="flex items-center gap-3 pt-2 text-xs text-slate-300 font-medium">
            <span>{clusters.length} cluster{clusters.length === 1 ? '' : 's'} total</span>
            <span>·</span>
            <span>{clusters.filter((c) => c.status === ClusterStatus.LIVE).length} live now</span>
          </div>
        </div>

        {/* Decorative circle glow */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-brand-600/20 blur-2xl pointer-events-none" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-brand-700 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-slate-600 hover:bg-stone-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      {tab !== 'ledger' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
            </div>
          ) : filteredClusters.length === 0 ? (
            <EmptyState
              icon={Users}
              title={`No ${tab} clusters found`}
              body="Start a new cluster for your family, a trip, or your society — or enter an invite code to join one."
              actionButton={
                <button
                  onClick={() => setShowNewCluster(true)}
                  className="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Create your first cluster
                </button>
              }
            />
          ) : (
            filteredClusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} onOpen={() => onOpenCluster(c.id)} />
            ))
          )}
        </div>
      )}

      {tab === 'ledger' && <MyLedgerView onOpenCluster={onOpenCluster} />}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowNewCluster(true)}
        className="fixed bottom-6 right-6 z-30 bg-brand-700 hover:bg-brand-800 text-white rounded-full pl-4.5 pr-5.5 py-3.5 shadow-2xl shadow-brand-900/30 flex items-center gap-2 font-bold text-sm transition-all hover:scale-105 cursor-pointer"
      >
        <Plus className="w-5 h-5" />
        <span>New Cluster</span>
      </button>

      {/* Modals */}
      {showNewCluster && (
        <NewClusterModal
          onClose={() => setShowNewCluster(false)}
          onCreate={handleCreateCluster}
        />
      )}

      {showJoinModal && (
        <Modal title="Join Cluster via Invite Code" onClose={() => setShowJoinModal(false)}>
          <form onSubmit={handleJoinByCode} className="space-y-4">
            {joinError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {joinError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Enter Invite Code
              </label>
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 font-mono text-center tracking-widest text-lg uppercase font-bold"
                placeholder="e.g. A1B2C3D4"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Ask the cluster owner for their 8-character invite code.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={joining || !inviteCode.trim()}
                className="w-full py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Cluster'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
