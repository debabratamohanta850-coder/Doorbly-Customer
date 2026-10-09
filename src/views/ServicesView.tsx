import React, { useState, useEffect, useCallback } from 'react';
import { CatalogService, ServiceCategory, CategoryType } from '../types/supabase';
import { fetchCategories, fetchServices, formatCustomerPrice } from '../services/catalogService';
import { useCart } from '../context/CartContext';
import {
  Search,
  X,
  Clock,
  Layers,
  RefreshCw,
  Home as HomeIcon,
  Briefcase,
  Building2,
  AlertCircle,
  ArrowDown,
  ShoppingBag,
  Check
} from 'lucide-react';

interface Props {
  onSelectService: (service: CatalogService, scheduleMode?: boolean) => void;
  initialType?: CategoryType | 'ALL';
  initialCategoryCode?: string;
}

export const ServicesView: React.FC<Props> = ({
  onSelectService,
  initialType = 'ALL',
  initialCategoryCode = 'ALL'
}) => {
  const { addToCart, isInCart } = useCart();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<CategoryType | 'ALL'>(initialType);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(initialCategoryCode);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [services, setServices] = useState<CatalogService[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [detailService, setDetailService] = useState<CatalogService | null>(null);
  const [detailNotes, setDetailNotes] = useState('');

  useEffect(() => {
    setSelectedType(initialType);
  }, [initialType]);

  useEffect(() => {
    setSelectedCategoryCode(initialCategoryCode);
  }, [initialCategoryCode]);

  // Debounce search input for responsive database queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load categories dynamically from Supabase
  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetchCategories(selectedType);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setCategories(res.categories);
      }
    } catch {
      setErrorMsg('Please check your internet connection and try again.');
    } finally {
      setCategoriesLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load services dynamically from Supabase with pagination, category filter & search
  const loadServices = useCallback(
    async (isInitial: boolean = false, targetPage: number = 1) => {
      if (isInitial) {
        setLoading(true);
        setErrorMsg(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await fetchServices({
          categoryCode: selectedCategoryCode !== 'ALL' ? selectedCategoryCode : undefined,
          categoryType: selectedType !== 'ALL' ? selectedType : undefined,
          searchQuery: debouncedSearch || undefined,
          page: targetPage,
          pageSize: 20
        });

        if (res.error) {
          setErrorMsg(res.error);
          if (isInitial) setServices([]);
        } else {
          setErrorMsg(null);
          setTotalCount(res.totalCount);
          setHasMore(res.hasMore);
          setPage(targetPage);

          if (isInitial) {
            setServices(res.services);
          } else {
            setServices((prev) => [...prev, ...res.services]);
          }
        }
      } catch {
        setErrorMsg('Please check your internet connection and try again.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategoryCode, selectedType, debouncedSearch]
  );

  useEffect(() => {
    loadServices(true, 1);
  }, [loadServices]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadServices(false, page + 1);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryCode('ALL');
    setSelectedType('ALL');
  };

  return (
    <div className="flex-1 overflow-y-auto pb-28 bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-[#0F766E] text-white px-5 pt-4 pb-5 rounded-b-3xl shadow-xs shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Doorbly Services</h1>
            <p className="text-xs text-teal-100/90 mt-0.5">
              Doorstep, freelance &amp; corporate service catalog
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadCategories();
              loadServices(true, 1);
            }}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Fast Service Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for any service"
            className="w-full pl-10 pr-9 py-2.5 bg-white rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Type Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 rounded-xl text-[11px] font-bold text-slate-600">
          <button
            type="button"
            onClick={() => {
              setSelectedType('ALL');
              setSelectedCategoryCode('ALL');
            }}
            className={`py-2 rounded-lg transition-colors ${
              selectedType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedType('DOORSTEP');
              setSelectedCategoryCode('ALL');
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
              selectedType === 'DOORSTEP' ? 'bg-[#0F766E] text-white shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <HomeIcon className="w-3 h-3" />
            <span>Doorstep</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedType('FREELANCE');
              setSelectedCategoryCode('ALL');
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
              selectedType === 'FREELANCE' ? 'bg-[#0F766E] text-white shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>Freelance</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedType('CORPORATE');
              setSelectedCategoryCode('ALL');
            }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 ${
              selectedType === 'CORPORATE' ? 'bg-[#0F766E] text-white shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Corporate</span>
          </button>
        </div>

        {/* Dynamic Category Filter Controls */}
        {categoriesLoading ? (
          <div className="flex items-center space-x-2 overflow-hidden py-1">
            <div className="h-7 w-20 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-7 w-24 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-7 w-28 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-3 bg-slate-100 rounded-xl text-center text-xs text-slate-500">
            No categories available.
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategoryCode('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-lg border transition-colors text-[11px] font-semibold ${
                selectedCategoryCode === 'ALL'
                  ? 'bg-[#0F766E] text-white border-[#0F766E]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category_code}
                type="button"
                onClick={() => setSelectedCategoryCode(cat.category_code)}
                className={`shrink-0 px-3 py-1.5 rounded-lg border transition-colors text-[11px] font-semibold ${
                  selectedCategoryCode === cat.category_code
                    ? 'bg-[#0F766E] text-white border-[#0F766E]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat.category_name}
              </button>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between text-xs text-rose-800">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                loadCategories();
                loadServices(true, 1);
              }}
              className="ml-3 px-3 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg shrink-0 hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Services List */}
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200/70 animate-pulse rounded-2xl border border-slate-200" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {debouncedSearch ? 'No matching services found.' : 'No services available.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              {debouncedSearch
                ? `No service matches "${debouncedSearch}". Please try different keywords.`
                : 'No services are currently configured under this category.'}
            </p>
            {(debouncedSearch || selectedCategoryCode !== 'ALL' || selectedType !== 'ALL') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Showing {services.length} of {totalCount} service{totalCount === 1 ? '' : 's'}
              </span>
              <span>Available Today</span>
            </div>

            {services.map((srv) => {
              const inCart = isInCart(srv.id);
              return (
                <div
                  key={srv.id}
                  onClick={() => {
                    setDetailService(srv);
                    setDetailNotes('');
                  }}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-teal-600 transition-colors flex flex-col justify-between space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-500">
                        {srv.category_name}
                        {srv.subcategory ? ` · ${srv.subcategory}` : ''} ·{' '}
                        {srv.duration_minutes ? `${srv.duration_minutes} mins` : '60 mins'}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {srv.service_name}
                      </h3>
                      {srv.description && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {srv.description}
                        </p>
                      )}
                    </div>
                    {srv.image && (
                      <img
                        src={srv.image}
                        alt={srv.service_name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                      />
                    )}
                  </div>

                  <div
                    className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        Customer Price
                      </span>
                      <span className="text-sm font-extrabold text-[#0F766E]">
                        {formatCustomerPrice(srv.price, srv.pricing_unit)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => addToCart(srv)}
                        className={`px-3 py-2 font-bold text-xs rounded-xl border transition-colors flex items-center space-x-1 ${
                          inCart
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                        }`}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                        <span>{inCart ? 'In Cart' : 'Add to Cart'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectService(srv, false)}
                        className="px-4 py-2 bg-[#0F766E] hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-2xl shadow-2xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  {loadingMore ? (
                    <span className="inline-block w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-[#0F766E]" />
                  )}
                  <span>{loadingMore ? 'Loading More Services...' : 'Load More Services'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Service Detail Screen / Modal (Section 6) */}
      {detailService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="bg-[#0F766E] text-white p-5 relative shrink-0">
              <button
                type="button"
                onClick={() => setDetailService(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-teal-100">
                {detailService.category_name}
                {detailService.subcategory ? ` · ${detailService.subcategory}` : ''}
              </p>
              <h3 className="text-lg font-bold mt-1 leading-snug">
                {detailService.service_name}
              </h3>
              <p className="text-sm font-extrabold text-white mt-1">
                {formatCustomerPrice(detailService.price, detailService.pricing_unit)}
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
              {detailService.image && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-44">
                  <img
                    src={detailService.image}
                    alt={detailService.service_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-900 mb-1">Description</h4>
                <p className="leading-relaxed text-slate-600">
                  {detailService.description ||
                    'Professional doorstep service delivered by a verified Doorbly Agent.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Estimated Duration
                  </span>
                  <span className="font-bold text-slate-900 flex items-center space-x-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>
                      {detailService.duration_minutes
                        ? `${detailService.duration_minutes} mins`
                        : '60 mins'}
                    </span>
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Category
                  </span>
                  <span className="font-bold text-slate-900 block truncate mt-0.5">
                    {detailService.category_name}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1.5">What&apos;s Included</h4>
                <ul className="space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <li>• Doorstep service by a background-verified Doorbly Agent</li>
                  <li>• Transparent final customer pricing inclusive of applicable taxes</li>
                  <li>• Real-time agent tracking, direct call/chat, and GST tax invoice</li>
                </ul>
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1">
                  Specific Service Details (Optional)
                </label>
                <input
                  type="text"
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  placeholder="e.g., Appliance/vehicle type, number of rooms, or issue description"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(detailService, detailNotes.trim() || undefined);
                    setDetailService(null);
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = detailService;
                    setDetailService(null);
                    onSelectService(s, false);
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
