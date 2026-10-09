import React, { useEffect, useState } from 'react';
import { BookingPushNotification, subscribeBookingNotifications } from '../services/fcmService';
import {
  CheckCircle2,
  UserCheck,
  Navigation,
  PlayCircle,
  Award,
  XCircle,
  Bell,
  X,
  ChevronRight
} from 'lucide-react';

interface Props {
  onOpenBooking?: (bookingId?: string) => void;
}

export const NotificationBanner: React.FC<Props> = ({ onOpenBooking }) => {
  const [notification, setNotification] = useState<BookingPushNotification | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeBookingNotifications((notif) => {
      setNotification(notif);
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setNotification((current) => (current?.id === notif.id ? null : current));
      }, 6000);
      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!notification) return null;

  const getEventIcon = () => {
    switch (notification.eventType) {
      case 'BOOKING_CONFIRMED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'PARTNER_ASSIGNED':
        return <UserCheck className="w-5 h-5 text-sky-400 shrink-0" />;
      case 'PARTNER_ON_THE_WAY':
        return <Navigation className="w-5 h-5 text-indigo-400 shrink-0 animate-bounce" />;
      case 'SERVICE_STARTED':
        return <PlayCircle className="w-5 h-5 text-teal-400 shrink-0" />;
      case 'SERVICE_COMPLETED':
        return <Award className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'BOOKING_CANCELLED':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-teal-400 shrink-0" />;
    }
  };

  const getEventBadge = () => {
    switch (notification.eventType) {
      case 'BOOKING_CONFIRMED':
        return 'Confirmed';
      case 'PARTNER_ASSIGNED':
        return 'Partner Assigned';
      case 'PARTNER_ON_THE_WAY':
        return 'On The Way';
      case 'SERVICE_STARTED':
        return 'Started';
      case 'SERVICE_COMPLETED':
        return 'Completed';
      case 'BOOKING_CANCELLED':
        return 'Cancelled';
      default:
        return 'Update';
    }
  };

  return (
    <div className="absolute top-4 left-3 right-3 z-50 animate-in slide-in-from-top duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-teal-500/40 flex items-start justify-between space-x-3">
        <div className="flex items-start space-x-2.5 overflow-hidden">
          <div className="mt-0.5">{getEventIcon()}</div>
          <div className="truncate">
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md border border-teal-500/30">
                {getEventBadge()}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {notification.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
              {notification.body}
            </p>

            {notification.bookingId && onOpenBooking && (
              <button
                type="button"
                onClick={() => {
                  onOpenBooking(notification.bookingId);
                  setNotification(null);
                }}
                className="mt-1.5 text-[10px] font-bold text-teal-400 hover:text-teal-300 flex items-center space-x-0.5 transition-colors"
              >
                <span>View Booking Details</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setNotification(null)}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
