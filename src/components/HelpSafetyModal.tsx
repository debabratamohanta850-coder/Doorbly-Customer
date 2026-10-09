import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchCustomerSupportTickets,
  createSupportTicket
} from '../services/profileService';
import { CustomerSupportTicket, DoorblyBooking } from '../types/supabase';
import {
  ShieldAlert,
  PhoneCall,
  LifeBuoy,
  Share2,
  X,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeBooking?: DoorblyBooking | null;
  initialTab?: 'support' | 'safety';
}

const ISSUE_CATEGORIES: CustomerSupportTicket['issue_category'][] = [
  'Booking issue',
  'Payment issue',
  'Partner issue',
  'Service issue',
  'Refund issue',
  'Account issue',
  'Other'
];

export const HelpSafetyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeBooking,
  initialTab = 'support'
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'support' | 'safety'>(initialTab);
  const [tickets, setTickets] = useState<CustomerSupportTicket[]>([]);
  const [issueCategory, setIssueCategory] = useState<CustomerSupportTicket['issue_category']>('Booking issue');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomerSupportTickets(user.id).then(setTickets);
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleShareSafetyDetails = async () => {
    if (!activeBooking) return;
    const text = `Doorbly Service Booking Safety Share:\nBooking ID: #${activeBooking.id.slice(0, 8)}\nService: ${activeBooking.service_name_snapshot}\nAgent: ${activeBooking.partner_name || 'Assigning'}\nStatus: ${activeBooking.status}\nLocation: ${activeBooking.address}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Doorbly Service Safety Details',
          text
        });
      } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFeedback({ text: 'Booking safety details copied to clipboard.', isError: false });
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFeedback({ text: 'Please sign in to submit a support request.', isError: true });
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setFeedback({ text: 'Please provide both subject and issue details.', isError: true });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const res = await createSupportTicket({
      customerId: user.id,
      bookingId: activeBooking?.id || null,
      issueCategory,
      subject,
      description
    });

    setSubmitting(false);

    if (res.error) {
      setFeedback({ text: res.error, isError: true });
    } else if (res.ticket) {
      setTickets((prev) => [res.ticket!, ...prev]);
      setSubject('');
      setDescription('');
      setFeedback({
        text: `Support request #${res.ticket.id.slice(0, 8)} submitted (Status: OPEN). Our team will assist you shortly.`,
        isError: false
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] text-slate-900">
        {/* Header */}
        <div className="bg-[#0F766E] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            {tab === 'safety' ? (
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            ) : (
              <LifeBuoy className="w-5 h-5 text-emerald-300" />
            )}
            <div>
              <h2 className="text-base font-bold leading-tight">Help &amp; Safety Center</h2>
              <p className="text-[11px] text-teal-100">
                24×7 Customer Support &amp; Emergency Assistance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="grid grid-cols-2 gap-1 p-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setTab('support')}
            className={`py-2 rounded-xl transition-colors ${
              tab === 'support'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Help &amp; Support Tickets
          </button>
          <button
            type="button"
            onClick={() => setTab('safety')}
            className={`py-2 rounded-xl transition-colors ${
              tab === 'safety'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Emergency &amp; Safety (SOS)
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                feedback.isError
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {tab === 'safety' ? (
            <div className="space-y-3.5">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <h3 className="text-sm font-bold text-rose-950 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Direct Emergency Contact Options</span>
                </h3>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Use the direct dial buttons below to connect with emergency authorities or Doorbly's dedicated safety response team.
                </p>

                <div className="space-y-2 pt-2">
                  <a
                    href="tel:112"
                    className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-xs transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4" />
                      <span>Call National Emergency Helpline (112)</span>
                    </span>
                    <span className="font-mono">112</span>
                  </a>

                  <a
                    href="tel:+918000123456"
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-between shadow-xs transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span>Call Doorbly Safety Desk</span>
                    </span>
                    <span className="font-mono">+91 8000 123 456</span>
                  </a>
                </div>
              </div>

              {activeBooking && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900">
                    Active Booking Safety Actions (#{activeBooking.id.slice(0, 8)})
                  </h4>
                  <button
                    type="button"
                    onClick={handleShareSafetyDetails}
                    className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center space-x-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Share Booking &amp; Agent Details with Trusted Contact</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIssueCategory('Partner issue');
                      setSubject(`Report Agent for Booking #${activeBooking.id.slice(0, 8)}`);
                      setTab('support');
                    }}
                    className="w-full py-2.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700"
                  >
                    Report Agent or Safety Concern
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleSubmitTicket} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">
                  Create a Support Request
                  {activeBooking ? ` (Linked to #${activeBooking.id.slice(0, 8)})` : ''}
                </h3>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Issue Category
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value as CustomerSupportTicket['issue_category'])}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'Partner issue' ? 'Agent issue' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe how we can help you..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Support Request'}</span>
                </button>
              </form>

              {/* Existing Support Tickets */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Your Support Requests</h4>
                {tickets.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    No support tickets raised yet.
                  </p>
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-slate-500">
                          #{t.id.slice(0, 8)} · {t.issue_category}
                        </span>
                        <span className="font-bold text-[#0F766E]">{t.status}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{t.subject}</p>
                      <p className="text-xs text-slate-600">{t.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
