import React, { useState, useEffect } from 'react';
import { NotificationDto } from '@clustro/shared';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

interface NotificationsDrawerProps {
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <Modal title="Notifications" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity Feed</p>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllRead}
              className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-700" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Bell className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-600">No new notifications</p>
            <p className="mt-0.5">You are completely up to date.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border text-xs transition-all ${
                  n.isRead ? 'bg-white border-stone-200 text-slate-600' : 'bg-brand-50/70 border-brand-200 text-slate-900 font-medium'
                }`}
              >
                <p className="font-bold text-slate-900">{n.title}</p>
                <p className="mt-0.5">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
