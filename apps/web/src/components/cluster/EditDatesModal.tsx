import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Loader2 } from 'lucide-react';

interface EditDatesModalProps {
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  onClose: () => void;
  onSave: (data: { startDate?: string; endDate?: string }) => Promise<void>;
}

export const EditDatesModal: React.FC<EditDatesModalProps> = ({
  initialStartDate,
  initialEndDate,
  onClose,
  onSave,
}) => {
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } catch (e) {
      alert('Failed to update cluster dates');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Edit Cluster Dates" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="flex gap-2 pt-2">
          {endDate && (
            <button
              type="button"
              onClick={() => setEndDate('')}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-slate-500 hover:bg-stone-50 transition-colors"
            >
              Clear End Date
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Dates'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
