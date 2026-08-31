import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Plus, IndianRupee, MessageCircle, Download,
  LogOut, ArrowLeft, ImagePlus, Check, X, Clock, CheckCircle2,
  Home as HomeIcon, History, Award, ChevronRight, Send, Wallet,
  AlertCircle, Circle, PlaneTakeoff, Building2, PartyPopper, Landmark,
  Loader2, RefreshCw
} from 'lucide-react';

/* ---------------------------------------------------------------
   STORAGE HELPERS
   All cluster / expense / message / user data is "shared" so every
   person who opens this artifact can see the same clusters, the way
   real family members would. "Login" here is just a name you type —
   there is no password. See the note in the app footer + the
   walkthrough in chat for why, and what a real build needs instead.
------------------------------------------------------------------*/
async function dbGet(key, shared, fallback) {
  try {
    const res = await window.storage.get(key, shared);
    if (!res || res.value === undefined || res.value === null) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}
async function dbSet(key, value, shared) {
  try {
    const res = await window.storage.set(key, JSON.stringify(value), shared);
    return !!res;
  } catch (e) {
    console.error('storage set failed', key, e);
    return false;
  }
}
async function dbListKeys(prefix, shared) {
  try {
    const res = await window.storage.list(prefix, shared);
    return res && res.keys ? res.keys : [];
  } catch (e) {
    return [];
  }
}
async function dbDelete(key, shared) {
  try { await window.storage.delete(key, shared); } catch (e) { /* ignore */ }
}

function uid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}
function nowISO() { return new Date().toISOString(); }
function fmtMoney(n) {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
function fmtDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}
function fmtDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return dateStr; }
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}
function dateRangeLabel(cluster) {
  if (!cluster.startDate && !cluster.endDate) return null;
  if (cluster.startDate && cluster.endDate) return `${fmtDate(cluster.startDate)} → ${fmtDate(cluster.endDate)}`;
  if (cluster.startDate) return `Started ${fmtDate(cluster.startDate)} · Ongoing`;
  return `Ends ${fmtDate(cluster.endDate)}`;
}
function dateStatusNote(cluster) {
  const today = new Date().toISOString().slice(0, 10);
  if (cluster.startDate && cluster.startDate > today && cluster.status !== 'ended') {
    const diff = daysBetween(today, cluster.startDate);
    return { text: `Starts in ${diff} day${diff === 1 ? '' : 's'}`, overdue: false };
  }
  if (!cluster.endDate) return null;
  const diff = daysBetween(today, cluster.endDate);
  if (diff < 0) return { text: `End date passed ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`, overdue: true };
  if (diff === 0) return { text: 'Ends today', overdue: false };
  return { text: `Ends in ${diff} day${diff === 1 ? '' : 's'}`, overdue: false };
}
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CLUSTER_TYPES = [
  { id: 'family', label: 'Family', icon: Users },
  { id: 'trip', label: 'Trip', icon: PlaneTakeoff },
  { id: 'friends', label: 'Friends', icon: PartyPopper },
  { id: 'society', label: 'Society / Chawl', icon: Building2 },
  { id: 'other', label: 'Other', icon: Landmark },
];
function typeMeta(id) { return CLUSTER_TYPES.find(t => t.id === id) || CLUSTER_TYPES[4]; }

const ROLE_META = {
  owner: { label: 'Owner', cls: 'bg-emerald-700 text-white' },
  head: { label: 'Head', cls: 'bg-amber-600 text-white' },
  member: { label: 'Member', cls: 'bg-slate-200 text-slate-700' },
  inherited: { label: 'Inherited', cls: 'bg-stone-300 text-stone-700' },
};

/* ---------------------------------------------------------------
   BALANCE / SETTLEMENT MATH
------------------------------------------------------------------*/
function effId(member) {
  return (member.role === 'inherited' && member.parentId) ? member.parentId : member.id;
}
function computeBalances(members, expenses) {
  const byId = {};
  members.forEach(m => { byId[m.id] = m; });
  const bal = {};
  members.filter(m => m.role !== 'inherited').forEach(m => { bal[m.id] = { paid: 0, owed: 0 }; });
  expenses.forEach(exp => {
    const payer = byId[exp.paidByMemberId];
    if (!payer) return;
    const pEff = effId(payer);
    if (!bal[pEff]) bal[pEff] = { paid: 0, owed: 0 };
    bal[pEff].paid += Number(exp.amount) || 0;
    const list = exp.splitAmong || [];
    const share = list.length ? (Number(exp.amount) || 0) / list.length : 0;
    list.forEach(mid => {
      const mm = byId[mid];
      if (!mm) return;
      const eff = effId(mm);
      if (!bal[eff]) bal[eff] = { paid: 0, owed: 0 };
      bal[eff].owed += share;
    });
  });
  return bal;
}
function computeSettlements(bal) {
  const debtors = [], creditors = [];
  Object.entries(bal).forEach(([id, b]) => {
    const net = b.paid - b.owed;
    if (net < -0.5) debtors.push({ id, amt: -net });
    else if (net > 0.5) creditors.push({ id, amt: net });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);
  const tx = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    tx.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt < 0.5) i++;
    if (creditors[j].amt < 0.5) j++;
  }
  return tx;
}

/* ---------------------------------------------------------------
   SMALL UI PIECES
------------------------------------------------------------------*/
function RoleBadge({ role, extra }) {
  const meta = ROLE_META[role] || ROLE_META.member;
  return (
    <span className={`stamp inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${meta.cls}`}>
      {meta.label}{extra ? ` · ${extra}` : ''}
    </span>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-dashed border-stone-300 rounded-2xl bg-white/60">
      <Icon className="w-8 h-8 text-stone-400 mb-3" />
      <p className="font-display text-lg text-slate-800">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs">{body}</p>
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
      <div className={`bg-white w-full ${wide ? 'sm:max-w-lg' : 'sm:max-w-md'} rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 sticky top-0 bg-white z-10">
          <h3 className="font-display text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-stone-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800 text-sm";

/* ---------------------------------------------------------------
   LOGIN
------------------------------------------------------------------*/
function LoginScreen({ onLogin, onReset, resetting }) {
  const [name, setName] = useState('');
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .stamp { transform: rotate(-3deg); }
        .ledger-edge { background-image: radial-gradient(circle, #e7e2d6 2px, transparent 2px); background-size: 10px 10px; background-position: left center; }
      `}</style>
      <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center mb-5 shadow-lg shadow-emerald-900/10 stamp">
        <IndianRupee className="w-7 h-7 text-white" />
      </div>
      <h1 className="font-display text-3xl text-slate-900 mb-1">Kunba</h1>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-xs">One shared ledger for family, trips, society or any group that splits money together.</p>
      <div className="w-full max-w-xs">
        <Field label="Your name">
          <input
            className={inputCls}
            placeholder="e.g. Meera, Ramesh, Priya…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onLogin(name.trim()); }}
          />
        </Field>
        <button
          disabled={!name.trim()}
          onClick={() => onLogin(name.trim())}
          className="w-full bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-800 transition-colors"
        >
          Continue
        </button>
        <p className="text-[11px] text-slate-400 mt-3 text-center leading-relaxed">
          Demo login only — no password. Type the exact same name again later, or the exact name a cluster owner added you as, to see shared clusters.
        </p>
      </div>
      <button
        onClick={onReset}
        disabled={resetting}
        className="mt-10 text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1"
      >
        <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} /> Reset all demo data
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   NEW CLUSTER MODAL
------------------------------------------------------------------*/
function NewClusterModal({ onClose, onCreate }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [type, setType] = useState('family');
  const [status, setStatus] = useState('live');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState('');

  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  return (
    <Modal title="Start a new cluster" onClose={onClose}>
      <Field label="Cluster name">
        <input className={inputCls} placeholder="e.g. Sharma Ghar, Goa Trip 2026, Sunrise Society" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Type">
        <div className="grid grid-cols-3 gap-2">
          {CLUSTER_TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium ${type === t.id ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 text-slate-500'}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date (optional)">
          <input type="date" className={inputCls} min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </Field>
      </div>
      {type === 'trip' && (
        <div className="flex items-center gap-1.5 -mt-2 mb-4">
          <span className="text-[11px] text-slate-400 mr-0.5">Quick pick:</span>
          {[1, 2, 3, 5, 7].map(n => (
            <button key={n} type="button" onClick={() => setEndDate(addDays(startDate, n - 1))}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${endDate === addDays(startDate, n - 1) ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 text-slate-500'}`}>
              {n} day{n > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      )}
      {!endDate && <p className="text-[11px] text-slate-400 -mt-3 mb-4">No end date — fine for an ongoing family or society. You can add one later.</p>}
      <Field label="Status">
        <div className="flex gap-2">
          {['live', 'pending'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium capitalize ${status === s ? 'border-emerald-700 bg-emerald-50 text-emerald-800' : 'border-stone-200 text-slate-500'}`}>
              {s === 'live' ? 'Live now' : 'Planning / future'}
            </button>
          ))}
        </div>
      </Field>
      <button
        disabled={!name.trim()}
        onClick={() => onCreate({ name: name.trim(), type, status, startDate, endDate: endDate || null })}
        className="w-full bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-2.5 rounded-xl mt-2"
      >
        Create cluster
      </button>
    </Modal>
  );
}

/* ---------------------------------------------------------------
   EDIT DATES MODAL
------------------------------------------------------------------*/
function EditDatesModal({ onClose, onSave, cluster }) {
  const [startDate, setStartDate] = useState(cluster.startDate || '');
  const [endDate, setEndDate] = useState(cluster.endDate || '');
  return (
    <Modal title="Edit cluster dates" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date">
          <input type="date" className={inputCls} min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        {endDate && (
          <button onClick={() => setEndDate('')} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-slate-500">
            Clear end date
          </button>
        )}
        <button
          disabled={!startDate}
          onClick={() => onSave({ startDate: startDate || null, endDate: endDate || null })}
          className="flex-1 bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-2.5 rounded-xl"
        >
          Save dates
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------
   ADD MEMBER MODAL
------------------------------------------------------------------*/
function AddMemberModal({ onClose, onAdd, members }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('member');
  const [parentId, setParentId] = useState('');
  const parentCandidates = members.filter(m => m.role !== 'inherited');
  return (
    <Modal title="Add a member" onClose={onClose}>
      <Field label="Name">
        <input className={inputCls} placeholder="e.g. Ram" value={name} onChange={e => setName(e.target.value)} />
      </Field>
      <Field label="Login name (optional — leave blank for an offline / temporary member)">
        <input className={inputCls} placeholder="Exact name they'll log in with" value={username} onChange={e => setUsername(e.target.value)} />
      </Field>
      <Field label="Role in this cluster">
        <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
          <option value="member">Member</option>
          <option value="head">Family head (pays for their own sub-family)</option>
          <option value="inherited">Inherited / dependent (expenses roll up to a head)</option>
        </select>
      </Field>
      {role === 'inherited' && (
        <Field label="Rolls up under">
          <select className={inputCls} value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">Select a head / owner…</option>
            {parentCandidates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      )}
      <button
        disabled={!name.trim() || (role === 'inherited' && !parentId)}
        onClick={() => onAdd({
          name: name.trim(),
          username: username.trim() || null,
          role,
          parentId: role === 'inherited' ? parentId : null,
        })}
        className="w-full bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-2.5 rounded-xl mt-1"
      >
        Add member
      </button>
    </Modal>
  );
}

/* ---------------------------------------------------------------
   ADD EXPENSE MODAL
------------------------------------------------------------------*/
function AddExpenseModal({ onClose, onAdd, members }) {
  const splittable = members.filter(m => m.role !== 'inherited');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidByMemberId, setPaidBy] = useState(members[0] ? members[0].id : '');
  const [splitAmong, setSplitAmong] = useState(splittable.map(m => m.id));
  const [proofImage, setProofImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const toggleSplit = (id) => {
    setSplitAmong(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setProofImage(dataUrl);
    } catch (err) { console.error(err); }
    setUploading(false);
  };

  return (
    <Modal title="Add an expense" onClose={onClose}>
      <Field label="Amount">
        <input className={inputCls} type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <Field label="What was it for">
        <input className={inputCls} placeholder="e.g. Groceries, Auto fare, Snacks" value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Paid by">
        <select className={inputCls} value={paidByMemberId} onChange={e => setPaidBy(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}{m.role === 'inherited' ? ' (inherited)' : ''}</option>)}
        </select>
      </Field>
      <Field label={`Divide between (${splitAmong.length} of ${splittable.length})`}>
        <div className="flex flex-wrap gap-2">
          {splittable.map(m => (
            <button key={m.id} onClick={() => toggleSplit(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 ${splitAmong.includes(m.id) ? 'bg-emerald-700 text-white border-emerald-700' : 'border-stone-300 text-slate-500'}`}>
              {splitAmong.includes(m.id) && <Check className="w-3 h-3" />} {m.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Inherited members don't appear here — their share always sits with their head.</p>
      </Field>
      <Field label="Proof of expense (optional)">
        <label className="flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-3 text-sm text-slate-500 cursor-pointer hover:bg-stone-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {proofImage ? 'Photo attached — tap to change' : 'Attach a photo'}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {proofImage && <img src={proofImage} alt="proof" className="mt-2 rounded-lg max-h-32 object-cover" />}
      </Field>
      <button
        disabled={!amount || Number(amount) <= 0 || !description.trim() || !paidByMemberId || splitAmong.length === 0}
        onClick={() => onAdd({ amount: Number(amount), description: description.trim(), paidByMemberId, splitAmong, proofImage })}
        className="w-full bg-emerald-700 disabled:bg-stone-300 text-white font-semibold py-2.5 rounded-xl mt-1"
      >
        Save expense
      </button>
    </Modal>
  );
}

/* ---------------------------------------------------------------
   SETTLE UP MODAL
------------------------------------------------------------------*/
function SettleModal({ onClose, members, expenses }) {
  const byId = {};
  members.forEach(m => { byId[m.id] = m; });
  const bal = computeBalances(members, expenses);
  const tx = computeSettlements(bal);
  return (
    <Modal title="Settle up" onClose={onClose}>
      <p className="text-xs text-slate-500 mb-4">Calculated from every expense and its split. Inherited members' shares are already folded into their head's balance.</p>
      <div className="space-y-2 mb-5">
        {Object.entries(bal).map(([id, b]) => {
          const net = b.paid - b.owed;
          const m = byId[id];
          if (!m) return null;
          return (
            <div key={id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-stone-50">
              <span className="text-sm font-medium text-slate-700">{m.name}</span>
              <span className={`text-sm font-semibold ${net > 0.5 ? 'text-emerald-700' : net < -0.5 ? 'text-rose-600' : 'text-slate-400'}`}>
                {net > 0.5 ? `gets back ${fmtMoney(net)}` : net < -0.5 ? `owes ${fmtMoney(-net)}` : 'settled'}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested payments</p>
      {tx.length === 0 && <p className="text-sm text-slate-400">Everyone is already settled up.</p>}
      <div className="space-y-2">
        {tx.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border border-stone-200">
            <span className="font-medium text-slate-800">{byId[t.from] ? byId[t.from].name : '—'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{byId[t.to] ? byId[t.to].name : '—'}</span>
            <span className="ml-auto font-semibold text-emerald-700">{fmtMoney(t.amount)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------
   CLUSTER SCREEN
------------------------------------------------------------------*/
function ClusterScreen({ clusterId, currentUser, onBack }) {
  const [cluster, setCluster] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditDates, setShowEditDates] = useState(false);
  const [chatText, setChatText] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const c = await dbGet('cluster:' + clusterId, true, null);
    const ex = await dbGet('expenses:' + clusterId, true, []);
    const msg = await dbGet('messages:' + clusterId, true, []);
    setCluster(c);
    setExpenses(ex);
    setMessages(msg);
    setLoading(false);
  }, [clusterId]);

  useEffect(() => { reload(); }, [reload]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-emerald-700" /></div>;
  }
  if (!cluster) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <EmptyState icon={AlertCircle} title="Cluster not found" body="It may have been reset. Head back and pick another." />
      </div>
    );
  }

  const isOwner = cluster.ownerUsername === currentUser;
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const meta = typeMeta(cluster.type);

  async function pushHistory(text, patch) {
    const updated = { ...cluster, ...(patch || {}), history: [...(cluster.history || []), { ts: nowISO(), text }] };
    await dbSet('cluster:' + clusterId, updated, true);
    return updated;
  }

  async function handleAddMember(data) {
    setSaving(true);
    const newMember = { id: uid(), name: data.name, username: data.username, isOnline: !!data.username, role: data.role, parentId: data.parentId || null };
    const historyText = data.role === 'inherited'
      ? `${data.name} added as inherited under ${(cluster.members.find(m => m.id === data.parentId) || {}).name || '—'}`
      : `${data.name} added as ${ROLE_META[data.role].label.toLowerCase()}`;
    const updated = await pushHistory(historyText, { members: [...cluster.members, newMember] });
    setCluster(updated);
    setShowAddMember(false);
    setSaving(false);
  }

  async function handleAddExpense(data) {
    setSaving(true);
    const expense = { id: uid(), ...data, createdAt: nowISO() };
    const newExpenses = [expense, ...expenses];
    await dbSet('expenses:' + clusterId, newExpenses, true);
    const payer = cluster.members.find(m => m.id === data.paidByMemberId);
    let text = `${payer ? payer.name : 'Someone'} paid ${fmtMoney(data.amount)} for "${data.description}"`;
    if (payer && payer.role === 'inherited') {
      const parent = cluster.members.find(m => m.id === payer.parentId);
      text += ` — merged into ${parent ? parent.name : 'head'}'s account (inherited)`;
    }
    const updated = await pushHistory(text);
    setCluster(updated);
    setExpenses(newExpenses);
    setShowAddExpense(false);
    setSaving(false);
  }

  async function handleSendMessage() {
    if (!chatText.trim()) return;
    const newMsgs = [...messages, { id: uid(), sender: currentUser, text: chatText.trim(), ts: nowISO() }];
    setChatText('');
    setMessages(newMsgs);
    await dbSet('messages:' + clusterId, newMsgs, true);
  }

  async function handleChangeStatus(newStatus) {
    const updated = await pushHistory(`Status changed to ${newStatus}`, { status: newStatus });
    setCluster(updated);
  }

  async function handleEditDates(data) {
    const text = data.endDate
      ? `Dates set: ${fmtDate(data.startDate)} → ${fmtDate(data.endDate)}`
      : `Start date set to ${fmtDate(data.startDate)}, no end date`;
    const updated = await pushHistory(text, data);
    setCluster(updated);
    setShowEditDates(false);
  }

  function handleDownloadCSV() {
    const byId = {};
    cluster.members.forEach(m => { byId[m.id] = m.name; });
    const rows = [['Date', 'Description', 'Paid By', 'Amount', 'Split Among']];
    expenses.forEach(e => {
      rows.push([
        fmtDateTime(e.createdAt),
        e.description,
        byId[e.paidByMemberId] || '',
        e.amount,
        (e.splitAmong || []).map(id => byId[id] || '').join('; '),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cluster.name.replace(/\s+/g, '_')}_expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-10">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        {isOwner && (
          <select
            value={cluster.status}
            onChange={e => handleChangeStatus(e.target.value)}
            className="text-xs font-medium border border-stone-200 rounded-full px-2.5 py-1 bg-white text-slate-600"
          >
            <option value="live">Live</option>
            <option value="pending">Pending</option>
            <option value="ended">Ended</option>
          </select>
        )}
        {!isOwner && (
          <span className="text-xs font-medium border border-stone-200 rounded-full px-2.5 py-1 bg-white text-slate-500 capitalize">{cluster.status}</span>
        )}
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2 mb-1">
          <meta.icon className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{meta.label}</span>
        </div>
        <h1 className="font-display text-2xl text-slate-900">{cluster.name}</h1>
        <p className="text-xs text-slate-400 mt-0.5">Owner: {cluster.ownerUsername} · Created {fmtDateTime(cluster.createdAt)}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {dateRangeLabel(cluster) ? (
            <span className="text-xs font-medium text-slate-600">{dateRangeLabel(cluster)}</span>
          ) : (
            <span className="text-xs text-slate-400 italic">No dates set</span>
          )}
          {isOwner && (
            <button onClick={() => setShowEditDates(true)} className="text-[11px] font-semibold text-emerald-700">
              {dateRangeLabel(cluster) ? 'Edit' : 'Add dates'}
            </button>
          )}
        </div>
        {dateStatusNote(cluster) && (
          <div className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${dateStatusNote(cluster).overdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
            <Clock className="w-3 h-3" /> {dateStatusNote(cluster).text}
            {dateStatusNote(cluster).overdue && isOwner && cluster.status !== 'ended' && (
              <button onClick={() => handleChangeStatus('ended')} className="underline decoration-dotted ml-1">Mark ended</button>
            )}
          </div>
        )}
      </div>

      <div className="mx-5 mt-4 rounded-3xl bg-emerald-700 text-white p-5 ledger-edge">
        <p className="text-emerald-100 text-xs uppercase tracking-wide">Total cluster expense</p>
        <p className="font-display text-4xl mt-1">{fmtMoney(total)}</p>
        <p className="text-emerald-100 text-xs mt-1">{expenses.length} entr{expenses.length === 1 ? 'y' : 'ies'} · {cluster.members.length} members</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setShowAddExpense(true)} className="flex-1 bg-white text-emerald-800 font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Add expense
          </button>
          <button onClick={() => setShowSettle(true)} className="flex-1 bg-emerald-800/60 border border-emerald-400/40 text-white font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
            <Wallet className="w-4 h-4" /> Settle up
          </button>
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Members</p>
          <button onClick={() => setShowAddMember(true)} className="text-emerald-700 text-xs font-semibold flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" /> Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cluster.members.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-white border border-stone-200">
              <span className="w-6 h-6 rounded-full bg-stone-200 text-slate-600 text-[11px] font-semibold flex items-center justify-center">{m.name.charAt(0).toUpperCase()}</span>
              <span className="text-xs font-medium text-slate-700">{m.name}</span>
              <RoleBadge role={m.role} extra={m.role === 'inherited' ? (cluster.members.find(x => x.id === m.parentId) || {}).name : (m.isOnline ? undefined : 'offline')} />
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expenses</p>
          <button onClick={handleDownloadCSV} className="text-slate-500 text-xs font-semibold flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>
        </div>
        {expenses.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No expenses yet" body="Add the first one — everyone in the cluster will see it here." />
        ) : (
          <div className="space-y-2">
            {expenses.map(e => {
              const payer = cluster.members.find(m => m.id === e.paidByMemberId);
              return (
                <div key={e.id} className="bg-white border border-stone-200 rounded-2xl p-3.5 flex gap-3">
                  {e.proofImage && <img src={e.proofImage} alt="proof" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{e.description}</p>
                      <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmtMoney(e.amount)}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Paid by {payer ? payer.name : '—'} · {fmtDateTime(e.createdAt)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Split {e.splitAmong.length} ways</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 mt-6">
        <button onClick={() => setShowHistory(s => !s)} className="w-full flex items-center justify-between py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Activity history</span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>
        {showHistory && (
          <div className="space-y-2 pb-2">
            {(cluster.history || []).slice().reverse().map((h, i) => (
              <div key={i} className="text-xs text-slate-500 border-l-2 border-stone-200 pl-3 py-0.5">
                <span className="text-slate-700">{h.text}</span><br />
                <span className="text-slate-400">{fmtDateTime(h.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-5 right-5">
        <button onClick={() => setShowChat(s => !s)} className="w-12 h-12 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {showChat && (
        <div className="fixed bottom-20 right-5 left-5 sm:left-auto sm:w-80 bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col max-h-96 z-40">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Cluster chat</p>
            <button onClick={() => setShowChat(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No messages yet. Say hi 👋</p>}
            {messages.map(m => (
              <div key={m.id} className={`max-w-[85%] ${m.sender === currentUser ? 'ml-auto text-right' : ''}`}>
                <div className={`inline-block px-3 py-1.5 rounded-2xl text-xs ${m.sender === currentUser ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-slate-700'}`}>
                  {m.text}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{m.sender} · {fmtDateTime(m.ts)}</p>
              </div>
            ))}
          </div>
          <div className="p-2.5 border-t border-stone-100 flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-full bg-stone-50 border border-stone-200 text-xs focus:outline-none"
              placeholder="Message the cluster…"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
            />
            <button onClick={handleSendMessage} className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onAdd={handleAddMember} members={cluster.members} />}
      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} onAdd={handleAddExpense} members={cluster.members} />}
      {showSettle && <SettleModal onClose={() => setShowSettle(false)} members={cluster.members} expenses={expenses} />}
      {showEditDates && <EditDatesModal onClose={() => setShowEditDates(false)} onSave={handleEditDates} cluster={cluster} />}
    </div>
  );
}

/* ---------------------------------------------------------------
   HOME SCREEN
------------------------------------------------------------------*/
function ClusterCard({ pair, onOpen }) {
  const { cluster, expenses } = pair;
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const meta = typeMeta(cluster.type);
  return (
    <button onClick={onOpen} className="w-full text-left bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-3 hover:border-emerald-300 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
        <meta.icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{cluster.name}</p>
        <p className="text-xs text-slate-400">{cluster.members.length} members · {expenses.length} entries</p>
        {dateRangeLabel(cluster) && <p className="text-[11px] text-slate-400 mt-0.5">{dateRangeLabel(cluster)}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-900">{fmtMoney(total)}</p>
        <p className="text-[10px] text-slate-400 capitalize">{cluster.status}</p>
      </div>
    </button>
  );
}

function HomeScreen({ currentUser, myClusters, onOpen, onCreate, onLogout, onRefresh }) {
  const [tab, setTab] = useState('live');
  const tabs = [
    { id: 'live', label: 'Live' },
    { id: 'pending', label: 'Pending' },
    { id: 'ended', label: 'Ended' },
    { id: 'ledger', label: 'My Ledger' },
  ];

  const filtered = myClusters.filter(p => p.cluster.status === tab);

  return (
    <div className="pb-16">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Welcome back</p>
          <h1 className="font-display text-xl text-slate-900">{currentUser}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="p-2 rounded-full hover:bg-stone-100 text-slate-500"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={onLogout} className="p-2 rounded-full hover:bg-stone-100 text-slate-500"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-3xl bg-slate-900 text-white p-5">
        <p className="text-slate-400 text-xs uppercase tracking-wide">Across all your clusters</p>
        <p className="font-display text-3xl mt-1">{fmtMoney(myClusters.reduce((s, p) => s + p.expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0), 0))}</p>
        <p className="text-slate-400 text-xs mt-1">{myClusters.length} cluster{myClusters.length === 1 ? '' : 's'} total</p>
      </div>

      <div className="px-5 mt-5 flex gap-1.5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${tab === t.id ? 'bg-emerald-700 text-white' : 'bg-white border border-stone-200 text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-2.5">
        {tab !== 'ledger' && filtered.length === 0 && (
          <EmptyState icon={Users} title={`No ${tab} clusters`} body="Start one for your family, a trip, or your society — everyone you add will see it after they log in." />
        )}
        {tab !== 'ledger' && filtered.map(p => <ClusterCard key={p.cluster.id} pair={p} onOpen={() => onOpen(p.cluster.id)} />)}

        {tab === 'ledger' && <MyLedger currentUser={currentUser} myClusters={myClusters} onOpen={onOpen} />}
      </div>

      <button
        onClick={onCreate}
        className="fixed bottom-5 right-5 bg-emerald-700 text-white rounded-full pl-4 pr-5 py-3.5 shadow-xl flex items-center gap-2 font-semibold text-sm"
      >
        <Plus className="w-4 h-4" /> New cluster
      </button>
    </div>
  );
}

function MyLedger({ currentUser, myClusters, onOpen }) {
  if (myClusters.length === 0) {
    return <EmptyState icon={History} title="Nothing here yet" body="Once you're part of a cluster, your personal spend across every group shows up here." />;
  }
  return (
    <div className="space-y-4">
      {myClusters.map(p => {
        const me = p.cluster.members.find(m => m.username === currentUser);
        if (!me) return null;
        const myEff = effId(me);
        const byId = {}; p.cluster.members.forEach(m => { byId[m.id] = m; });
        const myExpenses = p.expenses.filter(e => {
          const payer = byId[e.paidByMemberId];
          const paidByMe = payer && effId(payer) === myEff;
          const inSplit = (e.splitAmong || []).some(id => byId[id] && effId(byId[id]) === myEff);
          return paidByMe || inSplit;
        });
        const myTotal = myExpenses.reduce((s, e) => {
          const share = (e.splitAmong || []).length ? e.amount / e.splitAmong.length : 0;
          const inSplit = (e.splitAmong || []).some(id => byId[id] && effId(byId[id]) === myEff);
          return s + (inSplit ? share : 0);
        }, 0);
        return (
          <div key={p.cluster.id} className="bg-white border border-stone-200 rounded-2xl p-4">
            <button onClick={() => onOpen(p.cluster.id)} className="w-full flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-800">{p.cluster.name}</span>
              <span className="text-xs font-bold text-emerald-700">{fmtMoney(myTotal)}</span>
            </button>
            <div className="space-y-1.5">
              {myExpenses.slice(0, 4).map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate">{e.description}</span>
                  <span className="text-slate-400 flex-shrink-0 ml-2">{fmtDateTime(e.createdAt)}</span>
                </div>
              ))}
              {myExpenses.length === 0 && <p className="text-xs text-slate-400">No entries involving you yet.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   APP ROOT
------------------------------------------------------------------*/
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [myClusters, setMyClusters] = useState([]);
  const [showNewCluster, setShowNewCluster] = useState(false);
  const [booting, setBooting] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await dbGet('session', false, null);
      if (session && session.username) setCurrentUser(session.username);
      setBooting(false);
    })();
  }, []);

  const loadClusters = useCallback(async (user) => {
    if (!user) return;
    const keys = await dbListKeys('cluster:', true);
    const pairs = [];
    for (const k of keys) {
      const c = await dbGet(k, true, null);
      if (!c) continue;
      const isMember = c.ownerUsername === user || c.members.some(m => m.username === user);
      if (!isMember) continue;
      const ex = await dbGet('expenses:' + c.id, true, []);
      pairs.push({ cluster: c, expenses: ex });
    }
    pairs.sort((a, b) => (b.cluster.createdAt || '').localeCompare(a.cluster.createdAt || ''));
    setMyClusters(pairs);
  }, []);

  useEffect(() => { if (currentUser) loadClusters(currentUser); }, [currentUser, loadClusters]);

  async function handleLogin(name) {
    await dbSet('session', { username: name }, false);
    const users = await dbGet('users-list', true, []);
    if (!users.find(u => u.username === name)) {
      await dbSet('users-list', [...users, { username: name, joinedAt: nowISO() }], true);
    }
    setCurrentUser(name);
  }

  async function handleLogout() {
    await dbSet('session', {}, false);
    setCurrentUser(null);
    setScreen('home');
  }

  async function handleCreateCluster(data) {
    const id = uid();
    const owner = { id: uid(), name: currentUser, username: currentUser, isOnline: true, role: 'owner', parentId: null };
    const cluster = {
      id, name: data.name, type: data.type, status: data.status,
      startDate: data.startDate || null, endDate: data.endDate || null,
      ownerUsername: currentUser, createdAt: nowISO(),
      members: [owner],
      history: [{ ts: nowISO(), text: `Cluster created by ${currentUser}` }],
    };
    await dbSet('cluster:' + id, cluster, true);
    await dbSet('expenses:' + id, [], true);
    await dbSet('messages:' + id, [], true);
    setShowNewCluster(false);
    await loadClusters(currentUser);
    setActiveClusterId(id);
    setScreen('cluster');
  }

  async function handleReset() {
    setResetting(true);
    for (const prefix of ['cluster:', 'expenses:', 'messages:']) {
      const keys = await dbListKeys(prefix, true);
      for (const k of keys) await dbDelete(k, true);
    }
    await dbDelete('users-list', true);
    setMyClusters([]);
    setResetting(false);
  }

  if (booting) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-6 h-6 animate-spin text-emerald-700" /></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 font-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .stamp { transform: rotate(-3deg); }
        .ledger-edge { box-shadow: inset 3px 0 0 0 rgba(255,255,255,0.15); }
      `}</style>
      {!currentUser && <LoginScreen onLogin={handleLogin} onReset={handleReset} resetting={resetting} />}
      {currentUser && screen === 'home' && (
        <HomeScreen
          currentUser={currentUser}
          myClusters={myClusters}
          onOpen={(id) => { setActiveClusterId(id); setScreen('cluster'); }}
          onCreate={() => setShowNewCluster(true)}
          onLogout={handleLogout}
          onRefresh={() => loadClusters(currentUser)}
        />
      )}
      {currentUser && screen === 'cluster' && activeClusterId && (
        <ClusterScreen
          clusterId={activeClusterId}
          currentUser={currentUser}
          onBack={() => { setScreen('home'); loadClusters(currentUser); }}
        />
      )}
      {showNewCluster && <NewClusterModal onClose={() => setShowNewCluster(false)} onCreate={handleCreateCluster} />}
    </div>
  );
}
