import { getSupabase } from '../lib/supabaseClient';
import { CatalogService, ServiceCategory, CategoryType } from '../types/supabase';
import { FALLBACK_CATEGORIES, FALLBACK_SERVICES } from '../data/fallbackCatalog';
import {
  turboQuery,
  getCachedData,
  getResolvedSchemaTarget,
  setResolvedSchemaTarget
} from './supabaseTurboEngine';

export interface CategoryGroup {
  name: string;
  code: string;
  type: CategoryType | string;
  count: number;
}

export interface CatalogResult {
  services: CatalogService[];
  categories: CategoryGroup[];
  categoriesByType: Record<string, CategoryGroup[]>;
}

export interface FetchServicesParams {
  categoryCode?: string;
  categoryType?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  forceRefresh?: boolean;
}

export interface FetchServicesResult {
  services: CatalogService[];
  totalCount: number;
  hasMore: boolean;
  error: string | null;
}

export interface FetchCategoriesResult {
  categories: ServiceCategory[];
  error: string | null;
}

function filterServicesInMemory(
  sourceServices: CatalogService[],
  params: FetchServicesParams = {}
): FetchServicesResult {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, params.pageSize || 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let filtered = sourceServices;

  if (params.categoryCode && params.categoryCode !== 'ALL') {
    const targetCode = params.categoryCode.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.category_name.toLowerCase() === targetCode ||
        s.category_code?.toLowerCase() === targetCode
    );
  }

  if (params.categoryType && params.categoryType !== 'ALL') {
    const t = params.categoryType.toUpperCase();
    filtered = filtered.filter((s) => (s.category_type || 'DOORSTEP').toUpperCase().includes(t));
  }

  if (params.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.service_name.toLowerCase().includes(q) ||
        (s.subcategory && s.subcategory.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.category_name.toLowerCase().includes(q)
    );
  }

  const paged = filtered.slice(from, to + 1);

  return {
    services: paged,
    totalCount: filtered.length,
    hasMore: to < filtered.length - 1,
    error: null
  };
}

function getFilteredFallbackCategories(categoryType?: string): ServiceCategory[] {
  if (!categoryType || categoryType === 'ALL') {
    return FALLBACK_CATEGORIES;
  }
  const target = categoryType.toUpperCase();
  return FALLBACK_CATEGORIES.filter((c) =>
    (c.category_type || 'DOORSTEP').toUpperCase().includes(target)
  );
}

/**
 * Loads service categories via the Supabase Turbo Engine (0ms L1/L2 SWR cache + schema memoization).
 */
export async function fetchCategories(categoryType?: string): Promise<FetchCategoriesResult> {
  const allCats = await turboQuery<ServiceCategory[]>(
    'catalog_categories_all',
    async () => {
      const supabase = getSupabase();
      if (!supabase) return FALLBACK_CATEGORIES;

      const preferredTable = getResolvedSchemaTarget('categories');

      if (!preferredTable || preferredTable === 'doorbly_service_categories') {
        const { data, error } = await supabase
          .from('doorbly_service_categories')
          .select('id, category_name, description, active')
          .eq('active', true)
          .order('category_name', { ascending: true });

        if (!error && data && data.length > 0) {
          setResolvedSchemaTarget('categories', 'doorbly_service_categories');
          return data.map((c: any, idx: number) => ({
            id: c.id,
            category_code: c.category_name,
            category_name: c.category_name,
            category_type: 'DOORSTEP' as CategoryType,
            description: c.description,
            sort_order: idx + 1,
            active: c.active ?? true,
            image: null
          }));
        }
      }

      if (!preferredTable || preferredTable === 'doorbly_customer_service_catalog') {
        const { data: viewData, error: viewError } = await supabase
          .from('doorbly_customer_service_catalog')
          .select('category_code, category_name, category_type')
          .eq('active', true);

        if (!viewError && viewData && viewData.length > 0) {
          setResolvedSchemaTarget('categories', 'doorbly_customer_service_catalog');
          const catMap = new Map<string, ServiceCategory>();
          for (const row of viewData) {
            if (!row.category_code) continue;
            if (!catMap.has(row.category_code)) {
              catMap.set(row.category_code, {
                id: row.category_code,
                category_code: row.category_code,
                category_name: row.category_name || row.category_code,
                category_type: (row.category_type as CategoryType) || 'DOORSTEP',
                description: null,
                sort_order: catMap.size + 1,
                active: true,
                image: null
              });
            }
          }
          return Array.from(catMap.values());
        }
      }

      return FALLBACK_CATEGORIES;
    },
    { ttlMs: 300_000, staleWhileRevalidate: true }
  ).catch(() => getFilteredFallbackCategories(categoryType));

  if (!categoryType || categoryType === 'ALL') {
    return { categories: allCats, error: null };
  }
  const target = categoryType.toUpperCase();
  return {
    categories: allCats.filter((c) => (c.category_type || 'DOORSTEP').toUpperCase().includes(target)),
    error: null
  };
}

/**
 * Loads full service catalog into Turbo L1/L2 cache once and performs sub-millisecond filtering/pagination.
 */
async function fetchAllServicesCached(forceRefresh = false): Promise<CatalogService[]> {
  return turboQuery<CatalogService[]>(
    'catalog_services_all',
    async () => {
      const supabase = getSupabase();
      if (!supabase) return FALLBACK_SERVICES;

      const preferredView = getResolvedSchemaTarget('services');

      // 1. Try doorbly_customer_services view
      if (!preferredView || preferredView === 'doorbly_customer_services') {
        const { data: csData, error: csError } = await supabase
          .from('doorbly_customer_services')
          .select('id, category_name, subcategory, service_name, description, customer_hourly_price, unit, skill_level')
          .order('service_name', { ascending: true })
          .limit(300);

        if (!csError && csData && csData.length > 0) {
          setResolvedSchemaTarget('services', 'doorbly_customer_services');
          return csData.map((s: any) => ({
            id: s.id,
            category_name: s.category_name,
            category_code: s.category_name,
            category_type: 'DOORSTEP' as CategoryType,
            subcategory: s.subcategory,
            service_name: s.service_name,
            description: s.description,
            pricing_unit: s.unit ? `per ${s.unit}` : 'per hour',
            unit: s.unit || 'hour',
            price: Number(s.customer_hourly_price || 0),
            customer_hourly_price: Number(s.customer_hourly_price || 0),
            skill_level: s.skill_level,
            active: true,
            image: null
          }));
        }
      }

      // 2. Try doorbly_services table directly
      if (!preferredView || preferredView === 'doorbly_services') {
        const { data: dData, error: dError } = await supabase
          .from('doorbly_services')
          .select('id, service_name, subcategory, description, unit, customer_hourly_price, skill_level')
          .eq('active', true)
          .order('service_name', { ascending: true })
          .limit(300);

        if (!dError && dData && dData.length > 0) {
          setResolvedSchemaTarget('services', 'doorbly_services');
          return dData.map((s: any) => ({
            id: s.id,
            category_name: s.subcategory || 'Services',
            category_code: s.subcategory || 'Services',
            category_type: 'DOORSTEP' as CategoryType,
            subcategory: s.subcategory,
            service_name: s.service_name,
            description: s.description,
            pricing_unit: s.unit ? `per ${s.unit}` : 'per hour',
            unit: s.unit || 'hour',
            price: Number(s.customer_hourly_price || 0),
            customer_hourly_price: Number(s.customer_hourly_price || 0),
            skill_level: s.skill_level,
            active: true,
            image: null
          }));
        }
      }

      return FALLBACK_SERVICES;
    },
    { ttlMs: 300_000, staleWhileRevalidate: true, forceRefresh }
  ).catch(() => FALLBACK_SERVICES);
}

/**
 * Instantaneous service retrieval powered by Turbo L1/L2 cache
 */
export async function fetchServices(params: FetchServicesParams = {}): Promise<FetchServicesResult> {
  // Fast path: if already in L1 memory cache and not forcing refresh, filter in 0ms
  if (!params.forceRefresh) {
    const cached = getCachedData<CatalogService[]>('catalog_services_all');
    if (cached.data && cached.data.length > 0) {
      if (cached.isStale) {
        void fetchAllServicesCached(true);
      }
      return filterServicesInMemory(cached.data, params);
    }
  }

  const allServices = await fetchAllServicesCached(params.forceRefresh);
  return filterServicesInMemory(allServices, params);
}

/**
 * Parallelized catalog loader (fetches categories and services concurrently via Promise.all)
 */
export async function fetchCustomerCatalog(): Promise<CatalogResult> {
  const [catRes, allServices] = await Promise.all([
    fetchCategories(),
    fetchAllServicesCached()
  ]);

  const categoryMap = new Map<string, CategoryGroup>();
  const categoriesByType: Record<string, CategoryGroup[]> = {
    DOORSTEP: [],
    FREELANCE: [],
    CORPORATE: []
  };

  for (const cat of catRes.categories) {
    const nameUpper = (cat.category_name || '').toUpperCase();
    const rawType = (cat.category_type || '').toUpperCase();
    let typeKey: 'DOORSTEP' | 'FREELANCE' | 'CORPORATE' = 'DOORSTEP';

    if (
      rawType.includes('FREE') ||
      nameUpper.includes('FREELANCE') ||
      nameUpper.includes('DIGITAL') ||
      nameUpper.includes('GRAPHIC') ||
      nameUpper.includes('WEBSITE') ||
      nameUpper.includes('SOFTWARE') ||
      nameUpper.includes('PHOTOGRAPHY') ||
      nameUpper.includes('EDUCATION') ||
      nameUpper.includes('TRAINING')
    ) {
      typeKey = 'FREELANCE';
    } else if (
      rawType.includes('CORP') ||
      nameUpper.includes('CORPORATE') ||
      nameUpper.includes('BUSINESS') ||
      nameUpper.includes('LEGAL') ||
      nameUpper.includes('FINANCIAL') ||
      nameUpper.includes('SECURITY') ||
      nameUpper.includes('FACILITY') ||
      nameUpper.includes('LOGISTICS') ||
      nameUpper.includes('REAL ESTATE')
    ) {
      typeKey = 'CORPORATE';
    }

    const group: CategoryGroup = {
      name: cat.category_name,
      code: cat.category_code || cat.category_name,
      type: typeKey,
      count: 0
    };

    categoryMap.set(group.code, group);
    categoriesByType[typeKey].push(group);
  }

  for (const service of allServices) {
    const code = service.category_code || service.category_name;
    const group = categoryMap.get(code);
    if (group) {
      group.count++;
    }
  }

  return {
    services: allServices,
    categories: Array.from(categoryMap.values()),
    categoriesByType
  };
}

/**
 * Instant search across cached service catalog
 */
export async function searchServices(query: string, limit: number = 10): Promise<CatalogService[]> {
  const result = await fetchServices({ searchQuery: query, pageSize: limit });
  return result.services;
}

export function formatCustomerPrice(price: number | string | undefined | null, pricingUnit?: string): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price || 0));
  const formatted = isNaN(num) ? '₹0' : `₹${Math.round(num)}`;
  if (!pricingUnit) return formatted;
  const unitClean = pricingUnit.replace(/^per\s+/i, '');
  return `${formatted}/${unitClean}`;
}
