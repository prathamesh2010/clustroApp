import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  ClusterMemberDto,
  ActivityDto,
  SplitType,
  ActivityCategory,
  ClusterRole,
  fmtMoney,
} from '@clustro/shared';
import { ImagePlus, Check, X, Loader2, Camera } from 'lucide-react';

interface AddExpenseModalProps {
  clusterId: string;
  currency: string;
  members: ClusterMemberDto[];
  activities?: ActivityDto[];
  onClose: () => void;
  onAdd: (formData: FormData) => Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  currency,
  members,
  activities = [],
  onClose,
  onAdd,
}) => {
  const splittable = members.filter((m) => m.role !== ClusterRole.INHERITED);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(ActivityCategory.FOOD);
  const [paidByMemberId, setPaidBy] = useState(members[0]?.id || '');
  const [splitType, setSplitType] = useState<SplitType>(SplitType.EQUAL);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(splittable.map((m) => m.id));
  const [activityId, setActivityId] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSplit = (id: string) => {
    setSplitMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setReceiptFiles((prev) => [...prev, ...filesArray]);

      const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (idx: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!paidByMemberId) {
      setError('Please select who paid');
      return;
    }
    if (splitType === SplitType.EQUAL && splitMemberIds.length === 0) {
      setError('Select at least one member to split with');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('amount', String(numAmount));
      fd.append('currency', currency);
      fd.append('description', description.trim());
      fd.append('category', category);
      fd.append('paidByMemberId', paidByMemberId);
      fd.append('splitType', splitType);
      fd.append('splitMemberIds', JSON.stringify(splitMemberIds));

      if (activityId) fd.append('activityId', activityId);
      if (notes.trim()) fd.append('notes', notes.trim());

      receiptFiles.forEach((file) => {
        fd.append('receipts', file);
      });

      await onAdd(fd);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Add Expense" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Amount ({currency === 'INR' ? '₹' : currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className={`${inputCls} text-lg font-bold text-slate-900`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value={ActivityCategory.FOOD}>Food & Dining</option>
              <option value={ActivityCategory.STAY}>Stay & Accommodation</option>
              <option value={ActivityCategory.TRAVEL}>Travel & Transport</option>
              <option value={ActivityCategory.SHOPPING}>Shopping & Groceries</option>
              <option value={ActivityCategory.EVENT}>Event & Party</option>
              <option value={ActivityCategory.ENTERTAINMENT}>Entertainment</option>
              <option value={ActivityCategory.MAINTENANCE}>Society / Maintenance</option>
              <option value={ActivityCategory.OTHER}>Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            What was it for? *
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Dinner buffet, Airport cab, Groceries, Villa booking"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Paid by *
          </label>
          <select
            className={inputCls}
            value={paidByMemberId}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} {m.role === ClusterRole.INHERITED ? '(Dependent - rolls up to Head)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activities.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Tag to Activity / Day (Optional)
            </label>
            <select
              className={inputCls}
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
            >
              <option value="">No specific activity</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.dayNumber ? `Day ${a.dayNumber}: ` : ''}{a.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Splitting Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Split Between ({splitMemberIds.length} of {splittable.length} members)
            </label>
            {amount && splitMemberIds.length > 0 && (
              <span className="text-xs font-bold text-brand-700">
                {fmtMoney(Number(amount) / splitMemberIds.length, currency)} / person
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {splittable.map((m) => {
              const isIncluded = splitMemberIds.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleSplit(m.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isIncluded
                      ? 'bg-brand-700 text-white border-brand-700 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  {isIncluded && <Check className="w-3.5 h-3.5" />}
                  {m.displayName}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Inherited members do not appear here directly — their share is represented under their respective head.
          </p>
        </div>

        {/* Receipt / Proof Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Proof / Receipt Photos (Optional)
          </label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 hover:border-brand-500 rounded-2xl py-3.5 px-4 text-sm font-semibold text-slate-600 cursor-pointer bg-stone-50/60 hover:bg-stone-50 transition-all">
            <Camera className="w-4 h-4 text-brand-700" />
            <span>Attach Receipt Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {previews.map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 shadow-xs">
                  <img src={url} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || !amount || !description.trim() || splitMemberIds.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
