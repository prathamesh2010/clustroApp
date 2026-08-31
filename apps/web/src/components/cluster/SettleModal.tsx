import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  SettlementSummaryDto,
  PaymentRecordDto,
  PaymentMethod,
  fmtMoney,
} from '@clustro/shared';
import { api } from '../../services/api';
import { ChevronRight, CheckCircle2, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettleModalProps {
  clusterId: string;
  currency: string;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export const SettleModal: React.FC<SettleModalProps> = ({
  clusterId,
  currency,
  onClose,
  onPaymentRecorded,
}) => {
  const [summary, setSummary] = useState<SettlementSummaryDto | null>(null);
  const [pastPayments, setPastPayments] = useState<PaymentRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'history'>('suggestions');

  // Record payment form state
  const [recordingTx, setRecordingTx] = useState<{ fromId: string; toId: string; fromName: string; toName: string; amount: number } | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [payNote, setPayNote] = useState('');
  const [recording, setRecording] = useState(false);

  const fetchSettlementData = async () => {
    try {
      const [sumRes, payRes] = await Promise.all([
        api.get(`/clusters/${clusterId}/settlements/summary`),
        api.get(`/clusters/${clusterId}/settlements/payments`),
      ]);
      setSummary(sumRes.data);
      setPastPayments(payRes.data);
    } catch (e) {
      console.error('Failed to load settlement data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlementData();
  }, [clusterId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingTx) return;

    setRecording(true);
    try {
      await api.post(`/clusters/${clusterId}/settlements/payments`, {
        fromMemberId: recordingTx.fromId,
        toMemberId: recordingTx.toId,
        amount: recordingTx.amount,
        paymentMethod: payMethod,
        note: payNote.trim() || undefined,
      });

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setRecordingTx(null);
      await fetchSettlementData();
      if (onPaymentRecorded) onPaymentRecorded();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecording(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  return (
    <Modal title="Settle Up & Ledger Balances" onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
        </div>
      ) : !summary ? (
        <p className="text-center text-sm text-slate-500 py-8">Unable to calculate balances.</p>
      ) : (
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'suggestions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Suggested Payments ({summary.transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Payment History ({pastPayments.length})
            </button>
          </div>

          {activeTab === 'suggestions' && (
            <>
              {/* Member Balances List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Net Balance per Member / Family Head
                </p>
                <div className="grid gap-2">
                  {summary.balances.map((b) => (
                    <div
                      key={b.memberId}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80 text-sm"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{b.displayName}</span>
                          {b.rollupCount && b.rollupCount > 0 ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              + {b.rollupCount} dependent{b.rollupCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                        </div>
                        {b.rollupNames && b.rollupNames.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Includes: {b.rollupNames.join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        {b.net > 0.5 ? (
                          <span className="font-bold text-brand-700">
                            gets back {fmtMoney(b.net, currency)}
                          </span>
                        ) : b.net < -0.5 ? (
                          <span className="font-bold text-rose-600">
                            owes {fmtMoney(-b.net, currency)}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400">Settled</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Min Cash Flow Suggested Payments */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Suggested Direct Payments (Minimal Graph)
                </p>

                {summary.transactions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 text-center text-brand-900 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-700" />
                    <span className="text-sm font-bold">All balances are completely settled up!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.transactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-stone-200 shadow-xs hover:border-brand-300 transition-all"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <span>{tx.fromName}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span>{tx.toName}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-brand-700 text-sm">
                            {fmtMoney(tx.amount, currency)}
                          </span>
                          <button
                            onClick={() =>
                              setRecordingTx({
                                fromId: tx.fromMemberId,
                                toId: tx.toMemberId,
                                fromName: tx.fromName,
                                toName: tx.toName,
                                amount: tx.amount,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Record Paid
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recorded Settlement Transactions
              </p>
              {pastPayments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {pastPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {p.fromMember?.displayName} paid {p.toMember?.displayName}
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          Method: {p.paymentMethod} {p.note ? `· "${p.note}"` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-700">{fmtMoney(p.amount, p.currency)}</p>
                        <span className="text-[10px] text-brand-800 font-semibold uppercase">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Record Payment Sub-Modal / Drawer */}
          {recordingTx && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
                <h4 className="font-display text-lg font-bold text-slate-900">
                  Record Settlement Payment
                </h4>
                <p className="text-xs text-slate-500">
                  Confirm that <span className="font-bold text-slate-800">{recordingTx.fromName}</span> paid{' '}
                  <span className="font-bold text-slate-800">{recordingTx.toName}</span>{' '}
                  <span className="font-bold text-brand-700">{fmtMoney(recordingTx.amount, currency)}</span>.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    className={inputCls}
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  >
                    <option value={PaymentMethod.UPI}>UPI (Google Pay, PhonePe, Paytm)</option>
                    <option value={PaymentMethod.CASH}>Cash in Hand</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (IMPS/NEFT)</option>
                    <option value={PaymentMethod.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Note / Reference (Optional)
                  </label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Settled via GPay"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRecordingTx(null)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold text-slate-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={recording}
                    onClick={handleRecordPayment}
                    className="flex-1 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-sm font-bold shadow-md shadow-brand-900/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
