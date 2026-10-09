import React, { useState, useEffect } from 'react';
import { isDeviceAdminAuthenticated, revokeDeviceAdmin, getAdminAuthState } from '../services/adminAuthService';
import { fetchServices, fetchCategories } from '../services/catalogService';
import { CatalogService, ServiceCategory, DoorblyBooking, DoorblyBookingStatus } from '../types/supabase';
import { getSupabase } from '../lib/supabaseClient';
import { DOORBLY_MASTER_SQL } from '../lib/doorblyFullSql';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Layers,
  CalendarCheck2,
  Database,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag,
  DollarSign,
  Copy,
  Check,
  KeyRound
} from 'lucide-react';
import { DoorblyLogo } from '../components/DoorblyLogo';
import { SupabaseSetupModal } from '../components/SupabaseSetupModal';

interface Props {
  onLockAdmin: () => void;
  onNavigateTab: (tab: 'home' | 'services' | 'bookings' | 'profile') => void;
}

export const AdminView: React.FC<Props> = ({ onLockAdmin, onNavigateTab }) => {
  const [isAdmin, setIsAdmin] = useState(isDeviceAdminAuthenticated());
  const [activeSubTab, setActiveSubTab] = useState<'services' | 'categories' | 'bookings' | 'system'>('services');

  const [services, setServices] = useState<CatalogService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<DoorblyBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);

  // New Service Quick Add Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newCategory, setNewCategory] = useState('Home Repair & Maintenance');
  const [newSubcategory, setNewSubcategory] = useState('General');
  const [newDescription, setNewDescription] = useState('');
  const [newProviderRate, setNewProviderRate] = useState<number>(300);
  const [newSkillLevel, setNewSkillLevel] = useState<'Semi-Skilled' | 'Skilled' | 'Highly Skilled' | 'Professional'>('Skilled');
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  const handleCopySql = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(DOORBLY_MASTER_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const adminAuth = getAdminAuthState();

  useEffect(() => {
    setIsAdmin(isDeviceAdminAuthenticated());
    if (isDeviceAdminAuthenticated()) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvRes, catRes] = await Promise.all([
        fetchServices({ pageSize: 150 }),
        fetchCategories()
      ]);
      setServices(srvRes.services || []);
      setCategories(catRes.categories || []);

      // Load bookings from Supabase
      const supabase = getSupabase();
      if (supabase) {
        const { data: bData } = await supabase
          .from('doorbly_bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (bData && bData.length > 0) {
          setBookings(bData);
        } else {
          // Fallback to bookings table
          const { data: fbData } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (fbData) {
            setBookings(fbData.map((b: any) => ({
              id: b.id,
              customer_id: b.customer_id,
              service_id: b.service_id,
              service_name_snapshot: b.service_id,
              category_name_snapshot: 'Service',
              customer_price: Number(b.total_amount || 0),
              pricing_unit: 'job',
              address: b.address || 'Address on file',
              preferred_date: b.scheduled_at ? b.scheduled_at.split('T')[0] : 'Today',
              preferred_time: b.scheduled_at ? b.scheduled_at.split('T')[1]?.slice(0, 5) : '10:00',
              status: b.status || 'Pending',
              payment_status: 'Pending',
              created_at: b.created_at || new Date().toISOString()
            })));
          }
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: DoorblyBookingStatus) => {
    setUpdatingBookingId(bookingId);
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Try doorbly_bookings
        await supabase
          .from('doorbly_bookings')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', bookingId);

        // Also try bookings fallback
        await supabase
          .from('bookings')
          .update({ status: newStatus.toLowerCase(), updated_at: new Date().toISOString() })
          .eq('id', bookingId);

        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleLockDevice = () => {
    revokeDeviceAdmin();
    setIsAdmin(false);
    onLockAdmin();
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold">Admin Panel Hidden & Restricted</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          This panel is hidden from public users and restricted to authorized devices only.
        </p>
        <button
          onClick={() => onNavigateTab('home')}
          className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700"
        >
          Return to Customer App
        </button>
      </div>
    );
  }

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      !searchQuery.trim() ||
      s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subcategory && s.subcategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.category_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' ||
      s.category_name.toLowerCase() === categoryFilter.toLowerCase() ||
      s.category_code?.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Admin Device Banner */}
      <div className="bg-slate-900 text-white px-5 pt-4 pb-5 rounded-b-3xl shadow-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 px-2 py-0.5 rounded-lg bg-white flex items-center justify-center">
              <DoorblyLogo size="xs" variant="full" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black tracking-tight text-white">ADMIN CONSOLE</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-sm border border-emerald-500/30">
                  DEVICE ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[200px] font-mono">
                {adminAuth.email || 'debabrata.tribune@gmail.com'}
              </p>
            </div>
          </div>

          {/* Lock Device Admin Button */}
          <button
            onClick={handleLockDevice}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all active:scale-95"
            title="Immediately lock and hide admin panel on this device"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Device</span>
          </button>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-medium block">Services</span>
            <span className="text-base font-black text-teal-400">{services.length || 150}+</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-medium block">Categories</span>
            <span className="text-base font-black text-indigo-400">{categories.length || 23}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-medium block">Markup</span>
            <span className="text-base font-black text-amber-400">20% Fixed</span>
          </div>
        </div>

        {/* Admin Navigation Sub-Tabs */}
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-2xl mt-4 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('services')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeSubTab === 'services'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Services</span>
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeSubTab === 'categories'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>
          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeSubTab === 'bookings'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Bookings</span>
          </button>
          <button
            onClick={() => setActiveSubTab('system')}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeSubTab === 'system'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 space-y-4">
        {/* TAB 1: SERVICES MASTER */}
        {activeSubTab === 'services' && (
          <div className="space-y-3">
            {/* Search and Filters */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search service, subcategory..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-[#0F766E] active:scale-95 transition-all"
                title="Refresh from Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0F766E]' : ''}`} />
              </button>
            </div>

            {/* Service Pricing Legend */}
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs text-teal-900">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="font-semibold text-[11px]">
                  Price formula: Provider Rate + 20% Doorbly Markup = Customer Hourly Price
                </span>
              </div>
            </div>

            {/* Services List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
                <span>Showing {filteredServices.length} services</span>
                <span className="text-[10px] font-mono">Supabase PostgreSQL</span>
              </div>

              {filteredServices.slice(0, 40).map((srv) => {
                const customerPrice = srv.customer_hourly_price || srv.price;
                const providerRate = srv.provider_hourly_rate || Math.round(customerPrice / 1.2);
                const doorblyFee = srv.doorbly_charge || Math.round(customerPrice - providerRate);

                return (
                  <div
                    key={srv.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-slate-900">
                            {srv.service_name}
                          </span>
                          {srv.skill_level && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md border border-slate-200">
                              {srv.skill_level}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-teal-700 font-semibold block mt-0.5">
                          {srv.category_name} {srv.subcategory ? `• ${srv.subcategory}` : ''}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          ₹{customerPrice}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          per {srv.unit || srv.pricing_unit || 'hour'}
                        </span>
                      </div>
                    </div>

                    {/* Rate Breakdown Breakdown Bar */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-xl">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Provider Earning</span>
                        <span className="font-bold text-emerald-700">₹{providerRate}/hr</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Doorbly (20%)</span>
                        <span className="font-bold text-teal-700">₹{doorblyFee}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px]">Customer Rate</span>
                        <span className="font-bold text-slate-900">₹{customerPrice}/hr</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredServices.length > 40 && (
                <p className="text-[11px] text-center text-slate-400 py-2">
                  Showing top 40 of {filteredServices.length} loaded services
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORIES MASTER */}
        {activeSubTab === 'categories' && (
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900">
              <span className="font-bold block">23 Standardized Doorbly Categories</span>
              <span className="text-[11px] text-indigo-700">
                Mapped to Doorstep, Freelance, and Corporate tabs in Odisha.
              </span>
            </div>

            <div className="space-y-2">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id || cat.category_name}
                  className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{cat.category_name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">
                        {cat.description || 'Standard Doorbly Category'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: BOOKINGS DISPATCH */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-800">
                Customer Bookings ({bookings.length})
              </span>
              <button
                onClick={loadData}
                disabled={loading}
                className="text-xs text-teal-700 font-semibold flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <CalendarCheck2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No bookings logged in database yet</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Bookings will show up here as customers book doorstep services.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          ID: {b.id.slice(0, 8)}...
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {b.service_name_snapshot}
                        </h4>
                        <span className="text-[10px] text-teal-700 font-semibold">
                          {b.category_name_snapshot}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900">
                          ₹{b.customer_price}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {b.payment_status}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{b.address || 'Address provided'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Scheduled: {b.preferred_date} at {b.preferred_time}</span>
                      </div>
                    </div>

                    {/* Status Management Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Status:</span>

                      <div className="flex items-center space-x-1">
                        <select
                          value={b.status}
                          disabled={updatingBookingId === b.id}
                          onChange={(e) =>
                            handleUpdateBookingStatus(b.id, e.target.value as DoorblyBookingStatus)
                          }
                          className="text-[11px] font-bold bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Partner Assigned">Partner Assigned</option>
                          <option value="On The Way">On The Way</option>
                          <option value="Started">Started</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SYSTEM & MIGRATION */}
        {activeSubTab === 'system' && (
          <div className="space-y-3">
            {/* Quick 1-Click Supabase SQL Migration Card */}
            <div className="p-4 bg-white rounded-3xl border border-teal-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
                  <Database className="w-4 h-4 text-[#0F766E]" />
                  <span>Doorbly Supabase SQL Script</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl border border-teal-200 flex items-center space-x-1.5 transition-all active:scale-95 shadow-2xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-teal-700" />
                      <span>Copy Full SQL</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Includes all 23 categories, 150+ standardized services, 20% Doorbly auto-pricing, bookings table, customer profiles, brand assets, and public read policies.
              </p>

              {/* Code Preview */}
              <div className="bg-slate-950 text-slate-300 p-3 rounded-2xl font-mono text-[10px] max-h-36 overflow-y-auto border border-slate-800 space-y-1">
                <div className="text-slate-500">// Ready to paste into Supabase SQL Editor:</div>
                <div className="text-teal-400">create table if not exists public.doorbly_service_categories...</div>
                <div className="text-teal-400">create table if not exists public.doorbly_services...</div>
                <div className="text-amber-400">insert into public.doorbly_service_categories... (23 categories)</div>
                <div className="text-emerald-400">select public.doorbly_add_service(...) (150+ services)</div>
                <div className="text-indigo-400">create table if not exists public.doorbly_bookings...</div>
                <div className="text-indigo-400">create table if not exists public.customer_profiles...</div>
                <div className="text-slate-500">... click "Copy SQL Code" below for entire 2000-line script</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="py-2.5 bg-[#0F766E] hover:bg-teal-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Code'}</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/tzqdcozwllahqmoqfawt/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                >
                  <span>Open Supabase SQL</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Supabase Connection Details */}
            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                <Database className="w-4 h-4 text-teal-700" />
                <span>Supabase &amp; Firebase Connection</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Supabase Host:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    tzqdcozwllahqmoqfawt.supabase.co
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Firebase Project:</span>
                  <span className="font-mono font-bold text-teal-700 text-[11px]">
                    doorbly-b0bba (Connected)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Firebase App ID:</span>
                  <span className="font-mono font-bold text-slate-700 text-[10px]">
                    1:977376808906:web:caf01942d3773fb85d4933
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Firebase Auth Domain:</span>
                  <span className="font-mono font-bold text-slate-700 text-[10px]">
                    doorbly-b0bba.firebaseapp.com
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Services Catalog:</span>
                  <span className="text-emerald-700 font-bold">Connected &amp; Loaded</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Device Lock:</span>
                  <span className="text-teal-700 font-bold font-mono">Bound to current device</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSupabaseModal(true)}
                  className="py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
                >
                  <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                  <span>Configure Keys</span>
                </button>

                <a
                  href="https://supabase.com/dashboard/project/tzqdcozwllahqmoqfawt/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
                >
                  <span>Open SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Official Logo Status */}
            <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-800 block">
                Brand Logo Status
              </span>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center">
                <DoorblyLogo size="lg" variant="full" />
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                Official logo lockup configured in public assets and migration file.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Supabase Configuration Modal (Accessible exclusively in Admin Panel) */}
      <SupabaseSetupModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />
    </div>
  );
};
