import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  IndianRupee,
  ShieldCheck,
  Users,
  PlaneTakeoff,
  Building2,
  Lock,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(emailOrUsername, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !regPassword) return;
    setLoading(true);
    setError('');
    try {
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password: regPassword,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username: string) => {
    setLoading(true);
    setError('');
    try {
      await login(username, 'password123');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-700 text-slate-800 text-sm transition-all";

  const TEST_ACCOUNTS = [
    { name: 'Meera Sharma', username: 'meera', role: 'Mom / Owner of Sharma Ghar' },
    { name: 'Ramesh Sharma', username: 'ramesh', role: 'Dad / Head of Family & Goa Trip' },
    { name: 'Priya Patel', username: 'priya', role: 'Sunrise Society Secretary' },
    { name: 'Aravind Rao', username: 'aravind', role: 'Goa Trip & Society Member' },
    { name: 'Sneha Kulkarni', username: 'sneha', role: 'Diwali Party Host' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 flex flex-col">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-stone-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-900/10 stamp">
            <IndianRupee className="w-5 h-5" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Clustro<span className="text-brand-700 text-sm font-sans font-semibold">.app</span>
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Private Group Ledgers & Activity OS
        </span>
      </header>

      {/* Hero Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Col: Pitch & Value Prop */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-700" />
            <span>PostgreSQL-Powered Enterprise Financial Engine</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            One shared ledger for <span className="text-brand-700 italic">family</span>, trips, and groups that split money together.
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-xl">
            Clustro.app provides private clusters, hierarchical family-head rollups, precision debt minimization, receipt storage, and real-time chat — all backed by an authoritative PostgreSQL source of truth.
          </p>

          {/* Key Value Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
              <Users className="w-5 h-5 text-brand-700 mb-1.5" />
              <h4 className="text-xs font-bold text-slate-900">Hierarchical Rollups</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Family heads settle for dependent children smoothly.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-sky-600 mb-1.5" />
              <h4 className="text-xs font-bold text-slate-900">Private & Isolated</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Cross-cluster data stays strictly private to your account.</p>
            </div>
          </div>

          {/* 1-Click Test Login Accounts */}
          <div className="pt-4 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ⚡ Quick 1-Click Demo Accounts (Pre-Seeded with Real Data)
            </p>
            <div className="flex flex-wrap gap-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(acc.username)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 border border-stone-200 hover:border-brand-300 text-left transition-all shadow-2xs group cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-brand-800">
                    {acc.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{acc.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Auth Card */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex border-b border-stone-100 pb-3">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all ${
                !isRegister
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all ${
                isRegister
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email or Username
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. meera or meera@clustro.app"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !emailOrUsername || !password}
                className="w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue to Clustro'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Rohan Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. rohan_sharma"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="rohan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !name || !username || !email || !regPassword}
                className="w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register & Create Account'}
              </button>
            </form>
          )}

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            By signing in, your data is securely stored in PostgreSQL with full audit trails.
          </p>
        </div>
      </main>
    </div>
  );
};
