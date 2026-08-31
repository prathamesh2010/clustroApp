import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ClusterRole, ClusterMemberDto } from '@clustro/shared';
import { Loader2 } from 'lucide-react';

interface AddMemberModalProps {
  members: ClusterMemberDto[];
  onClose: () => void;
  onAdd: (data: {
    name: string;
    usernameOrEmail?: string;
    role: ClusterRole;
    parentMemberId?: string;
  }) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ members, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [role, setRole] = useState<ClusterRole>(ClusterRole.MEMBER);
  const [parentMemberId, setParentMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parentCandidates = members.filter((m) => m.role !== ClusterRole.INHERITED);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required');
      return;
    }
    if (role === ClusterRole.INHERITED && !parentMemberId) {
      setError('Please select which Head/Owner this dependent rolls up under');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onAdd({
        name: name.trim(),
        usernameOrEmail: usernameOrEmail.trim() || undefined,
        role,
        parentMemberId: role === ClusterRole.INHERITED ? parentMemberId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Add Member to Cluster" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Member Name *
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Ramesh, Aarav, Rohan, Flat 101"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Username or Email (Optional)
          </label>
          <input
            className={inputCls}
            placeholder="Leave empty for an offline / temporary member"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Offline members can be created without an account and claimed later.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Role in this Cluster
          </label>
          <select
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as ClusterRole)}
          >
            <option value={ClusterRole.MEMBER}>Member (Individual balance)</option>
            <option value={ClusterRole.HEAD}>Family Head (Responsible for sub-family debts)</option>
            <option value={ClusterRole.INHERITED}>Dependent / Inherited (Rolls up to a Head)</option>
          </select>
        </div>

        {role === ClusterRole.INHERITED && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
              Financially Rolls Up Under *
            </label>
            <select
              className={inputCls}
              value={parentMemberId}
              onChange={(e) => setParentMemberId(e.target.value)}
              required
            >
              <option value="">Select a Family Head / Owner…</option>
              {parentCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              All expenses and settlements for this dependent will automatically fold into the selected Head's ledger.
            </p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !name.trim() || (role === ClusterRole.INHERITED && !parentMemberId)}
            className="w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
