import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CLUSTER_TYPE_CONFIG } from '../common/TypeIcon';
import { ClusterType, ClusterStatus } from '@clustro/shared';
import { Loader2 } from 'lucide-react';

interface NewClusterModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description?: string;
    type: ClusterType;
    status: ClusterStatus;
    startDate?: string;
    endDate?: string;
    currency: string;
    location?: string;
  }) => Promise<void>;
}

export const NewClusterModal: React.FC<NewClusterModalProps> = ({ onClose, onCreate }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ClusterType>(ClusterType.FAMILY);
  const [status, setStatus] = useState<ClusterStatus>(ClusterStatus.LIVE);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addDays = (dateStr: string, n: number) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Cluster name is required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        currency,
        location: location.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create cluster');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Create New Cluster" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Cluster Name *
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Sharma Family, Goa Trip 2026, Sunrise Chawl Maintenance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Cluster Type
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Object.entries(CLUSTER_TYPE_CONFIG).map(([key, meta]) => {
              const Icon = meta.icon;
              const isSelected = type === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setType(key as ClusterType)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-brand-700 bg-brand-50 text-brand-800 shadow-xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-700' : 'text-slate-500'}`} />
                  <span className="truncate max-w-full">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              className={inputCls}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              End Date (Optional)
            </label>
            <input
              type="date"
              className={inputCls}
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Pick Durations for Trips */}
        {type === ClusterType.TRIP && (
          <div className="flex items-center gap-1.5 -mt-1">
            <span className="text-[11px] font-semibold text-slate-400">Quick Duration:</span>
            {[1, 2, 3, 5, 7, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEndDate(addDays(startDate, n - 1))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  endDate === addDays(startDate, n - 1)
                    ? 'border-brand-700 bg-brand-50 text-brand-800'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-slate-500'
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Initial Status
            </label>
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as ClusterStatus)}
            >
              <option value={ClusterStatus.LIVE}>Live / Active</option>
              <option value={ClusterStatus.PENDING}>Pending / Planning</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Currency
            </label>
            <select
              className={inputCls}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED (د.إ)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="THB">THB (฿)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Location / Note (Optional)
          </label>
          <input
            className={inputCls}
            placeholder="e.g. North Goa, Mumbai Wing B, Manali"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Cluster'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
