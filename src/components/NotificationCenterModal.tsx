import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchCustomerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeNotificationCenter
} from '../services/fcmService';
import { CustomerNotificationItem } from '../types/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  X,
  CheckCheck,
  ChevronRight,
  Clock
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking?: (bookingId: string) => void;
}

export const NotificationCenterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectBooking
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchCustomerNotifications(user?.id || 'local');
      setNotifications(items);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
    const unsub = subscribeNotificationCenter(() => {
      loadNotifications();
    });
    return unsub;
  }, [isOpen, loadNotifications]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(user?.id);
    await loadNotifications();
  };

  const handleTapNotification = async (item: CustomerNotificationItem) => {
    if (!item.is_read) {
      await markNotificationAsRead(item.id, user?.id);
    }
    if (item.booking_id && onSelectBooking) {
      onSelectBooking(item.booking_id);
      onClose();
    } else {
      await loadNotifications();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88dvh] text-slate-900">
        {/* Header */}
        <div className="bg-[#0F766E] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold leading-tight">Notifications</h2>
              <p className="text-[11px] text-teal-100">
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'Up to date'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold rounded-xl flex items-center space-x-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50">
          {loading ? (
            <div className="space-y-2">
              <div className="h-16 bg-slate-200 rounded-2xl animate-pulse" />
              <div className="h-16 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center my-4">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No new notifications.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Real-time alerts for agent matching, service updates, and invoices will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleTapNotification(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  item.is_read
                    ? 'bg-white border-slate-200 text-slate-700'
                    : 'bg-teal-50/70 border-teal-300 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#0F766E] shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{item.body}</p>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                {item.booking_id && (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
