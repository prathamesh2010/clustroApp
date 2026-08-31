import React, { useState } from 'react';
import { ActivityDto, ActivityCategory, fmtMoney } from '@clustro/shared';
import { Plus, Calendar, Compass, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface ActivitiesViewProps {
  clusterId: string;
  currency: string;
  activities: ActivityDto[];
  onAddActivity: (data: { title: string; category: ActivityCategory; date: string; dayNumber?: number }) => Promise<void>;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  clusterId,
  currency,
  activities,
  onAddActivity,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ActivityCategory>(ActivityCategory.TRAVEL);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dayNumber, setDayNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onAddActivity({
        title: title.trim(),
        category,
        date,
        dayNumber: dayNumber ? parseInt(dayNumber, 10) : undefined,
      });
      setShowAdd(false);
      setTitle('');
      setDayNumber('');
    } catch (e) {
      alert('Failed to add activity');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Trip Itinerary & Activities ({activities.length})
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Day / Activity
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 text-center text-slate-400 text-xs">
          <Compass className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
          <p className="font-semibold text-slate-600">No activities added yet.</p>
          <p className="mt-0.5">Organize multi-day trips by adding Day 1, Day 2, or specific events.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {act.dayNumber ? `D${act.dayNumber}` : 'Act'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{act.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {act.date} · {act.category} · {act.expenseCount || 0} expenses
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400 font-semibold uppercase">Total</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {fmtMoney(act.totalExpense || 0, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Activity / Trip Day" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Activity Title *
              </label>
              <input
                className={inputCls}
                placeholder="e.g. Day 1: Travel & Resort Check-in, Baga Beach Water Sports"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Day Number (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 1, 2, 3"
                  className={inputCls}
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
              >
                <option value={ActivityCategory.TRAVEL}>Travel</option>
                <option value={ActivityCategory.STAY}>Stay</option>
                <option value={ActivityCategory.FOOD}>Food & Dining</option>
                <option value={ActivityCategory.SHOPPING}>Shopping</option>
                <option value={ActivityCategory.EVENT}>Event</option>
                <option value={ActivityCategory.ENTERTAINMENT}>Entertainment</option>
                <option value={ActivityCategory.OTHER}>Other</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="w-full py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Activity'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
