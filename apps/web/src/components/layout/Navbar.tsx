import React from 'react';
import { IndianRupee, Bell, User as UserIcon, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  onOpenProfile,
  onRefresh,
  refreshing,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 safe-top">
      <div className="max-w-3xl mx-auto px-4 h-15 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-900/10 stamp">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              Clustro<span className="text-brand-700 text-sm font-sans font-semibold">.app</span>
            </span>
          </div>
        </div>

        {/* User & Actions */}
        {user && (
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 rounded-full hover:bg-stone-100 text-slate-500 hover:text-slate-800 transition-colors"
                title="Refresh cluster data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-700' : ''}`} />
              </button>
            )}

            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-full hover:bg-stone-100 text-slate-500 hover:text-slate-800 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors text-xs font-semibold text-slate-700"
            >
              <div className="w-5 h-5 rounded-full bg-brand-700 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {user.name.charAt(0)}
              </div>
              <span className="truncate max-w-[90px]">{user.name.split(' ')[0]}</span>
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
