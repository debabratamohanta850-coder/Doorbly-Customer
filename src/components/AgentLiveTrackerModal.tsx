import React, { useState, useEffect } from 'react';
import {
  DoorblyBooking,
  DoorblyPartnerProfile,
  BookingChatMessage
} from '../types/supabase';
import {
  getBookingStartPin,
  getBookingRating,
  saveBookingRating
} from '../services/rapidoEngine';
import {
  normalizeStatus,
  fetchPartnerProfile,
  fetchBookingMessages,
  sendBookingChatMessage,
  submitCustomerReview
} from '../services/bookingService';
import { formatCustomerPrice } from '../services/catalogService';
import { getSupabase } from '../lib/supabaseClient';
import {
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  MapPin,
  Send,
  Star,
  KeyRound,
  Heart,
  UserCheck,
  Clock
} from 'lucide-react';

interface Props {
  booking: DoorblyBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
  onOpenSafety: () => void;
}

const FEEDBACK_TAGS = [
  'On-Time Arrival',
  'Expert Diagnosis',
  'Polite & Respectful',
  'Clean Workspace',
  'Fair Pricing',
  'Proper Toolkit'
];

export const AgentLiveTrackerModal: React.FC<Props> = ({
  booking,
  isOpen,
  onClose,
  onStatusUpdated,
  onOpenSafety
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'chat'>('tracker');
  const [agent, setAgent] = useState<DoorblyPartnerProfile | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [chatMessages, setChatMessages] = useState<BookingChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(booking?.status || 'Pending');

  // Rating & Tipping state
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['On-Time Arrival', 'Expert Diagnosis']);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!booking || !isOpen) return;

    setCurrentStatus(booking.status);
    const existingRating = getBookingRating(booking.id);
    if (existingRating) {
      setRatingStars(existingRating.stars);
      setSelectedTags(existingRating.tags);
      setTipAmount(existingRating.tipAmount);
      setRatingSubmitted(true);
    } else {
      setRatingSubmitted(false);
    }

    // Fetch real assigned Agent from Supabase if partner_id is present
    if (booking.partner_id) {
      setLoadingAgent(true);
      fetchPartnerProfile(booking.partner_id)
        .then((data) => setAgent(data))
        .finally(() => setLoadingAgent(false));
    } else {
      setAgent(null);
    }

    // Fetch real booking chat messages from Supabase
    fetchBookingMessages(booking.id).then((msgs) => setChatMessages(msgs));

    const supabase = getSupabase();
    if (!supabase) return;

    // Subscribe to real-time booking & message updates
    const channel = supabase
      .channel(`live-agent-tracker-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doorbly_bookings',
          filter: `id=eq.${booking.id}`
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as DoorblyBooking;
            setCurrentStatus(updated.status);
            if (updated.partner_id && updated.partner_id !== booking.partner_id) {
              fetchPartnerProfile(updated.partner_id).then((data) => setAgent(data));
            }
            onStatusUpdated();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'doorbly_booking_messages',
          filter: `booking_id=eq.${booking.id}`
        },
        () => {
          fetchBookingMessages(booking.id).then((msgs) => setChatMessages(msgs));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [booking, isOpen, onStatusUpdated]);

  if (!isOpen || !booking) return null;

  const startPin = getBookingStartPin(booking.id);
  const normalized = normalizeStatus(currentStatus);

  const progressPercent =
    normalized === 'Pending'
      ? 15
      : normalized === 'Partner Assigned' || normalized === 'Partner Accepted'
      ? 40
      : normalized === 'On The Way' || normalized === 'Partner Arrived'
      ? 75
      : normalized === 'Started'
      ? 95
      : 100;

  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend ?? chatInput).trim();
    if (!msg || sendingMsg) return;
    setSendingMsg(true);
    const res = await sendBookingChatMessage({
      bookingId: booking.id,
      customerId: booking.customer_id,
      partnerId: booking.partner_id || null,
      message: msg
    });
    if (res.msg) {
      setChatMessages((prev) => [...prev, res.msg!]);
      if (!textToSend) setChatInput('');
    }
    setSendingMsg(false);
  };

  const handleSubmitRating = async () => {
    saveBookingRating({
      bookingId: booking.id,
      stars: ratingStars,
      tags: selectedTags,
      tipAmount
    });
    await submitCustomerReview({
      bookingId: booking.id,
      customerId: booking.customer_id,
      partnerId: booking.partner_id || null,
      rating: ratingStars,
      reviewText: selectedTags.join(', ')
    });
    setRatingSubmitted(true);
    onStatusUpdated();
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94dvh] text-slate-900">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 pt-4 pb-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                  {normalized === 'Completed'
                    ? 'Service Completed'
                    : normalized === 'Started'
                    ? 'Service In Progress'
                    : agent
                    ? 'Live Agent Assigned'
                    : 'Searching Nearby Agents'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate max-w-[210px]">
                {booking.service_name_snapshot}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={onOpenSafety}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation: Live Tracker vs In-App Chat */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 mx-4 mt-3 rounded-xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('tracker')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'tracker'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Live Agent Status &amp; PIN
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('chat')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
            <span>Chat ({chatMessages.length})</span>
          </button>
        </div>

        {activeSubTab === 'tracker' ? (
          <div className="p-4 overflow-y-auto space-y-3.5">
            {/* Live Progress Visualizer */}
            <div className="relative h-36 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 overflow-hidden border border-slate-800 p-3.5 flex flex-col justify-between text-white">
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/50 border border-white/15 text-[10px] font-bold text-emerald-300 flex items-center space-x-1.5">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>
                    {normalized === 'Completed'
                      ? 'Arrived & Completed'
                      : normalized === 'Started'
                      ? 'Agent Working at Doorstep'
                      : normalized === 'On The Way'
                      ? 'Agent En Route to Doorstep'
                      : agent
                      ? 'Agent Assigned'
                      : 'Broadcasting to Nearby Agents'}
                  </span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {booking.city || 'Odisha'}
                </span>
              </div>

              {/* Route Progress Line */}
              <div className="relative z-10 my-auto px-2">
                <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom Destination Strip */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="truncate max-w-[230px]">
                  <MapPin className="w-3 h-3 inline mr-1 text-emerald-400" />
                  {booking.address}
                </span>
                <span className="font-mono font-bold text-white">
                  {formatCustomerPrice(booking.final_amount ?? booking.customer_price)}
                </span>
              </div>
            </div>

            {/* 4-Digit Service Start PIN Banner */}
            {normalized !== 'Completed' && normalized !== 'Cancelled' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300/90 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                      4-Digit Service Start PIN
                    </span>
                    <p className="text-[11px] text-amber-800 leading-tight">
                      Share this PIN with your Doorbly Agent when they arrive at your doorstep.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 text-amber-300 font-mono text-base font-black tracking-widest shrink-0 shadow-xs">
                  {startPin}
                </div>
              </div>
            )}

            {/* Real Assigned Agent Card (from Supabase) */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
              {loadingAgent ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Loading assigned Agent details...
                </div>
              ) : agent ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0F766E] to-teal-900 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {agent.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Verified Doorbly Agent
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{agent.full_name}</h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          {agent.rating != null && (
                            <span className="flex items-center text-amber-600 font-bold">
                              ★ {agent.rating}
                            </span>
                          )}
                          {agent.completed_jobs != null && (
                            <>
                              <span>·</span>
                              <span>{agent.completed_jobs} jobs completed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Call & Chat Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {agent.phone ? (
                      <a
                        href={`tel:${agent.phone}`}
                        className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Call Agent</span>
                      </a>
                    ) : (
                      <div className="py-2 px-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Phone Protected</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('chat')}
                      className="py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                      <span>Message Agent</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-2 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Awaiting Agent Assignment
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Your booking is live in the Doorbly dispatch queue. As soon as a verified Agent accepts your request, their profile and contact details will appear here automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Post-Service Agent Rating & Tipping (When Completed) */}
            {normalized === 'Completed' && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                {ratingSubmitted ? (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs font-extrabold text-emerald-900">
                      Thank you for rating your Agent ({ratingStars} ★)!
                    </p>
                    {tipAmount > 0 && (
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        100% of your ₹{tipAmount} tip goes directly to the Agent.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">
                        Rate Your Doorbly Agent
                      </span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingStars(star)}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= ratingStars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {FEEDBACK_TAGS.map((tag) => {
                        const active = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              active
                                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add a Tip for Agent */}
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1 mb-1.5">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span>Tip Your Agent (100% goes to agent)</span>
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 20, 50, 100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTipAmount(amt)}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              tipAmount === amt
                                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {amt === 0 ? 'No Tip' : `+₹${amt}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitRating}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Submit Agent Feedback
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* BODY: REAL IN-APP AGENT CHAT */
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-72">
              {chatMessages.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No messages yet. Send a message to coordinate with your assigned Doorbly Agent.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isCustomer = msg.sender_role.toUpperCase() === 'CUSTOMER';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isCustomer
                            ? 'bg-[#0F766E] text-white rounded-br-xs'
                            : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {isCustomer ? 'You' : agent?.full_name || 'Agent'} ·{' '}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Pre-Set Messages */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                'When will you reach?',
                'Call me when you reach the gate',
                'Please bring required tools'
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSendMessage(preset)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Message Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2 pt-1 border-t border-slate-200"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message your Doorbly Agent..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={sendingMsg}
                className="p-2.5 bg-[#0F766E] hover:bg-teal-800 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
