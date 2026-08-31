import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { User, ShieldCheck, CreditCard, Sparkles, Check, Loader2 } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [defaultCurrency, setDefaultCurrency] = useState(user?.defaultCurrency || 'INR');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      await api.patch('/users/profile', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        defaultCurrency,
      });
      await refreshProfile();
      setSavedMsg('Profile updated successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Account & Preferences" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        {savedMsg && (
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-brand-700" />
            {savedMsg}
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-stone-100/70 border border-stone-200">
          <div className="w-12 h-12 rounded-2xl bg-brand-700 text-white flex items-center justify-center text-lg font-bold">
            {user?.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{user?.name}</h4>
            <p className="text-xs text-slate-500">@{user?.username} · {user?.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Full Name
          </label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Phone Number
          </label>
          <input
            className={inputCls}
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Default Currency
          </label>
          <select
            className={inputCls}
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
          >
            <option value="INR">INR (₹) - Indian Rupee</option>
            <option value="USD">USD ($) - US Dollar</option>
            <option value="EUR">EUR (€) - Euro</option>
            <option value="GBP">GBP (£) - British Pound</option>
            <option value="AED">AED (د.إ) - UAE Dirham</option>
          </select>
        </div>

        {/* Subscription Entitlement Card */}
        <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-700" />
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Plan Tier: {user?.subscriptionTier || 'FREE'}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-700 text-white">
              Active
            </span>
          </div>
          <p className="text-[11px] text-brand-800 leading-relaxed">
            Unlimited clusters, real-time shared ledgers, receipt attachments, and CSV exports enabled.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
