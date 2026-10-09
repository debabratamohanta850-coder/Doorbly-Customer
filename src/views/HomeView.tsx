import React, { useState, useEffect } from 'react';
import { CatalogService, CategoryType, DoorblyBooking, CustomerLocation } from '../types/supabase';
import {
  fetchCustomerCatalog,
  formatCustomerPrice,
  searchServices,
  CategoryGroup
} from '../services/catalogService';
import { fetchCustomerBookings, getReadableStatusLabel, normalizeStatus } from '../services/bookingService';
import { fetchCustomerLocations } from '../services/profileService';
import { fetchCustomerNotifications, subscribeNotificationCenter } from '../services/fcmService';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useCart } from '../context/CartContext';
import {
  MapPin,
  Compass,
  Search,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight,
  CalendarCheck2,
  Bell,
  ShoppingBag,
  Wallet,
  Tag,
  Calendar,
  Plus,
  Check,
  X,
  User as UserIcon,
  Smartphone,
  QrCode,
  Menu
} from 'lucide-react';
import { DoorblyLogo } from '../components/DoorblyLogo';

interface Props {
  onNavigateTab: (
    tab: 'home' | 'services' | 'bookings' | 'cart' | 'wallet' | 'profile',
    type?: CategoryType | 'ALL',
    categoryCode?: string
  ) => void;
  onSelectService: (service: CatalogService, scheduleMode?: boolean) => void;
  onOpenAuth: () => void;
  onOpenInstallModal?: () => void;
  onOpenNotifications?: () => void;
  onOpenMenu?: () => void;
}

export const HomeView: React.FC<Props> = ({
  onNavigateTab,
  onSelectService,
  onOpenAuth,
  onOpenInstallModal,
  onOpenNotifications,
  onOpenMenu
}) => {
  const { user, profile } = useAuth();
  const {
    currentGps,
    permissionState,
    promptAndroidPermission,
    requestGpsLocation,
    isLocating
  } = useLocation();
  const { addToCart, isInCart, totalItemsCount } = useCart();

  const [services, setServices] = useState<CatalogService[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedType, setSelectedType] = useState<CategoryType | 'ALL'>('ALL');
  const [activeBooking, setActiveBooking] = useState<DoorblyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fast real-time service search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CatalogService[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Location selector modal
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [savedLocations, setSavedLocations] = useState<CustomerLocation[]>([]);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string | null>(null);

  // Service detail modal
  const [detailService, setDetailService] = useState<CatalogService | null>(null);

  // Unread notifications count
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const catalog = await fetchCustomerCatalog();
        if (!mounted) return;
        setServices(catalog.services);
        setCategories(catalog.categories);

        if (user?.id) {
          const [bookings, locs, notifs] = await Promise.all([
            fetchCustomerBookings(user.id),
            fetchCustomerLocations(user.id),
            fetchCustomerNotifications(user.id)
          ]);
          if (mounted) {
            const firstActive = bookings.find((b) => {
              const norm = normalizeStatus(b.status);
              return norm !== 'Completed' && norm !== 'Cancelled';
            });
            setActiveBooking(firstActive || null);
            setSavedLocations(locs);
            setUnreadNotifCount(notifs.filter((n) => !n.is_read).length);
          }
        } else {
          setActiveBooking(null);
          const localNotifs = await fetchCustomerNotifications('local');
          if (mounted) {
            setUnreadNotifCount(localNotifs.filter((n) => !n.is_read).length);
          }
        }
      } catch {
        if (mounted) setLoadError('Please check your internet connection and try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    const unsubNotif = subscribeNotificationCenter(async () => {
      const notifs = await fetchCustomerNotifications(user?.id || 'local');
      if (mounted) {
        setUnreadNotifCount(notifs.filter((n) => !n.is_read).length);
      }
    });

    return () => {
      mounted = false;
      unsubNotif();
    };
  }, [user]);

  // Debounced live search against Supabase service catalog
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchServices(q, 12);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleLocationTap = async () => {
    if (permissionState === 'granted') {
      await requestGpsLocation();
    } else {
      promptAndroidPermission();
    }
  };

  const filteredCategories = categories.filter(
    (c) => selectedType === 'ALL' || c.type === selectedType
  );

  const popularServices = services
    .filter((s) => selectedType === 'ALL' || s.category_type === selectedType)
    .slice(0, 8);

  const activeAddressText =
    selectedAddressLabel ||
    currentGps?.address ||
    (profile?.address
      ? `${profile.address}${profile.city ? `, ${profile.city}` : ''}`
      : profile?.city
      ? `${profile.city}, ${profile.district || 'Odisha'}`
      : 'Select your doorstep location');

  return (
    <div className="flex-1 overflow-y-auto pb-28 bg-slate-50 text-slate-900">
      {/* Top Hero Header */}
      <div className="bg-gradient-to-b from-[#0F766E] to-teal-800 text-white px-5 pt-4 pb-6 rounded-b-3xl shadow-sm relative">
        {/* Header Row: Rapido-Style Left Menu Button, Brand, Notifications & Install */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2 min-w-0">
            {onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0 relative cursor-pointer transition-all"
                title="Open Left Menu"
                aria-label="Open Left Navigation Menu"
              >
                <Menu className="w-5 h-5 text-white" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0F766E]">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            )}
            <div className="h-10 px-2.5 py-1 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0">
              <DoorblyLogo size="sm" variant="full" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-teal-200 uppercase tracking-wider font-semibold block">
                Doorstep Service Platform
              </span>
              <h1 className="text-sm font-bold text-white truncate">
                {profile?.full_name
                  ? profile.full_name
                  : user?.email
                  ? user.email.split('@')[0]
                  : 'Welcome to Doorbly'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {onOpenInstallModal && (
              <button
                type="button"
                onClick={onOpenInstallModal}
                className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-xl transition-colors"
                title="Install Mobile App & QR Code"
              >
                <Smartphone className="w-4 h-4 text-emerald-300" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNotifications}
              className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-xl relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0F766E]">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onNavigateTab('profile')}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-white/25"
                title="Customer Profile"
              >
                {profile?.profile_photo ? (
                  <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-white text-[#0F766E] hover:bg-teal-50 text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Customer Location Bar & Selector */}
        <div
          onClick={() => setShowLocationPicker(true)}
          className="bg-black/20 hover:bg-black/25 border border-white/15 rounded-2xl p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2 truncate pr-2">
            <MapPin className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-teal-200 block font-medium leading-none">
                Customer Location
              </span>
              <span className="text-xs font-semibold text-white truncate block mt-0.5">
                {activeAddressText}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLocationTap();
            }}
            disabled={isLocating}
            className="shrink-0 bg-white/15 text-white hover:bg-white/25 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors flex items-center space-x-1"
          >
            <Compass className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Detect GPS'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="px-5 -mt-3.5 space-y-5 relative z-10">
        {/* Search for any service */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Search for any service"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none py-1.5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instant Real Supabase Search Results */}
        {searchQuery.trim() !== '' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isSearching ? 'Searching services...' : `Search Results (${searchResults.length})`}
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab('services')}
                className="text-[#0F766E] font-semibold hover:underline"
              >
                Full Catalog &rarr;
              </button>
            </div>

            {!isSearching && searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No matching services found for &ldquo;{searchQuery}&rdquo;.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {searchResults.map((srv) => {
                  const inCart = isInCart(srv.id);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setDetailService(srv)}
                      className="py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/80 px-1 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-slate-500">
                          {srv.category_name} · {srv.duration_minutes ? `${srv.duration_minutes} mins` : 'Standard 60 mins'}
                        </p>
                        <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                          {srv.service_name}
                        </h4>
                        {srv.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {srv.description}
                          </p>
                        )}
                        <p className="text-xs font-extrabold text-[#0F766E] mt-1">
                          {formatCustomerPrice(srv.price, srv.pricing_unit)}
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onSelectService(srv, false)}
                          className="px-3 py-1.5 bg-[#0F766E] hover:bg-teal-800 text-white text-[11px] font-bold rounded-xl"
                        >
                          Book Now
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(srv)}
                          className={`px-3 py-1 text-[10px] font-bold rounded-xl border ${
                            inCart
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {inCart ? 'In Cart' : '+ Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Prominent Active Booking Tracker Card (Only if customer has a real active booking) */}
        {activeBooking && (
          <div
            onClick={() => onNavigateTab('bookings')}
            className="cursor-pointer bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 hover:border-teal-500 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{getReadableStatusLabel(activeBooking.status, activeBooking.preferred_date)}</span>
              </span>
              <span className="text-xs text-teal-300 font-semibold flex items-center space-x-0.5">
                <span>Track Live</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <h4 className="font-bold text-sm text-white">
              {activeBooking.service_name_snapshot}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-300 mt-2 pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-1.5 truncate pr-2">
                <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">
                  {activeBooking.partner_name
                    ? `Agent: ${activeBooking.partner_name}`
                    : `${activeBooking.preferred_date} · ${activeBooking.preferred_time}`}
                </span>
              </div>
              <span className="font-bold text-white shrink-0">
                ₹{(activeBooking.final_amount ?? activeBooking.customer_price).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions Grid (6 Actions: Book a Service, Schedule Service, My Bookings, Cart, Wallet, Offers) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('services')}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">Book a Service</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (popularServices[0]) {
                onSelectService(popularServices[0], true);
              } else {
                onNavigateTab('services');
              }
            }}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">Schedule Service</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('bookings')}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">My Bookings</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('cart')}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors relative"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">
              Cart {totalItemsCount > 0 ? `(${totalItemsCount})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('wallet')}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('wallet')}
            className="bg-white hover:border-teal-600 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-2xs transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center mb-1.5">
              <Tag className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-900">Offers</span>
          </button>
        </div>

        {/* Direct Android Install Quick Card */}
        {onOpenInstallModal && (
          <div
            onClick={onOpenInstallModal}
            className="bg-gradient-to-r from-emerald-600 via-teal-700 to-[#0F766E] text-white p-3 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <span className="text-xs font-bold block">Install Doorbly on Mobile</span>
                <p className="text-[11px] text-teal-100/90">
                  1-tap direct install or scan QR code
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1.5 bg-white text-teal-900 text-[11px] font-bold rounded-xl shrink-0 flex items-center space-x-1">
              <span>Install</span>
              <ArrowRight className="w-3 h-3 text-teal-700" />
            </div>
          </div>
        )}

        {loadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Service Discovery & Category Filter */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Explore Service Categories
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('services')}
              className="text-xs font-semibold text-[#0F766E] hover:underline flex items-center space-x-0.5"
            >
              <span>All Categories</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-xl text-[11px] font-bold text-slate-600 mb-3">
            {(['ALL', 'DOORSTEP', 'FREELANCE', 'CORPORATE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`py-1.5 rounded-lg transition-colors ${
                  selectedType === t
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              No categories available right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredCategories.map((cat) => (
                <button
                  key={`${cat.type}-${cat.name}`}
                  type="button"
                  onClick={() => onNavigateTab('services', cat.type as any, cat.code)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-teal-600 shadow-2xs transition-colors text-left flex flex-col justify-between group"
                >
                  <p className="text-[11px] text-slate-500">
                    {cat.type}
                    {cat.count > 0 ? ` · ${cat.count} services` : ''}
                  </p>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0F766E] transition-colors line-clamp-1 mt-1">
                    {cat.name}
                  </h4>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Popular Services from Real Catalog */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Popular Services</h3>
              <p className="text-[11px] text-slate-500">
                Final customer price · Verified Doorbly Agents
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('services')}
              className="text-xs font-semibold text-[#0F766E] hover:underline"
            >
              See All
            </button>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : popularServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              No services available right now.
            </div>
          ) : (
            <div className="space-y-2.5">
              {popularServices.map((srv) => {
                const inCart = isInCart(srv.id);
                return (
                  <div
                    key={srv.id}
                    onClick={() => setDetailService(srv)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-600 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500 truncate">
                        {srv.category_name}
                        {srv.subcategory ? ` · ${srv.subcategory}` : ''}
                      </p>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                        {srv.service_name}
                      </h4>
                      <p className="text-xs font-extrabold text-[#0F766E] mt-1">
                        {formatCustomerPrice(srv.price, srv.pricing_unit)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => addToCart(srv)}
                        className={`p-2 rounded-xl border transition-colors ${
                          inCart
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={inCart ? 'Added to Cart' : 'Add to Cart'}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectService(srv, false)}
                        className="px-3.5 py-2 bg-[#0F766E] hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Location Selector Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Select Service Location</h3>
              <button
                type="button"
                onClick={() => setShowLocationPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                await handleLocationTap();
                setSelectedAddressLabel(null);
                setShowLocationPicker(false);
              }}
              className="w-full p-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center space-x-2.5 text-xs font-bold text-[#0F766E]"
            >
              <Compass className="w-4 h-4" />
              <span>Use Current GPS Location</span>
            </button>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Saved Addresses
              </span>
              {savedLocations.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  No saved addresses yet. You can manage saved addresses in your Profile.
                </p>
              ) : (
                savedLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddressLabel(`${loc.label}: ${loc.address_line}`);
                      setShowLocationPicker(false);
                    }}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left"
                  >
                    <p className="text-xs font-bold text-slate-900">{loc.label}</p>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{loc.address_line}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service Detail Modal */}
      {detailService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88dvh]">
            <div className="bg-[#0F766E] text-white p-5 relative">
              <button
                type="button"
                onClick={() => setDetailService(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-teal-100">
                {detailService.category_name}
                {detailService.subcategory ? ` · ${detailService.subcategory}` : ''}
              </p>
              <h3 className="text-base font-bold mt-1">{detailService.service_name}</h3>
              <p className="text-lg font-extrabold text-white mt-1">
                {formatCustomerPrice(detailService.price, detailService.pricing_unit)}
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Service Description</h4>
                <p className="text-slate-600 leading-relaxed">
                  {detailService.description ||
                    `Professional doorstep ${detailService.service_name} performed by a verified Doorbly Agent.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">Estimated Duration</span>
                  <span className="font-bold text-slate-800">
                    {detailService.duration_minutes ? `${detailService.duration_minutes} mins` : '60 mins'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Billing Unit</span>
                  <span className="font-bold text-slate-800">{detailService.pricing_unit}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">What&apos;s Included</h4>
                <ul className="space-y-1 text-slate-600">
                  <li>• Doorstep arrival by background-verified Doorbly Agent</li>
                  <li>• Transparent final customer pricing inclusive of applicable taxes</li>
                  <li>• Live agent status tracking and post-service GST invoice</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(detailService);
                    setDetailService(null);
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const srv = detailService;
                    setDetailService(null);
                    onSelectService(srv, false);
                  }}
                  className="py-3 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
