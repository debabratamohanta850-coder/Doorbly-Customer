import React, { useState, useEffect } from 'react';
import { CatalogService, DoorblyBooking, CustomerLocation, DoorblyCoupon } from '../types/supabase';
import { formatCustomerPrice } from '../services/catalogService';
import {
  createCustomerBooking,
  calculateCustomerPriceBreakdown,
  cancelCustomerBooking,
  mapToCanonicalStatus,
  getEffectiveCustomerId
} from '../services/bookingService';
import {
  fetchCustomerLocations,
  saveCustomerAddress,
  validateCouponCode
} from '../services/profileService';
import { dispatchBookingNotification } from '../services/fcmService';
import { getSupabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { TaxInvoiceModal } from './TaxInvoiceModal';
import {
  Calendar,
  MapPin,
  Compass,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  ReceiptText,
  Zap,
  Plus,
  Tag,
  Radio,
  UserCheck
} from 'lucide-react';

interface Props {
  service: CatalogService | null;
  initialScheduleMode?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (bookingId: string) => void;
  onOpenAuth: () => void;
}

export const BookingFlowModal: React.FC<Props> = ({
  service,
  initialScheduleMode = false,
  isOpen,
  onClose,
  onBookingSuccess,
  onOpenAuth
}) => {
  const { user, profile } = useAuth();
  const {
    currentGps,
    permissionState,
    promptAndroidPermission,
    requestGpsLocation,
    isLocating
  } = useLocation();

  // Steps: 1 = Location & Service Details, 2 = Book Now vs Schedule & Instructions, 3 = Review & Coupon, 4 = Partner Matching / Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<CustomerLocation[]>([]);
  const [showSaveAddressForm, setShowSaveAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');

  // Location fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bhubaneswar');
  const [district, setDistrict] = useState('Khordha');
  const [pincode, setPincode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Booking mode & schedule
  const [bookingType, setBookingType] = useState<'BOOK_NOW' | 'SCHEDULED'>(
    initialScheduleMode ? 'SCHEDULED' : 'BOOK_NOW'
  );
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [instructions, setInstructions] = useState('');
  const [serviceRequirementNote, setServiceRequirementNote] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DoorblyCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<DoorblyBooking | null>(null);
  const [searchTimedOut, setSearchTimedOut] = useState(false);
  const [showFullInvoiceModal, setShowFullInvoiceModal] = useState(false);

  useEffect(() => {
    setBookingType(initialScheduleMode ? 'SCHEDULED' : 'BOOK_NOW');
    setStep(1);
    setConfirmedBooking(null);
    setSearchTimedOut(false);
    setErrorMsg(null);
  }, [service?.id, initialScheduleMode, isOpen]);

  useEffect(() => {
    if (profile) {
      if (profile.address && !address) setAddress(profile.address);
      if (profile.city) setCity(profile.city);
      if (profile.district) setDistrict(profile.district);
      if (profile.pincode) setPincode(profile.pincode);
    }
  }, [profile]);

  useEffect(() => {
    if (currentGps) {
      if (currentGps.address && !address) setAddress(currentGps.address);
      if (currentGps.city) setCity(currentGps.city);
      if (currentGps.postalCode) setPincode(currentGps.postalCode);
      setLatitude(currentGps.latitude);
      setLongitude(currentGps.longitude);
    }
  }, [currentGps]);

  useEffect(() => {
    if (user?.id && isOpen) {
      fetchCustomerLocations(user.id).then((locs) => {
        setSavedAddresses(locs);
        const def = locs.find((l) => l.is_default) || locs[0];
        if (def && !address) {
          setAddress(def.address_line);
          if (def.city) setCity(def.city);
          if (def.district) setDistrict(def.district);
          if (def.pincode) setPincode(def.pincode);
          if (def.latitude) setLatitude(def.latitude);
          if (def.longitude) setLongitude(def.longitude);
        }
      });
    }
  }, [user?.id, isOpen]);

  // Realtime subscription on confirmedBooking during Step 4
  useEffect(() => {
    if (!confirmedBooking || step !== 4) return;

    const timer = setTimeout(() => {
      setSearchTimedOut(true);
    }, 25000);

    const supabase = getSupabase();
    if (!supabase) {
      return () => {
        clearTimeout(timer);
      };
    }

    const channel = supabase
      .channel(`booking-match-${confirmedBooking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doorbly_bookings',
          filter: `id=eq.${confirmedBooking.id}`
        },
        (payload) => {
          if (payload.new) {
            setConfirmedBooking(payload.new as DoorblyBooking);
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [confirmedBooking?.id, step]);

  if (!isOpen || !service) return null;

  const breakdown = calculateCustomerPriceBreakdown(Number(service.price || 0), discountAmount);
  const invNumber = `INV-OD-${(service.service_code || 'SRV')}-${Date.now().toString().slice(-4)}`;

  const handleDetectGps = async () => {
    setErrorMsg(null);
    if (permissionState !== 'granted') {
      promptAndroidPermission();
      return;
    }
    const coords = await requestGpsLocation();
    if (coords) {
      if (coords.address) setAddress(coords.address);
      if (coords.city) setCity(coords.city);
      if (coords.postalCode) setPincode(coords.postalCode);
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
    }
  };

  const handleSaveCurrentAddress = async () => {
    if (!user || !address.trim()) return;
    const res = await saveCustomerAddress(user.id, {
      label: addressLabel,
      address_line: address.trim(),
      city: city.trim(),
      district: district.trim(),
      state: 'Odisha',
      pincode: pincode.trim(),
      latitude,
      longitude,
      is_default: savedAddresses.length === 0
    });
    if (res.address) {
      const updated = await fetchCustomerLocations(user.id);
      setSavedAddresses(updated);
      setShowSaveAddressForm(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const res = await validateCouponCode(
      couponInput,
      breakdown.servicePrice,
      service.category_name
    );
    if (res.valid && res.coupon) {
      setAppliedCoupon(res.coupon);
      setDiscountAmount(res.discountAmount);
      setCouponMsg({ text: res.message, isError: false });
    } else {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponMsg({ text: res.message, isError: true });
    }
  };

  const handleNextToStep2 = () => {
    if (!address.trim()) {
      setErrorMsg('Please enter your doorstep service address or detect GPS location.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleNextToReview = () => {
    if (bookingType === 'SCHEDULED' && (!preferredDate || !preferredTime)) {
      setErrorMsg('Please select a preferred date and time slot.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    const effectiveCustomerId = getEffectiveCustomerId(user?.id);

    setIsSubmitting(true);
    setErrorMsg(null);

    const todayStr = new Date().toISOString().split('T')[0];
    const resolvedDate = bookingType === 'BOOK_NOW' ? todayStr : preferredDate;
    const resolvedTime =
      bookingType === 'BOOK_NOW' ? 'Immediate (Within 30-45 mins)' : preferredTime;

    const combinedInstructions = [
      serviceRequirementNote.trim() ? `Service Details: ${serviceRequirementNote.trim()}` : '',
      instructions.trim()
    ]
      .filter(Boolean)
      .join(' | ');

    const res = await createCustomerBooking({
      customerId: effectiveCustomerId,
      customerName: profile?.full_name || user?.user_metadata?.full_name || 'Doorbly Customer',
      customerPhone: profile?.mobile_number || user?.phone || null,
      service,
      bookingType,
      address: address.trim() || 'Bhubaneswar, Odisha',
      city: city.trim() || 'Bhubaneswar',
      district: district.trim() || 'Khordha',
      pincode: pincode.trim() || '751001',
      latitude,
      longitude,
      preferredDate: resolvedDate,
      preferredTime: resolvedTime,
      instructions: combinedInstructions,
      additionalDetails: serviceRequirementNote.trim()
        ? { details: serviceRequirementNote.trim() }
        : undefined,
      discountAmount,
      couponCode: appliedCoupon?.code || null
    });

    if (res.error) {
      setErrorMsg(res.error);
      setIsSubmitting(false);
    } else if (res.booking) {
      setIsSubmitting(false);
      setConfirmedBooking(res.booking);
      await dispatchBookingNotification(
        {
          eventType: bookingType === 'BOOK_NOW' ? 'SEARCHING_PARTNER' : 'BOOKING_CREATED',
          bookingId: res.booking.id,
          serviceName: service.service_name,
          title:
            bookingType === 'BOOK_NOW'
              ? 'Booking Confirmed • Finding Agent...'
              : 'Scheduled Booking Confirmed',
          body:
            bookingType === 'BOOK_NOW'
              ? `We are assigning a nearby Doorbly Agent for your ${service.service_name}.`
              : `Your ${service.service_name} is scheduled for ${resolvedDate} at ${resolvedTime}.`
        },
        effectiveCustomerId
      );
      setStep(4);
    }
  };

  const handleCancelSearchingBooking = async () => {
    if (!confirmedBooking) return;
    const effectiveCustomerId = getEffectiveCustomerId(user?.id);
    await cancelCustomerBooking(
      confirmedBooking.id,
      effectiveCustomerId,
      'Changed my mind',
      false
    );
    onBookingSuccess(confirmedBooking.id);
    onClose();
  };

  const canonicalStatus = confirmedBooking
    ? mapToCanonicalStatus(confirmedBooking.status, confirmedBooking.preferred_date)
    : 'SEARCHING_PARTNER';

  const isPartnerAssigned =
    canonicalStatus === 'PARTNER_ASSIGNED' ||
    canonicalStatus === 'PARTNER_ACCEPTED' ||
    canonicalStatus === 'PARTNER_ON_THE_WAY' ||
    !!confirmedBooking?.partner_id;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94dvh] text-slate-900">
          {/* Header */}
          <div className="bg-[#0F766E] text-white p-5 flex items-start justify-between shrink-0">
            <div className="pr-3">
              <p className="text-[11px] font-semibold text-teal-100">
                {step === 4
                  ? bookingType === 'BOOK_NOW'
                    ? 'Live Agent Matching'
                    : 'Scheduled Booking Confirmed'
                  : `Step ${step} of 3 · ${service.category_name}`}
              </p>
              <h3 className="text-base font-bold mt-0.5 leading-tight">
                {service.service_name}
              </h3>
              <p className="text-xs text-teal-100 font-semibold mt-0.5">
                Final Price:{' '}
                <span className="text-white font-extrabold">
                  ₹{breakdown.finalPayableAmount.toLocaleString('en-IN')}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirmedBooking) {
                  onBookingSuccess(confirmedBooking.id);
                }
                onClose();
              }}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          {step <= 3 && (
            <div className="grid grid-cols-3 gap-1.5 px-5 pt-3 text-[11px] font-bold text-center shrink-0">
              <div
                className={`py-1.5 rounded-lg ${
                  step >= 1 ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                1. Location
              </div>
              <div
                className={`py-1.5 rounded-lg ${
                  step >= 2 ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                2. Timing
              </div>
              <div
                className={`py-1.5 rounded-lg ${
                  step === 3 ? 'bg-[#0F766E] text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                3. Review
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {!user && step < 4 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Sign in to link this booking to your Doorbly account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-2.5 py-1 bg-[#0F766E] text-white text-[11px] font-bold rounded-lg shrink-0 hover:bg-teal-800"
                >
                  Sign In
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* STEP 1: Customer Location & Saved Addresses */}
            {step === 1 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Customer Location</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isLocating}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-[#0F766E] rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors border border-teal-200"
                  >
                    <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting...' : 'Use Current GPS'}</span>
                  </button>
                </div>

                {/* Saved Addresses Selector */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Saved Addresses
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {savedAddresses.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => {
                            setAddress(loc.address_line);
                            if (loc.city) setCity(loc.city);
                            if (loc.district) setDistrict(loc.district);
                            if (loc.pincode) setPincode(loc.pincode);
                            setLatitude(loc.latitude);
                            setLongitude(loc.longitude);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-colors ${
                            address === loc.address_line
                              ? 'bg-[#0F766E] text-white border-[#0F766E]'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {loc.label}: {loc.address_line.slice(0, 20)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat No., Building Name, Street, Landmark..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="751001"
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Option to save this address */}
                {user && address.trim() && (
                  <div className="pt-1">
                    {!showSaveAddressForm ? (
                      <button
                        type="button"
                        onClick={() => setShowSaveAddressForm(true)}
                        className="text-[11px] font-bold text-[#0F766E] hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save this address for future bookings</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          {(['Home', 'Office', 'Other'] as const).map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setAddressLabel(lbl)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                addressLabel === lbl
                                  ? 'bg-[#0F766E] text-white'
                                  : 'bg-white text-slate-700 border border-slate-200'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveCurrentAddress}
                          className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Contextual Service Info */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Service Details (Optional)
                  </label>
                  <input
                    type="text"
                    value={serviceRequirementNote}
                    onChange={(e) => setServiceRequirementNote(e.target.value)}
                    placeholder="e.g., Appliance/vehicle type, number of rooms, or issue description"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="w-full py-3.5 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Continue to Booking Time &rarr;
                </button>
              </div>
            )}

            {/* STEP 2: Book Now vs Schedule for Later & Instructions */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-2">
                    When do you need the Doorbly Agent?
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setBookingType('BOOK_NOW')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        bookingType === 'BOOK_NOW'
                          ? 'border-[#0F766E] bg-teal-50/70 text-teal-950 ring-1 ring-[#0F766E]'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Zap className="w-4 h-4 text-[#0F766E] mb-1" />
                      <span className="text-xs font-bold block">Book Now</span>
                      <span className="text-[10px] text-slate-500">
                        Instant nearby agent match
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookingType('SCHEDULED')}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        bookingType === 'SCHEDULED'
                          ? 'border-[#0F766E] bg-teal-50/70 text-teal-950 ring-1 ring-[#0F766E]'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Calendar className="w-4 h-4 text-[#0F766E] mb-1" />
                      <span className="text-xs font-bold block">Schedule for Later</span>
                      <span className="text-[10px] text-slate-500">
                        Select preferred date &amp; slot
                      </span>
                    </button>
                  </div>
                </div>

                {bookingType === 'SCHEDULED' && (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Select Date
                      </label>
                      <input
                        type="date"
                        value={preferredDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Select Time Slot
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          '09:00 AM',
                          '10:00 AM',
                          '11:30 AM',
                          '02:00 PM',
                          '04:00 PM',
                          '06:00 PM'
                        ].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setPreferredTime(slot)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                              preferredTime === slot
                                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Additional Instructions for Agent
                  </label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Please call me before arriving."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="flex space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextToReview}
                    className="flex-1 py-3 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Review Booking &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Review Booking (Customer Price, Coupon, Tax, Final Amount) */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-bold text-slate-900">{service.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking Type:</span>
                    <span className="font-bold text-[#0F766E]">
                      {bookingType === 'BOOK_NOW' ? 'Book Now (Instant)' : 'Scheduled Service'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date &amp; Time:</span>
                    <span className="font-semibold text-slate-800">
                      {bookingType === 'BOOK_NOW'
                        ? 'Today · Within 30–45 mins'
                        : `${preferredDate} · ${preferredTime}`}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80">
                    <span className="text-slate-500 block">Customer Location:</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {address}, {city} {pincode ? `- ${pincode}` : ''}
                    </span>
                  </div>
                </div>

                {/* Coupon Code Validation */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>Have a Coupon Code?</span>
                  </span>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-[11px] font-medium ${couponMsg.isError ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {couponMsg.text}
                    </p>
                  )}
                </div>

                {/* Final Customer Pricing Breakdown */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900">Final Customer Price Breakdown</span>
                    <button
                      type="button"
                      onClick={() => setShowFullInvoiceModal(true)}
                      className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center space-x-1"
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>Preview Invoice</span>
                    </button>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Customer Service Price</span>
                    <span>₹{breakdown.servicePrice.toLocaleString('en-IN')}</span>
                  </div>
                  {breakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-₹{breakdown.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Included GST (18%)</span>
                    <span>₹{breakdown.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                    <span>Final Payable Amount</span>
                    <span className="text-[#0F766E]">
                      ₹{breakdown.finalPayableAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{isSubmitting ? 'Confirming Booking...' : 'Confirm Booking'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Partner Assignment Screen ("Finding a Doorbly Partner...") */}
            {step === 4 && confirmedBooking && (
              <div className="space-y-4 py-2 text-center">
                {bookingType === 'BOOK_NOW' && !isPartnerAssigned ? (
                  <>
                    <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-teal-400/25 animate-ping" />
                      <span className="absolute inset-2 rounded-full bg-teal-500/20 animate-pulse" />
                      <div className="relative w-14 h-14 rounded-full bg-[#0F766E] text-white flex items-center justify-center shadow-lg">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Finding a Doorbly Agent...
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                        {searchTimedOut
                          ? 'Currently no agent is available for this service. Please try another time, or keep your booking open while we continue notifying agents.'
                          : "We're looking for an available Doorbly Agent near your location."}
                      </p>
                    </div>
                  </>
                ) : isPartnerAssigned ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <UserCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Doorbly Agent Assigned!
                      </h4>
                      {confirmedBooking.partner_name && (
                        <p className="text-xs font-bold text-[#0F766E] mt-1">
                          Agent: {confirmedBooking.partner_name}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Scheduled Booking Confirmed!
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Your booking is saved under Bookings &rarr; Upcoming.
                      </p>
                    </div>
                  </>
                )}

                {/* Booking Summary Card */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking ID:</span>
                    <span className="font-mono font-bold text-slate-800">
                      #{confirmedBooking.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Service:</span>
                    <span className="font-bold text-slate-800">
                      {confirmedBooking.service_name_snapshot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                      {confirmedBooking.address}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Booking Amount:</span>
                    <span className="font-extrabold text-[#0F766E]">
                      ₹{(confirmedBooking.final_amount ?? confirmedBooking.customer_price).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onBookingSuccess(confirmedBooking.id);
                      onClose();
                    }}
                    className="w-full py-3 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Open Live Booking Tracker
                  </button>

                  {!isPartnerAssigned && (
                    <button
                      type="button"
                      onClick={handleCancelSearchingBooking}
                      className="w-full py-2.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel Booking Request
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaxInvoiceModal
        isOpen={showFullInvoiceModal}
        onClose={() => setShowFullInvoiceModal(false)}
        booking={confirmedBooking}
        service={service}
        customerName={profile?.full_name || user?.email?.split('@')[0]}
        customerPhone={profile?.mobile_number || user?.phone}
        address={address}
        city={city}
        pincode={pincode}
        scheduledDate={preferredDate}
        scheduledTime={preferredTime}
        invoiceNumber={invNumber}
      />
    </>
  );
};
