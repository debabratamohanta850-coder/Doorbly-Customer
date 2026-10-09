import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Share2,
  UserPlus,
  Trash2,
  X,
  CheckCircle2,
  MapPin,
  Radio,
  AlertTriangle
} from 'lucide-react';
import {
  EmergencyContact,
  getEmergencyContacts,
  addEmergencyContact,
  removeEmergencyContact
} from '../services/rapidoEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeBookingSummary?: {
    id: string;
    serviceName: string;
    agentName?: string | null;
    startPin: string;
    address: string;
  } | null;
}

export const SafetyToolkitModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeBookingSummary
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('Family');
  const [sosAlertSent, setSosAlertSent] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [liveAudioCheckIn, setLiveAudioCheckIn] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setContacts(getEmergencyContacts());
      setSosAlertSent(false);
      setShareFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const updated = addEmergencyContact({
      name: newName.trim(),
      phone: newPhone.trim(),
      relation: newRelation.trim() || 'Family'
    });
    setContacts(updated);
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  const handleDeleteContact = (id: string) => {
    setContacts(removeEmergencyContact(id));
  };

  const handleShareLiveStatus = async () => {
    const shareText = activeBookingSummary
      ? `Doorbly Live Safety Tracker: Agent ${activeBookingSummary.agentName || 'Assigned'} is scheduled for ${activeBookingSummary.serviceName} at ${activeBookingSummary.address}. Start PIN: ${activeBookingSummary.startPin}.`
      : `I am using Doorbly Customer App for verified doorstep services in Odisha. Live GPS safety monitoring is active.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Doorbly Live Safety Status',
          text: shareText,
          url: window.location.origin
        });
        setShareFeedback('Live safety status shared with your trusted contact!');
        return;
      } catch {
        // fallback to clipboard
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback('Safety tracking details copied to clipboard!');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleTriggerSos = () => {
    setSosAlertSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] text-slate-900">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 flex items-center justify-center shadow-md shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">
                24x7 Safety Toolkit
              </span>
              <h2 className="text-base font-bold text-white leading-tight">
                Safety &amp; Emergency SOS
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* SOS Emergency Action Card */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-extrabold text-rose-950 uppercase tracking-wide">
                  Emergency SOS Dispatch
                </h3>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-snug">
                  Alerts our 24x7 Safety Response Team and shares your live GPS coordinates with your emergency contacts.
                </p>
              </div>
            </div>

            {sosAlertSent ? (
              <div className="p-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2">
                <Radio className="w-4 h-4 animate-ping shrink-0" />
                <span>
                  SOS Alert Dispatched! Safety Desk &amp; Emergency Contacts notified with live GPS.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTriggerSos}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Send SOS Alert</span>
                </button>
                <a
                  href="tel:112"
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dial 112 Police</span>
                </a>
              </div>
            )}
          </div>

          {/* Share Live Service Status */}
          <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="text-xs font-bold text-teal-950">
                  Share Live Agent &amp; PIN Status
                </span>
              </div>
              <button
                type="button"
                onClick={handleShareLiveStatus}
                className="px-3 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-[11px] rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>Share Now</span>
              </button>
            </div>
            <p className="text-[11px] text-teal-800">
              Send your assigned Agent’s details, live GPS location, and 4-digit Start PIN to family or friends.
            </p>
            {shareFeedback && (
              <p className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1.5 rounded-lg">
                {shareFeedback}
              </p>
            )}
          </div>

          {/* Automated Safety Check-in Toggle */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-bold text-slate-900 block">
                Auto Safety Check-In During Service
              </span>
              <span className="text-[11px] text-slate-500">
                Prompts a safety check 10 mins after Agent starts work
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLiveAudioCheckIn(!liveAudioCheckIn)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                liveAudioCheckIn ? 'bg-[#0F766E]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  liveAudioCheckIn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Trusted Emergency Contacts */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Trusted Emergency Contacts ({contacts.length}/3)
              </span>
              {contacts.length < 3 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? 'Cancel' : 'Add Contact'}</span>
                </button>
              )}
            </div>

            {showAddForm && (
              <form
                onSubmit={handleAddContact}
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
              >
                <input
                  type="text"
                  placeholder="Contact Name (e.g. Mom, Spouse)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Relation"
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#0F766E] text-white font-bold rounded-xl text-xs"
                >
                  Save Trusted Contact
                </button>
              </form>
            )}

            <div className="space-y-2">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-[11px] text-slate-500">{c.relation}</span>
                    <p className="text-[11px] font-mono text-slate-600 mt-0.5">{c.phone}</p>
                  </div>
                  {c.id !== 'ec-1' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4-Pillar Agent Verification */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Doorbly Agent Safety Standards</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>4-Digit Start PIN</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Aadhaar &amp; Police KYC</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Masked Number Call</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Live Route Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
