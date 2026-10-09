import React from 'react';
import {
  Home,
  Layers,
  CalendarCheck2,
  ShoppingBag,
  Wallet,
  User,
  ShieldCheck,
  Menu,
  X,
  Bell,
  ShieldAlert,
  LifeBuoy,
  Smartphone,
  ChevronRight,
  Gift,
  LogOut,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { DoorblyLogo } from './DoorblyLogo';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'home' | 'services' | 'bookings' | 'cart' | 'wallet' | 'profile' | 'admin';

interface Props {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeBookingsCount?: number;
  cartItemsCount?: number;
  unreadNotificationsCount?: number;
  isAdmin?: boolean;
  onOpenAuth?: () => void;
  onOpenInstallModal?: () => void;
  onOpenNotifications?: () => void;
  onOpenHelpSafety?: (tab: 'support' | 'safety') => void;
  onOpenAdminModal?: () => void;
}

export const Navigation: React.FC<Props> = ({
  activeTab,
  onTabChange,
  isOpen,
  onOpenChange,
  activeBookingsCount = 0,
  cartItemsCount = 0,
  unreadNotificationsCount = 0,
  isAdmin = false,
  onOpenAuth,
  onOpenInstallModal,
  onOpenNotifications,
  onOpenHelpSafety,
  onOpenAdminModal
}) => {
  const { user, profile, signOut } = useAuth();

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    onOpenChange(false);
  };

  const primaryMenuItems: Array<{
    id: NavTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'home',
      label: 'Home',
      subtitle: 'Book doorstep & scheduled services',
      icon: Home
    },
    {
      id: 'services',
      label: 'All Services',
      subtitle: 'Explore 23+ categories & rates',
      icon: Layers
    },
    {
      id: 'bookings',
      label: 'My Bookings',
      subtitle: 'Live Agent tracker & 4-digit PIN',
      icon: CalendarCheck2,
      badge: activeBookingsCount,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'cart',
      label: 'Service Cart',
      subtitle: 'Review selected services & checkout',
      icon: ShoppingBag,
      badge: cartItemsCount,
      badgeColor: 'bg-[#0F766E] text-white'
    },
    {
      id: 'wallet',
      label: 'Wallet, Pass & Offers',
      subtitle: 'Balance, coupons & referral rewards',
      icon: Wallet
    },
    {
      id: 'profile',
      label: 'My Profile & Locations',
      subtitle: 'Saved addresses & account settings',
      icon: User
    }
  ];

  if (isAdmin) {
    primaryMenuItems.push({
      id: 'admin',
      label: 'Admin Panel',
      subtitle: 'Catalog, bookings & system config',
      icon: ShieldCheck
    });
  }

  const totalBadgeCount = activeBookingsCount + cartItemsCount;

  return (
    <>
      {/* Top-Left Sub-View Navigation Bar when not on Home (Rapido-style left menu header) */}
      {activeTab !== 'home' && (
        <div className="bg-[#0F766E] text-white px-4 pt-2.5 pb-1.5 flex items-center justify-between border-b border-white/10 shrink-0 z-30">
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            className="flex items-center space-x-2 py-1.5 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all cursor-pointer relative"
            aria-label="Open Left Navigation Menu"
          >
            <Menu className="w-4 h-4 text-white" />
            <span className="text-xs font-bold tracking-tight">Menu</span>
            {totalBadgeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {totalBadgeCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('home')}
            className="flex items-center space-x-1 py-1 px-2.5 rounded-xl bg-black/15 hover:bg-black/25 text-teal-100 text-[11px] font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
      )}

      {/* Left-Edge Quick Pull Handle (Rapido-style quick access from left side) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-[#0F766E] hover:bg-teal-800 text-white py-3 pl-1 pr-1.5 rounded-r-2xl shadow-lg border-y border-r border-white/25 flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 cursor-pointer"
          title="Open Left Menu"
          aria-label="Open Left Side Menu"
        >
          <Menu className="w-3.5 h-3.5 text-emerald-200" />
          {totalBadgeCount > 0 && (
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-extrabold flex items-center justify-center">
              {totalBadgeCount}
            </span>
          )}
        </button>
      )}

      {/* Rapido-Style Left-Hand Side Drawer Overlay & Panel */}
      {isOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Darkened Backdrop */}
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
          />

          {/* Left-Hand Side Slide-Out Drawer */}
          <aside className="relative z-10 w-[84%] max-w-[310px] h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200 select-none">
            {/* Top Customer Profile Card (Rapido Drawer Header Style) */}
            <div className="bg-gradient-to-br from-[#0F766E] via-teal-800 to-slate-900 text-white p-4 pt-5 shrink-0 relative">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Brand Badge */}
              <div className="inline-flex items-center space-x-2 bg-white px-2.5 py-1 rounded-xl shadow-xs mb-3">
                <DoorblyLogo size="xs" variant="full" />
              </div>

              {/* Customer Info Row */}
              <div
                onClick={() => {
                  if (user) {
                    handleSelectTab('profile');
                  } else if (onOpenAuth) {
                    onOpenChange(false);
                    onOpenAuth();
                  }
                }}
                className="flex items-center space-x-3 p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {profile?.profile_photo ? (
                    <img
                      src={profile.profile_photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : user ? (
                    (profile?.full_name || user.email || 'D').charAt(0).toUpperCase()
                  ) : (
                    <User className="w-5 h-5 text-slate-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-bold text-white truncate">
                      {user
                        ? profile?.full_name || user.email?.split('@')[0] || 'Doorbly Customer'
                        : 'Sign In / Sign Up'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-teal-100/90 truncate mt-0.5">
                    {user
                      ? profile?.mobile_number || user.email
                      : 'Tap to login & track bookings'}
                  </p>
                  {user && (
                    <div className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full bg-black/25 text-[10px] font-bold text-emerald-300">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Verified Account</span>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-teal-200 shrink-0" />
              </div>
            </div>

            {/* Scrollable Left-Hand Menu Items */}
            <div className="flex-1 overflow-y-auto py-2 px-2.5 space-y-1 bg-slate-50/60">
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Navigation Menu
              </div>

              {primaryMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'text-slate-800 hover:bg-teal-50/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white border border-slate-200/80 text-[#0F766E] group-hover:border-teal-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            isActive ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? 'text-teal-100' : 'text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isActive
                              ? 'bg-amber-400 text-slate-950'
                              : item.badgeColor || 'bg-amber-500 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-teal-200' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}

              {/* Quick Tools & Safety Section (Rapido-Style Drawer Extras) */}
              <div className="pt-3 pb-1 px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick Tools &amp; Safety
              </div>

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenNotifications();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-slate-800 hover:bg-teal-50/80 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#0F766E] flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Notifications</p>
                      <p className="text-[10px] text-slate-500">Live booking &amp; Agent alerts</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {unreadNotificationsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                        {unreadNotificationsCount}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectTab('wallet')}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-slate-800 hover:bg-teal-50/80 transition-all cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Refer &amp; Earn Rewards</p>
                    <p className="text-[10px] text-slate-500">Invite friends across Odisha</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {onOpenHelpSafety && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenHelpSafety('safety');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-slate-800 hover:bg-rose-50/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-rose-900">Emergency SOS &amp; Safety</p>
                        <p className="text-[10px] text-rose-600">24×7 safety helpline &amp; share</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-600 text-white">
                      SOS
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenHelpSafety('support');
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-slate-800 hover:bg-teal-50/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-[#0F766E] flex items-center justify-center shrink-0">
                        <LifeBuoy className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Help &amp; Support</p>
                        <p className="text-[10px] text-slate-500">Raise &amp; track support tickets</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </>
              )}

              {onOpenInstallModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenInstallModal();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl text-left bg-emerald-50/90 hover:bg-emerald-100/80 border border-emerald-200 transition-all cursor-pointer mt-1"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Install Mobile App</p>
                      <p className="text-[10px] text-emerald-700">1-Tap install or scan QR code</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-700 text-white">
                    QR
                  </span>
                </button>
              )}
            </div>

            {/* Bottom Drawer Footer */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    onOpenChange(false);
                  }}
                  className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              )}

              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span
                  onClick={() => {
                    if (!isAdmin && onOpenAdminModal) {
                      onOpenChange(false);
                      onOpenAdminModal();
                    }
                  }}
                >
                  Doorbly v2.4 • Odisha
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Unlocked</span>
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
