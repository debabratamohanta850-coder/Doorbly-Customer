import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { formatCustomerPrice } from '../services/catalogService';
import { createCustomerBooking, getEffectiveCustomerId } from '../services/bookingService';
import { fetchCustomerLocations, validateCouponCode } from '../services/profileService';
import { dispatchBookingNotification } from '../services/fcmService';
import { CustomerLocation } from '../types/supabase';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Compass,
  Calendar,
  Clock,
  Tag,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'home' | 'services' | 'bookings' | 'cart' | 'wallet' | 'profile') => void;
  onOpenAuth: () => void;
  onBookingCreated: (bookingId: string) => void;
}

export const CartView: React.FC<Props> = ({
  onNavigateTab,
  onOpenAuth,
  onBookingCreated
}) => {
  const {
    items,
    subtotal,
    discountAmount,
    taxAmount,
    finalAmount,
    appliedCoupon,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCoupon
  } = useCart();

  const { user, profile } = useAuth();
  const {
    currentGps,
    permissionState,
    promptAndroidPermission,
    requestGpsLocation,
    isLocating
  } = useLocation();

  const [savedAddresses, setSavedAddresses] = useState<CustomerLocation[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bhubaneswar');
  const [district, setDistrict] = useState('Khordha');
  const [pincode, setPincode] = useState('');

  const [bookingMode, setBookingMode] = useState<'BOOK_NOW' | 'SCHEDULED'>('BOOK_NOW');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('10:00 AM');
  const [instructions, setInstructions] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (profile.address && !address) setAddress(profile.address);
      if (profile.city) setCity(profile.city);
      if (profile.district) setDistrict(profile.district);
      if (profile.pincode) setPincode(profile.pincode);
    }
  }, [profile]);

  useEffect(() => {
    if (currentGps?.address && !address) {
      setAddress(currentGps.address);
      if (currentGps.city) setCity(currentGps.city);
      if (currentGps.postalCode) setPincode(currentGps.postalCode);
    }
  }, [currentGps]);

  useEffect(() => {
    if (user?.id) {
      fetchCustomerLocations(user.id).then((locs) => {
        setSavedAddresses(locs);
        const def = locs.find((l) => l.is_default) || locs[0];
        if (def && !address) {
          setAddress(def.address_line);
          if (def.city) setCity(def.city);
          if (def.district) setDistrict(def.district);
          if (def.pincode) setPincode(def.pincode);
        }
      });
    }
  }, [user?.id]);

  const handleUseCurrentGps = async () => {
    if (permissionState !== 'granted') {
      promptAndroidPermission();
      return;
    }
    const gps = await requestGpsLocation();
    if (gps?.address) {
      setAddress(gps.address);
      if (gps.city) setCity(gps.city);
      if (gps.postalCode) setPincode(gps.postalCode);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponMessage(null);
    const res = await validateCouponCode(
      couponInput,
      subtotal,
      items[0]?.service.category_name
    );
    setValidatingCoupon(false);
    if (res.valid && res.coupon) {
      applyCoupon(res.coupon, res.discountAmount);
      setCouponMessage({ text: res.message, isError: false });
    } else {
      applyCoupon(null, 0);
      setCouponMessage({ text: res.message, isError: true });
    }
  };

  const handleCheckout = async () => {
    const effectiveCustomerId = getEffectiveCustomerId(user?.id);

    if (!address.trim()) {
      setErrorMsg('Please select or enter your doorstep service address.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = bookingMode === 'BOOK_NOW' ? todayStr : scheduledDate;
    const targetTime = bookingMode === 'BOOK_NOW' ? 'Immediate (Within 30-45 mins)' : scheduledTime;

    let lastBookingId = '';

    for (const item of items) {
      for (let q = 0; q < item.quantity; q++) {
        const res = await createCustomerBooking({
          customerId: effectiveCustomerId,
          customerName: profile?.full_name || user?.user_metadata?.full_name || 'Doorbly Customer',
          customerPhone: profile?.mobile_number || user?.phone || null,
          service: item.service,
          bookingType: bookingMode,
          address: address.trim(),
          city: city.trim(),
          district: district.trim(),
          pincode: pincode.trim(),
          latitude: currentGps?.latitude || profile?.latitude || null,
          longitude: currentGps?.longitude || profile?.longitude || null,
          preferredDate: targetDate,
          preferredTime: targetTime,
          instructions: instructions.trim() || item.notes || undefined,
          discountAmount: items.length === 1 && item.quantity === 1 ? discountAmount : 0,
          couponCode: appliedCoupon?.code || null
        });

        if (res.error) {
          setErrorMsg(res.error);
          setSubmitting(false);
          return;
        }

        if (res.booking) {
          lastBookingId = res.booking.id;
          await dispatchBookingNotification(
            {
              eventType: bookingMode === 'BOOK_NOW' ? 'SEARCHING_PARTNER' : 'BOOKING_CREATED',
              bookingId: res.booking.id,
              serviceName: item.service.service_name,
              title:
                bookingMode === 'BOOK_NOW'
                  ? 'Booking Confirmed • Finding Agent...'
                  : 'Scheduled Booking Confirmed',
              body:
                bookingMode === 'BOOK_NOW'
                  ? `We are matching a nearby Doorbly Agent for ${item.service.service_name}.`
                  : `Your ${item.service.service_name} is scheduled for ${targetDate} at ${targetTime}.`
            },
            effectiveCustomerId
          );
        }
      }
    }

    setSubmitting(false);
    clearCart();
    if (lastBookingId) {
      onBookingCreated(lastBookingId);
    } else {
      onNavigateTab('bookings');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-28 bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-[#0F766E] text-white px-5 pt-4 pb-5 rounded-b-3xl shadow-xs shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Service Cart</h1>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Review selected doorstep services &amp; confirm booking
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Your cart is empty</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Explore Doorbly services and add them to your cart or book directly.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('services')}
              className="mt-4 px-5 py-2.5 bg-[#0F766E] text-white text-xs font-bold rounded-xl hover:bg-teal-800 transition-colors inline-flex items-center space-x-1.5"
            >
              <span>Browse Services</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Selected Services List */}
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {items.map((item) => (
                <div key={item.service.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-500">
                      {item.service.category_name}
                      {item.service.subcategory ? ` · ${item.service.subcategory}` : ''}
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                      {item.service.service_name}
                    </h3>
                    <p className="text-xs font-extrabold text-[#0F766E] mt-1">
                      {formatCustomerPrice(item.service.price, item.service.pricing_unit)}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.service.id, item.quantity - 1)}
                        className="p-2 text-slate-600 hover:text-slate-900"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.service.id, item.quantity + 1)}
                        className="p-2 text-slate-600 hover:text-slate-900"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.service.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Remove service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Book Now vs Schedule for Later Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 block">
                When do you need the service?
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingMode('BOOK_NOW')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                    bookingMode === 'BOOK_NOW'
                      ? 'border-[#0F766E] bg-teal-50/70 text-teal-950'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <Zap className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Book Now</span>
                    <span className="text-[10px] text-slate-500">Instant partner match</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingMode('SCHEDULED')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2.5 ${
                    bookingMode === 'SCHEDULED'
                      ? 'border-[#0F766E] bg-teal-50/70 text-teal-950'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <div>
                    <span className="text-xs font-bold block">Schedule Later</span>
                    <span className="text-[10px] text-slate-500">Pick date &amp; time</span>
                  </div>
                </button>
              </div>

              {bookingMode === 'SCHEDULED' && (
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Preferred Time
                    </label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Location */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-[#0F766E]" />
                  <span>Customer Service Location</span>
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={isLocating}
                  className="text-[11px] font-bold text-[#0F766E] hover:underline flex items-center space-x-1"
                >
                  <Compass className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use Current GPS'}</span>
                </button>
              </div>

              {savedAddresses.length > 0 && (
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
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-colors ${
                        address === loc.address_line
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {loc.label}: {loc.address_line.slice(0, 22)}...
                    </button>
                  ))}
                </div>
              )}

              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Flat No., Landmark, Area..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
              />

              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Additional instructions (e.g., Please call me before arriving)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
              />
            </div>

            {/* Coupon Code Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Apply Coupon Code</span>
              </span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-teal-600"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponInput.trim()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  {validatingCoupon ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {couponMessage && (
                <p className={`text-[11px] font-medium ${couponMessage.isError ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            {/* Bill Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs shadow-2xs">
              <h4 className="font-bold text-slate-900 text-xs pb-1 border-b border-slate-100">
                Payment Summary
              </h4>
              <div className="flex justify-between text-slate-600">
                <span>Service Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Included GST (18%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                <span>Final Payable Amount</span>
                <span className="text-[#0F766E]">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full py-3.5 bg-[#0F766E] hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Confirming Booking...'
                  : bookingMode === 'BOOK_NOW'
                  ? `Confirm & Find Doorbly Partner • ₹${finalAmount.toLocaleString('en-IN')}`
                  : `Confirm Scheduled Booking • ₹${finalAmount.toLocaleString('en-IN')}`}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
