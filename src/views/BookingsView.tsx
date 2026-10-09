import React, { useState, useEffect, useCallback } from 'react';
import { DoorblyBooking } from '../types/supabase';
import {
  fetchCustomerBookings,
  normalizeStatus,
  getStatusStepIndex,
  getEffectiveCustomerId,
  cancelCustomerBooking
} from '../services/bookingService';
import { getBookingStartPin } from '../services/rapidoEngine';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { dispatchBookingNotification } from '../services/fcmService';
import {
  Calendar,
  MapPin,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  X,
  Layers,
  ReceiptText,
  UserCheck,
  Navigation,
  ShieldAlert,
  MessageSquare,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { TaxInvoiceModal } from '../components/TaxInvoiceModal';
import { AgentLiveTrackerModal } from '../components/AgentLiveTrackerModal';
import { SafetyToolkitModal } from '../components/SafetyToolkitModal';

interface Props {
  onNavigateTab: (tab: 'home' | 'services' | 'bookings' | 'profile') => void;
  onOpenAuth: () => void;
}

const CANCELLATION_REASONS = [
  'Booked by mistake / Change of plans',
  'Need to reschedule for another time',
  'Agent is taking too long to get assigned',
  'Found an alternative service',
  'Incorrect address or contact details',
  'Other reason'
];

export const BookingsView: React.FC<Props> = ({
  onNavigateTab
}) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DoorblyBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [loading, setLoading] = useState(true);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<DoorblyBooking | null>(null);
  const [liveTrackedBooking, setLiveTrackedBooking] = useState<DoorblyBooking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<DoorblyBooking | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  // Cancel booking state
  const [bookingToCancel, setBookingToCancel] = useState<DoorblyBooking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customCancelNote, setCustomCancelNote] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const effectiveCustomerId = getEffectiveCustomerId(user?.id);

  const loadBookings = useCallback(async () => {
    try {
      const data = await fetchCustomerBookings(effectiveCustomerId);
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveCustomerId]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    loadBookings();

    const supabase = getSupabase();
    if (!supabase) return;

    const handleStatusUpdateNotification = (payload: any) => {
      const newRow = payload.new;
      const oldRow = payload.old;
      if (!newRow) return;

      const rawStatus = (newRow.status || '').toLowerCase();
      const serviceName = newRow.service_name_snapshot || 'Doorbly Service';
      const bookingId = newRow.id;

      if (payload.eventType === 'INSERT') {
        dispatchBookingNotification({
          eventType: 'BOOKING_CONFIRMED',
          bookingId,
          serviceName,
          title: 'Booking Confirmed',
          body: `Your booking for ${serviceName} is confirmed.`
        });
      } else if (payload.eventType === 'UPDATE' && newRow.status !== oldRow?.status) {
        if (rawStatus.includes('cancel')) {
          dispatchBookingNotification({
            eventType: 'BOOKING_CANCELLED',
            bookingId,
            serviceName,
            title: 'Booking Cancelled',
            body: `Your booking for ${serviceName} has been cancelled.`
          });
        } else if (rawStatus.includes('complete')) {
          dispatchBookingNotification({
            eventType: 'SERVICE_COMPLETED',
            bookingId,
            serviceName,
            title: 'Service Completed',
            body: `Your doorstep ${serviceName} is complete. Please verify and settle payment.`
          });
        } else if (rawStatus.includes('start')) {
          dispatchBookingNotification({
            eventType: 'SERVICE_STARTED',
            bookingId,
            serviceName,
            title: 'Service Started',
            body: `Our Agent has commenced your ${serviceName}.`
          });
        } else if (rawStatus.includes('way') || rawStatus.includes('route')) {
          dispatchBookingNotification({
            eventType: 'PARTNER_ON_THE_WAY',
            bookingId,
            serviceName,
            title: 'Agent On The Way',
            body: `Your Doorbly Agent is heading to your doorstep for ${serviceName}.`
          });
        } else if (rawStatus.includes('partner') || rawStatus.includes('assign') || rawStatus.includes('accept')) {
          dispatchBookingNotification({
            eventType: 'PARTNER_ASSIGNED',
            bookingId,
            serviceName,
            title: 'Agent Assigned',
            body: `A verified Doorbly Agent has been assigned to your ${serviceName}.`
          });
        }
      }
    };

    const channel = supabase
      .channel(`realtime-doorbly-bookings-${effectiveCustomerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'doorbly_bookings',
          filter: `customer_id=eq.${effectiveCustomerId}`
        },
        (payload) => {
          loadBookings();
          handleStatusUpdateNotification(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${effectiveCustomerId}`
        },
        (payload) => {
          loadBookings();
          handleStatusUpdateNotification(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveCustomerId, loadBookings]);

  const activeBookings = bookings.filter((b) => {
    const s = normalizeStatus(b.status);
    return s !== 'Completed' && s !== 'Cancelled';
  });

  const completedBookings = bookings.filter((b) => {
    const s = normalizeStatus(b.status);
    return s === 'Completed';
  });

  const cancelledBookings = bookings.filter((b) => {
    const s = normalizeStatus(b.status);
    return s === 'Cancelled';
  });

  const displayedBookings =
    activeTab === 'active'
      ? activeBookings
      : activeTab === 'completed'
      ? completedBookings
      : cancelledBookings;

  const getStatusLabel = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case 'Pending':
        return <span className="text-amber-700 font-bold text-[11px]">Finding Agent</span>;
      case 'Partner Accepted':
      case 'Partner Assigned':
        return <span className="text-sky-700 font-bold text-[11px]">Agent Assigned</span>;
      case 'Partner Arrived':
      case 'On The Way':
        return <span className="text-indigo-700 font-bold text-[11px]">Agent On The Way</span>;
      case 'Started':
        return <span className="text-teal-700 font-bold text-[11px]">Service In Progress</span>;
      case 'Completed':
        return <span className="text-emerald-700 font-bold text-[11px]">Completed</span>;
      case 'Cancelled':
        return <span className="text-rose-700 font-bold text-[11px]">Cancelled</span>;
      default:
        return <span className="text-slate-700 font-bold text-[11px]">{rawStatus}</span>;
    }
  };

  const firstActiveBooking = activeBookings[0] || null;
  const firstActiveSummary = firstActiveBooking
    ? {
        id: firstActiveBooking.id,
        serviceName: firstActiveBooking.service_name_snapshot,
        agentName: firstActiveBooking.partner_name || null,
        startPin: getBookingStartPin(firstActiveBooking.id),
        address: firstActiveBooking.address
      }
    : null;

  const openCancelPrompt = (booking: DoorblyBooking) => {
    setCancelReason(CANCELLATION_REASONS[0]);
    setCustomCancelNote('');
    setCancelError(null);
    setBookingToCancel(booking);
  };

  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel || cancelling) return;
    setCancelling(true);
    setCancelError(null);

    const finalReason =
      cancelReason === 'Other reason' && customCancelNote.trim()
        ? customCancelNote.trim()
        : cancelReason;

    const wasPaid =
      (bookingToCancel.payment_status || '').toUpperCase() === 'PAID' ||
      (bookingToCancel.payment_status || '').toUpperCase() === 'PAYMENT_COMPLETED';

    const result = await cancelCustomerBooking(
      bookingToCancel.id,
      effectiveCustomerId,
      finalReason,
      wasPaid
    );

    setCancelling(false);

    if (!result.success) {
      setCancelError(result.error || 'Could not cancel booking. Please try again.');
      return;
    }

    setBookingToCancel(null);
    setSelectedBookingDetails(null);
    setLiveTrackedBooking(null);
    await loadBookings();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-[#0F766E] text-white px-5 pt-4 pb-5 rounded-b-3xl shadow-xs shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">My Bookings</h1>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Live Agent tracker · 4-Digit Start PIN · Chat
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowSafetyModal(true)}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
              title="24x7 Safety & Emergency SOS"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadBookings();
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl transition-all cursor-pointer"
              title="Refresh Bookings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabs: Active, Completed, Cancelled */}
        <div className="grid grid-cols-3 p-1 bg-black/15 rounded-2xl text-xs font-semibold mt-3.5">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'active' ? 'bg-white text-teal-900 shadow-xs font-bold' : 'text-teal-100 hover:text-white'
            }`}
          >
            Active ({activeBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'completed' ? 'bg-white text-teal-900 shadow-xs font-bold' : 'text-teal-100 hover:text-white'
            }`}
          >
            Completed ({completedBookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cancelled')}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'cancelled' ? 'bg-white text-teal-900 shadow-xs font-bold' : 'text-teal-100 hover:text-white'
            }`}
          >
            Cancelled ({cancelledBookings.length})
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="px-5 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center my-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {activeTab === 'active'
                ? 'No active Agent bookings.'
                : activeTab === 'completed'
                ? 'No completed bookings yet.'
                : 'No cancelled bookings.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              {activeTab === 'active'
                ? 'Book any doorstep service to get a verified Agent and 4-digit Start PIN.'
                : 'Past bookings will appear here after service completion.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('services')}
              className="mt-4 px-5 py-2.5 bg-[#0F766E] text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition-colors shadow-xs inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Book a Doorstep Service</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedBookings.map((b) => {
              const stepIndex = getStatusStepIndex(b.status);
              const isCancelled = normalizeStatus(b.status) === 'Cancelled';
              const isCompleted = normalizeStatus(b.status) === 'Completed';
              const startPin = getBookingStartPin(b.id);
              const hasAssignedAgent = Boolean(b.partner_name || b.partner_id);

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-teal-500/80 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setSelectedBookingDetails(b)}
                    className="p-4 border-b border-slate-100 flex items-start justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5 text-[11px]">
                        <span className="font-mono text-slate-400">
                          #{b.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-slate-300">·</span>
                        {getStatusLabel(b.status)}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">
                        {b.service_name_snapshot}
                      </h3>
                      <p className="text-xs font-extrabold text-teal-800 mt-0.5">
                        ₹{(b.final_amount ?? b.customer_price).toLocaleString('en-IN')}{' '}
                        <span className="text-[11px] font-medium text-slate-500">
                          · {b.payment_status === 'Paid' ? 'Paid' : 'Pay After Service'}
                        </span>
                      </p>
                    </div>

                    {/* 4-Digit Start PIN on Active Card */}
                    {!isCancelled && !isCompleted && (
                      <div className="bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl text-right shrink-0">
                        <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider block">
                          Start PIN
                        </span>
                        <span className="font-mono font-black text-sm text-slate-900 tracking-widest">
                          {startPin}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Agent Strip (Real Data Only) */}
                  {!isCancelled && (
                    <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0F766E] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          {b.partner_name ? (
                            <>
                              <span className="font-bold text-slate-900">{b.partner_name}</span>
                              {b.partner_rating != null && (
                                <span className="text-amber-600 font-bold ml-1.5">
                                  ★ {b.partner_rating}
                                </span>
                              )}
                            </>
                          ) : hasAssignedAgent ? (
                            <span className="font-bold text-slate-900">Verified Doorbly Agent Assigned</span>
                          ) : (
                            <span className="font-semibold text-slate-600">
                              Awaiting Agent Assignment
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-teal-800">
                        {isCompleted
                          ? 'Done'
                          : hasAssignedAgent
                          ? 'Assigned'
                          : 'Searching...'}
                      </span>
                    </div>
                  )}

                  {/* Realtime Status Stepper */}
                  {!isCancelled && (
                    <div className="px-4 py-2.5 bg-white border-b border-slate-100">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 mb-1.5">
                        <span className={stepIndex >= 1 ? 'text-teal-800 font-extrabold' : ''}>Confirmed</span>
                        <span className={stepIndex >= 2 ? 'text-teal-800 font-extrabold' : ''}>Assigned</span>
                        <span className={stepIndex >= 4 ? 'text-teal-800 font-extrabold' : ''}>On The Way</span>
                        <span className={stepIndex >= 6 ? 'text-teal-800 font-extrabold' : ''}>Started</span>
                        <span className={stepIndex >= 7 ? 'text-teal-800 font-extrabold' : ''}>Completed</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-700 h-full transition-all duration-500 rounded-full"
                          style={{
                            width: `${(Math.max(1, stepIndex) / 7) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Booking Date & Location */}
                  <div
                    onClick={() => setSelectedBookingDetails(b)}
                    className="p-3.5 space-y-1 text-xs text-slate-600 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong>{b.preferred_date}</strong> · <strong>{b.preferred_time}</strong>
                      </span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                      <span className="truncate">
                        {b.address}{b.city ? `, ${b.city}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Action Footer: Live Agent Tracker, Details & Cancel */}
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    {!isCancelled ? (
                      <button
                        type="button"
                        onClick={() => setLiveTrackedBooking(b)}
                        className="flex-1 py-2 px-3 bg-[#0F766E] hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 text-amber-300" />
                        <span>
                          {isCompleted ? 'Rate Agent & Feedback' : 'Track Agent Live & Chat'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('services')}
                        className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Rebook Service
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBookingDetails(b)}
                      className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Details
                    </button>

                    {!isCancelled && !isCompleted && normalizeStatus(b.status) !== 'Started' && (
                      <button
                        type="button"
                        onClick={() => openCancelPrompt(b)}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Cancel Booking"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Agent Tracker, 4-Digit Start PIN & Chat Modal */}
      <AgentLiveTrackerModal
        booking={liveTrackedBooking}
        isOpen={!!liveTrackedBooking}
        onClose={() => setLiveTrackedBooking(null)}
        onStatusUpdated={loadBookings}
        onOpenSafety={() => setShowSafetyModal(true)}
        onRequestCancelBooking={(b) => openCancelPrompt(b)}
      />

      {/* Safety & SOS Toolkit Modal */}
      <SafetyToolkitModal
        isOpen={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        activeBookingSummary={firstActiveSummary}
      />

      {/* Complete Booking Details Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95">
            <div className="bg-[#0F766E] text-white p-5 relative">
              <button
                type="button"
                onClick={() => setSelectedBookingDetails(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-teal-200">
                  ID: #{selectedBookingDetails.id.slice(0, 8)}
                </span>
                <span className="text-teal-300">·</span>
                <span className="text-[11px] font-bold text-amber-300">
                  Start PIN: {getBookingStartPin(selectedBookingDetails.id)}
                </span>
              </div>
              <h3 className="text-base font-bold mt-1.5 leading-snug">
                {selectedBookingDetails.service_name_snapshot}
              </h3>
              <p className="text-xs text-teal-100 font-semibold mt-0.5">
                Customer Price: <strong className="text-white text-sm">₹{(selectedBookingDetails.final_amount ?? selectedBookingDetails.customer_price).toLocaleString('en-IN')}</strong>
              </p>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              {/* Timeline Display */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                <h4 className="font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                  Service Timeline
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Booking Confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${getStatusStepIndex(selectedBookingDetails.status) >= 2 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>
                      Agent Assigned
                      {selectedBookingDetails.partner_name ? ` (${selectedBookingDetails.partner_name})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${getStatusStepIndex(selectedBookingDetails.status) >= 4 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Agent On The Way</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${getStatusStepIndex(selectedBookingDetails.status) >= 6 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Start PIN Verified · Service Started</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${getStatusStepIndex(selectedBookingDetails.status) >= 7 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Service Completed</span>
                  </div>
                </div>
              </div>

              {/* Service Address */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-medium block">Doorstep Address</span>
                <p className="font-semibold text-slate-800 leading-snug">
                  {selectedBookingDetails.address}
                </p>
                {selectedBookingDetails.city && (
                  <p className="text-[11px] text-slate-600">
                    {selectedBookingDetails.city} {selectedBookingDetails.pincode ? `- ${selectedBookingDetails.pincode}` : ''}
                  </p>
                )}
              </div>

              {selectedBookingDetails.instructions && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-medium block">Instructions &amp; Mode</span>
                  <p className="text-slate-700 mt-0.5">{selectedBookingDetails.instructions}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedBookingDetails;
                    setSelectedBookingDetails(null);
                    setLiveTrackedBooking(b);
                  }}
                  className="w-full py-2.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Live Agent Tracker &amp; Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceBooking(selectedBookingDetails)}
                  className="w-full py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <ReceiptText className="w-3.5 h-3.5 text-teal-700" />
                  <span>View &amp; Print Tax Invoice</span>
                </button>

                {normalizeStatus(selectedBookingDetails.status) !== 'Completed' &&
                  normalizeStatus(selectedBookingDetails.status) !== 'Cancelled' &&
                  normalizeStatus(selectedBookingDetails.status) !== 'Started' && (
                    <button
                      type="button"
                      onClick={() => {
                        const b = selectedBookingDetails;
                        setSelectedBookingDetails(null);
                        openCancelPrompt(b);
                      }}
                      className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cancel Active Booking</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => setSelectedBookingDetails(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-in zoom-in-95 text-slate-900">
            <div className="bg-rose-600 text-white p-5 relative">
              <button
                type="button"
                onClick={() => !cancelling && setBookingToCancel(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-200" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100">
                  Cancel Active Booking
                </span>
              </div>
              <h3 className="text-base font-bold mt-1 leading-snug">
                {bookingToCancel.service_name_snapshot}
              </h3>
              <p className="text-[11px] text-rose-100 mt-0.5">
                Booking #{bookingToCancel.id.slice(0, 8).toUpperCase()} · {bookingToCancel.preferred_date}
              </p>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2">
                  Select a reason for cancellation:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {CANCELLATION_REASONS.map((reason) => {
                    const isSelected = cancelReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancelReason(reason)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{reason}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {cancelReason === 'Other reason' && (
                <div>
                  <input
                    type="text"
                    value={customCancelNote}
                    onChange={(e) => setCustomCancelNote(e.target.value)}
                    placeholder="Please specify your reason..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {cancelError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-semibold">
                  {cancelError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setBookingToCancel(null)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancelBooking}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{cancelling ? 'Cancelling...' : 'Confirm Cancel'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!invoiceBooking}
        onClose={() => setInvoiceBooking(null)}
        booking={invoiceBooking}
        customerName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
        customerPhone={user?.phone || user?.user_metadata?.phone}
      />
    </div>
  );
};
