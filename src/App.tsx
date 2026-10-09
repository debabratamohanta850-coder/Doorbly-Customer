/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { CartProvider, useCart } from './context/CartContext';
import { AndroidFrame } from './components/AndroidFrame';
import { Navigation, NavTab } from './components/Navigation';
import { SplashScreen } from './components/SplashScreen';
import { HomeView } from './views/HomeView';
import { AndroidLocationDialog } from './components/AndroidLocationDialog';
import { NotificationBanner } from './components/NotificationBanner';
import { CatalogService, CategoryType } from './types/supabase';
import { fetchCustomerBookings, getEffectiveCustomerId } from './services/bookingService';
import { fetchCustomerCatalog } from './services/catalogService';
import { initFCM, requestFCMToken } from './services/fcmService';
import { isDeviceAdminAuthenticated, subscribeAdminAuth } from './services/adminAuthService';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

// Lazy-load secondary views & modals to keep initial bundle ultra-fast & light
const ServicesView = lazy(() => import('./views/ServicesView').then((m) => ({ default: m.ServicesView })));
const BookingsView = lazy(() => import('./views/BookingsView').then((m) => ({ default: m.BookingsView })));
const CartView = lazy(() => import('./views/CartView').then((m) => ({ default: m.CartView })));
const WalletView = lazy(() => import('./views/WalletView').then((m) => ({ default: m.WalletView })));
const ProfileView = lazy(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const AdminView = lazy(() => import('./views/AdminView').then((m) => ({ default: m.AdminView })));

const BookingFlowModal = lazy(() =>
  import('./components/BookingFlowModal').then((m) => ({ default: m.BookingFlowModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const AdminLoginModal = lazy(() =>
  import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal }))
);
const AndroidInstallModal = lazy(() =>
  import('./components/AndroidInstallModal').then((m) => ({ default: m.AndroidInstallModal }))
);
const NotificationCenterModal = lazy(() =>
  import('./components/NotificationCenterModal').then((m) => ({ default: m.NotificationCenterModal }))
);
const HelpSafetyModal = lazy(() =>
  import('./components/HelpSafetyModal').then((m) => ({ default: m.HelpSafetyModal }))
);

function ViewFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const { totalItemsCount } = useCart();
  const isOnline = useNetworkStatus();

  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState<boolean>(false);
  const [servicesInitialType, setServicesInitialType] = useState<CategoryType | 'ALL'>('ALL');
  const [servicesInitialCategory, setServicesInitialCategory] = useState<string>('ALL');
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<CatalogService | null>(null);
  const [bookingScheduleMode, setBookingScheduleMode] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [helpSafetyState, setHelpSafetyState] = useState<{ open: boolean; tab: 'support' | 'safety' }>({
    open: false,
    tab: 'support'
  });
  const [activeBookingsCount, setActiveBookingsCount] = useState(0);
  const [isDeviceAdmin, setIsDeviceAdmin] = useState<boolean>(() => isDeviceAdminAuthenticated());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Subscribe to device admin status changes
  useEffect(() => {
    const unsub = subscribeAdminAuth((admin) => {
      setIsDeviceAdmin(admin);
      if (!admin && activeTab === 'admin') {
        setActiveTab('home');
      }
    });
    return unsub;
  }, [activeTab]);

  // Initialize FCM Messaging and warm Supabase Turbo Cache in parallel on launch
  useEffect(() => {
    void fetchCustomerCatalog();
    initFCM();
    if (user?.id && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        requestFCMToken(user.id);
      }
    }
  }, [user]);

  // Monitor active bookings count for badge in left-hand menu
  useEffect(() => {
    const effectiveId = getEffectiveCustomerId(user?.id);

    const checkActiveCount = async () => {
      try {
        const bookings = await fetchCustomerBookings(effectiveId);
        const count = bookings.filter(
          (b) => !['completed', 'cancelled', 'cancelled_by_customer', 'service_completed'].includes(b.status.toLowerCase())
        ).length;
        setActiveBookingsCount(count);
      } catch (err) {
        console.warn('Error counting active bookings:', err);
      }
    };

    checkActiveCount();
    const interval = setInterval(checkActiveCount, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const handleBookingSuccess = () => {
    setActiveTab('bookings');
    setActiveBookingsCount((prev) => prev + 1);
  };

  const handleNavigateWithFilter = (tab: NavTab, type?: CategoryType | 'ALL', categoryCode?: string) => {
    if (type) setServicesInitialType(type);
    if (categoryCode) setServicesInitialCategory(categoryCode);
    setActiveTab(tab);
  };

  // Auto-open install sheet when launched from QR code scan (?install=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('install') === '1') {
        setIsInstallModalOpen(true);
      }
    }
  }, []);

  return (
    <>
      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          statusText={authLoading ? 'Verifying Session...' : 'Ready'}
        />
      )}

      <AndroidFrame onOpenInstallModal={() => setIsInstallModalOpen(true)}>
        {/* Floating Realtime / FCM Push Notification Toast */}
        <NotificationBanner onOpenBooking={() => setActiveTab('bookings')} />

        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2 z-40 shrink-0">
            <WifiOff className="w-4 h-4" />
            <span>You are offline. Please check your internet connection.</span>
          </div>
        )}

        {/* Rapido-Style Left-Hand Side Navigation Drawer & Top Sub-Header */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={isLeftMenuOpen}
          onOpenChange={setIsLeftMenuOpen}
          activeBookingsCount={activeBookingsCount}
          cartItemsCount={totalItemsCount}
          isAdmin={isDeviceAdmin}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenNotifications={() => setIsNotifOpen(true)}
          onOpenHelpSafety={(tab) => setHelpSafetyState({ open: true, tab })}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />

        {/* Active Tab Screen */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Suspense fallback={<ViewFallback />}>
            {activeTab === 'home' && (
              <HomeView
                onNavigateTab={(tab, type, code) => handleNavigateWithFilter(tab, type, code)}
                onSelectService={(service, scheduleMode) => {
                  setSelectedServiceForBooking(service);
                  setBookingScheduleMode(!!scheduleMode);
                }}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenInstallModal={() => setIsInstallModalOpen(true)}
                onOpenNotifications={() => setIsNotifOpen(true)}
                onOpenMenu={() => setIsLeftMenuOpen(true)}
              />
            )}

            {activeTab === 'services' && (
              <ServicesView
                onSelectService={(service, scheduleMode) => {
                  setSelectedServiceForBooking(service);
                  setBookingScheduleMode(!!scheduleMode);
                }}
                initialType={servicesInitialType}
                initialCategoryCode={servicesInitialCategory}
              />
            )}

            {activeTab === 'bookings' && (
              <BookingsView
                onNavigateTab={setActiveTab}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'cart' && (
              <CartView
                onNavigateTab={setActiveTab}
                onOpenAuth={() => setIsAuthOpen(true)}
                onBookingCreated={handleBookingSuccess}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletView
                onNavigateTab={setActiveTab}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                onNavigateTab={setActiveTab}
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenAdminModal={() => setIsAdminModalOpen(true)}
                onOpenInstallModal={() => setIsInstallModalOpen(true)}
                isAdmin={isDeviceAdmin}
              />
            )}

            {activeTab === 'admin' && (
              isDeviceAdmin ? (
                <AdminView
                  onLockAdmin={() => {
                    setIsDeviceAdmin(false);
                    setActiveTab('home');
                  }}
                  onNavigateTab={setActiveTab}
                />
              ) : (
                <ProfileView
                  onNavigateTab={setActiveTab}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onOpenAdminModal={() => setIsAdminModalOpen(true)}
                  onOpenInstallModal={() => setIsInstallModalOpen(true)}
                  isAdmin={false}
                />
              )
            )}
          </Suspense>
        </div>

        {/* Lazy-Loaded Modals */}
        <Suspense fallback={null}>
          {selectedServiceForBooking && (
            <BookingFlowModal
              service={selectedServiceForBooking}
              initialScheduleMode={bookingScheduleMode}
              isOpen={!!selectedServiceForBooking}
              onClose={() => {
                setSelectedServiceForBooking(null);
                setBookingScheduleMode(false);
              }}
              onBookingSuccess={handleBookingSuccess}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}

          {isAuthOpen && (
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              onAdminSuccess={() => {
                setIsDeviceAdmin(true);
                setActiveTab('admin');
              }}
            />
          )}

          {isNotifOpen && (
            <NotificationCenterModal
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              onSelectBooking={() => setActiveTab('bookings')}
            />
          )}

          {helpSafetyState.open && (
            <HelpSafetyModal
              isOpen={helpSafetyState.open}
              initialTab={helpSafetyState.tab}
              onClose={() => setHelpSafetyState((prev) => ({ ...prev, open: false }))}
            />
          )}

          {isAdminModalOpen && (
            <AdminLoginModal
              isOpen={isAdminModalOpen}
              onClose={() => setIsAdminModalOpen(false)}
              onSuccess={() => {
                setIsDeviceAdmin(true);
                setActiveTab('admin');
              }}
            />
          )}

          {isInstallModalOpen && (
            <AndroidInstallModal
              isOpen={isInstallModalOpen}
              onClose={() => setIsInstallModalOpen(false)}
            />
          )}
        </Suspense>

        {/* Android System Location Permission Dialog */}
        <AndroidLocationDialog />
      </AndroidFrame>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
