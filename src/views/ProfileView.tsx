import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { requestFCMToken } from '../services/fcmService';
import {
  User,
  MapPin,
  Compass,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  CalendarCheck2,
  Edit3,
  ShieldCheck,
  Bell,
  Check,
  QrCode
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'home' | 'services' | 'bookings' | 'profile' | 'admin') => void;
  onOpenAuth: () => void;
  onOpenAdminModal?: () => void;
  onOpenInstallModal?: () => void;
  isAdmin?: boolean;
}

export const ProfileView: React.FC<Props> = ({
  onNavigateTab,
  onOpenAuth,
  onOpenAdminModal,
  onOpenInstallModal,
  isAdmin = false
}) => {
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const {
    currentGps,
    permissionState,
    promptAndroidPermission,
    requestGpsLocation,
    isLocating
  } = useLocation();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setMobileNumber(profile.mobile_number || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setDistrict(profile.district || '');
      setPincode(profile.pincode || '');
    } else if (user) {
      setFullName((user.user_metadata?.full_name as string) || '');
      setMobileNumber((user.user_metadata?.mobile_number as string) || (user.user_metadata?.phone as string) || '');
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    const { error } = await updateProfile({
      full_name: fullName.trim(),
      mobile_number: mobileNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      district: district.trim(),
      pincode: pincode.trim(),
      latitude: currentGps?.latitude ?? profile?.latitude ?? null,
      longitude: currentGps?.longitude ?? profile?.longitude ?? null
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Customer profile updated successfully.' });
      setIsEditing(false);
      await refreshProfile();
      setTimeout(() => setMessage(null), 3000);
    }
    setIsSaving(false);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-[#0F766E] text-white px-5 pt-4 pb-6 rounded-b-3xl shadow-xs shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Customer Profile</h1>
        <p className="text-xs text-teal-100/90 mt-0.5">
          Your verified Doorbly customer account
        </p>

        {user && (
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-teal-800 flex items-center justify-center font-bold text-base border border-teal-400/40 text-emerald-200">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <h2 className="text-sm font-bold truncate">
                {profile?.full_name || 'Verified Doorbly Customer'}
              </h2>
              <p className="text-xs text-emerald-100/80 truncate font-mono">
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4">
        {!user ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Sign In to Your Doorbly Account
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              View your profile details, manage saved doorstep addresses, and track all your active orders.
            </p>
            <button
              onClick={onOpenAuth}
              className="mt-4 px-6 py-2.5 bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Sign In or Register
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {message && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start space-x-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <p>{message.text}</p>
              </div>
            )}

            {/* Profile Information Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  <span>Customer Details</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Doorstep Address</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/Plot No, Street, Landmark"
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bhubaneswar"
                        className="w-full mt-1 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">District</label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Khordha"
                        className="w-full mt-1 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="751001"
                        className="w-full mt-1 px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full mt-2 py-3 bg-[#0F766E] hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
                  >
                    {isSaving ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isSaving ? 'Saving Profile...' : 'Save Profile'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Name:</span>
                    <span className="font-bold text-slate-900">{profile?.full_name || 'Not set'}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Email:</span>
                    <span className="font-mono text-slate-800">{user.email}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Mobile:</span>
                    <span className="font-bold text-slate-800">{profile?.mobile_number || 'Not set'}</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Address:</span>
                    <span className="font-medium text-slate-800 text-right max-w-[200px]">
                      {profile?.address || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">City / District:</span>
                    <span className="font-medium text-slate-800">
                      {profile?.city || 'Bhubaneswar'}{profile?.district ? `, ${profile.district}` : ''}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400 font-medium">Pincode:</span>
                    <span className="font-mono text-slate-800">{profile?.pincode || '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions (My Bookings & GPS) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('bookings')}
                className="w-full p-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <CalendarCheck2 className="w-4 h-4 text-teal-700" />
                  <span>View My Bookings</span>
                </div>
                <span className="text-teal-700">Open &rarr;</span>
              </button>

              {onOpenInstallModal && (
                <button
                  type="button"
                  onClick={onOpenInstallModal}
                  className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-900 transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>Install on Android & QR Code</span>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                    Install
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (permissionState === 'granted') {
                    requestGpsLocation();
                  } else {
                    promptAndroidPermission();
                  }
                }}
                disabled={isLocating}
                className="w-full p-3 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-800 transition-all"
              >
                <div className="flex items-center space-x-2.5">
                  <Compass className={`w-4 h-4 text-teal-700 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Acquiring GPS...' : 'Refresh Android GPS Location'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  {permissionState === 'granted' ? 'Granted' : 'Request'}
                </span>
              </button>
            </div>

            {/* Firebase Cloud Messaging Service Handler (Section 28) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Push Notifications (FCM)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Realtime alerts for all 6 booking status stages
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    typeof Notification !== 'undefined' && Notification.permission === 'granted'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                    ? 'Active'
                    : 'Permission Required'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800 text-xs">
                  Supported Notification Events:
                </p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Booking Confirmed</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Agent Assigned</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Agent On The Way</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Service Started</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Service Completed</span>
                  </span>
                  <span className="flex items-center space-x-1 text-slate-700">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Booking Cancelled</span>
                  </span>
                </div>
              </div>

              {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (user?.id) {
                        await requestFCMToken(user.id);
                        await refreshProfile();
                      }
                    }}
                    className="w-full py-2.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enable FCM Push Alerts</span>
                  </button>
                </div>
              )}
            </div>

            {/* Logout Action */}
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Doorbly</span>
            </button>
          </div>
        )}

        {/* Version Footer (Admin Panel completely hidden from unauthorized users) */}
        <div className="pt-6 pb-2 text-center select-none">
          <p
            onClick={() => {
              if (!isAdmin && onOpenAdminModal) {
                onOpenAdminModal();
              }
            }}
            className="text-[11px] text-slate-400 font-medium"
          >
            Doorbly v2.4 (Odisha Doorstep Edition)
          </p>
          {isAdmin && (
            <div className="mt-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => onNavigateTab('admin')}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-900 text-teal-300 text-[10px] font-bold rounded-full shadow-xs active:scale-95 transition-all"
              >
                <ShieldCheck className="w-3 h-3 text-teal-400" />
                <span>Device Authorized • Open Admin Panel &rarr;</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
