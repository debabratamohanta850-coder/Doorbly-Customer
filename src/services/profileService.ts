import { getSupabase } from '../lib/supabaseClient';
import {
  CustomerProfile,
  CustomerLocation,
  WalletTransaction,
  DoorblyCoupon,
  CustomerSupportTicket
} from '../types/supabase';
import {
  turboQuery,
  invalidateTurboCache,
  getResolvedSchemaTarget,
  setResolvedSchemaTarget
} from './supabaseTurboEngine';

const STORAGE_KEY_LOCATIONS = 'doorbly_saved_addresses_v1';
const STORAGE_KEY_TICKETS = 'doorbly_support_tickets_v1';

export async function fetchCustomerProfile(userId: string, email?: string): Promise<CustomerProfile | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  return turboQuery<CustomerProfile | null>(
    `profile_${userId}`,
    async () => {
      const preferredTable = getResolvedSchemaTarget('profiles');

      // 1. Try doorbly_customer_profiles by id
      if (!preferredTable || preferredTable === 'doorbly_customer_profiles') {
        const { data, error } = await supabase
          .from('doorbly_customer_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          setResolvedSchemaTarget('profiles', 'doorbly_customer_profiles');
          return data as CustomerProfile;
        }

        if (email) {
          const { data: byEmail } = await supabase
            .from('doorbly_customer_profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (byEmail) {
            setResolvedSchemaTarget('profiles', 'doorbly_customer_profiles');
            return byEmail as CustomerProfile;
          }
        }
      }

      // 2. Try customer_profiles table
      if (!preferredTable || preferredTable === 'customer_profiles') {
        const { data: cpData } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (cpData) {
          setResolvedSchemaTarget('profiles', 'customer_profiles');
          return {
            id: userId,
            full_name: cpData.full_name,
            email: email || null,
            mobile_number: cpData.mobile_number,
            profile_photo: null,
            address: cpData.address,
            city: cpData.city,
            district: cpData.district,
            pincode: cpData.pincode,
            latitude: cpData.latitude ? Number(cpData.latitude) : null,
            longitude: cpData.longitude ? Number(cpData.longitude) : null,
            wallet_balance: 0,
            referral_code: `DBLY-${userId.slice(0, 6).toUpperCase()}`,
            created_at: cpData.created_at,
            updated_at: cpData.updated_at
          };
        }
      }

      return null;
    },
    { ttlMs: 120_000, staleWhileRevalidate: true }
  ).catch(() => null);
}

export async function updateCustomerProfile(
  userId: string,
  updates: Partial<CustomerProfile>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { success: false, error: 'Please sign in to update your profile.' };
  }

  const now = new Date().toISOString();
  invalidateTurboCache(`profile_${userId}`);
  const payload = {
    ...updates,
    updated_at: now
  };

  try {
    // 1. Try doorbly_customer_profiles
    const { error } = await supabase
      .from('doorbly_customer_profiles')
      .upsert({ id: userId, ...payload });

    if (!error) {
      return { success: true };
    }

    // 2. Try customer_profiles
    const { error: cpError } = await supabase
      .from('customer_profiles')
      .upsert({
        user_id: userId,
        full_name: updates.full_name,
        mobile_number: updates.mobile_number,
        address: updates.address,
        city: updates.city,
        district: updates.district,
        pincode: updates.pincode,
        latitude: updates.latitude,
        longitude: updates.longitude,
        updated_at: now
      });

    if (!cpError) {
      return { success: true };
    }

    // 3. Try profiles
    const fallbackPayload: any = {
      id: userId,
      updated_at: now
    };
    if (updates.full_name !== undefined) fallbackPayload.full_name = updates.full_name;
    if (updates.mobile_number !== undefined) fallbackPayload.phone = updates.mobile_number;
    if (updates.profile_photo !== undefined) fallbackPayload.avatar_url = updates.profile_photo;

    const { error: fbError } = await supabase
      .from('profiles')
      .upsert(fallbackPayload);

    if (!fbError) {
      return { success: true };
    }

    return { success: false, error: 'Could not update your profile. Please try again.' };
  } catch {
    return { success: false, error: 'Could not update your profile. Please try again.' };
  }
}

// ============================================================
// SAVED ADDRESSES (Home, Office, Other)
// ============================================================

function getLocalAddresses(userId: string): CustomerLocation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_LOCATIONS}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAddresses(userId: string, list: CustomerLocation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_LOCATIONS}_${userId}`, JSON.stringify(list));
  } catch {}
}

export async function fetchCustomerLocations(userId: string): Promise<CustomerLocation[]> {
  const supabase = getSupabase();
  if (!userId) return [];

  if (supabase) {
    try {
      // 1. Try doorbly_customer_locations
      const { data, error } = await supabase
        .from('doorbly_customer_locations')
        .select('*')
        .eq('customer_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        saveLocalAddresses(userId, data as CustomerLocation[]);
        return data as CustomerLocation[];
      }

      // 2. Try customer_locations
      const { data: fbData, error: fbError } = await supabase
        .from('customer_locations')
        .select('*')
        .eq('customer_id', userId)
        .order('is_default', { ascending: false });

      if (!fbError && fbData) {
        const mapped: CustomerLocation[] = fbData.map((l: any) => ({
          id: l.id,
          customer_id: l.customer_id,
          label: l.label || 'Home',
          address_line: l.address_line,
          city: l.city,
          district: l.district || null,
          state: l.state || 'Odisha',
          pincode: l.postal_code || l.pincode || null,
          latitude: l.latitude,
          longitude: l.longitude,
          is_default: !!l.is_default,
          created_at: l.created_at
        }));
        saveLocalAddresses(userId, mapped);
        return mapped;
      }
    } catch {}
  }

  return getLocalAddresses(userId);
}

export async function saveCustomerAddress(
  userId: string,
  addr: Omit<CustomerLocation, 'id' | 'customer_id' | 'created_at'> & { id?: string }
): Promise<{ address?: CustomerLocation; error?: string }> {
  const supabase = getSupabase();
  if (!userId) return { error: 'Please sign in to save addresses.' };

  const isDefault = addr.is_default ?? false;

  if (supabase) {
    try {
      if (isDefault) {
        await supabase
          .from('doorbly_customer_locations')
          .update({ is_default: false })
          .eq('customer_id', userId);
      }

      if (addr.id && !addr.id.startsWith('local-')) {
        const { data, error } = await supabase
          .from('doorbly_customer_locations')
          .update({
            label: addr.label,
            address_line: addr.address_line.trim(),
            city: addr.city?.trim() || null,
            district: addr.district?.trim() || null,
            state: addr.state || 'Odisha',
            pincode: addr.pincode?.trim() || null,
            latitude: addr.latitude,
            longitude: addr.longitude,
            is_default: isDefault
          })
          .eq('id', addr.id)
          .eq('customer_id', userId)
          .select()
          .single();

        if (!error && data) {
          return { address: data as CustomerLocation };
        }
      } else {
        const { data, error } = await supabase
          .from('doorbly_customer_locations')
          .insert({
            customer_id: userId,
            label: addr.label,
            address_line: addr.address_line.trim(),
            city: addr.city?.trim() || null,
            district: addr.district?.trim() || null,
            state: addr.state || 'Odisha',
            pincode: addr.pincode?.trim() || null,
            latitude: addr.latitude,
            longitude: addr.longitude,
            is_default: isDefault
          })
          .select()
          .single();

        if (!error && data) {
          return { address: data as CustomerLocation };
        }
      }
    } catch {}
  }

  // Safe local sync if database table is not yet migrated
  const existing = getLocalAddresses(userId);
  let updatedList = isDefault ? existing.map((item) => ({ ...item, is_default: false })) : [...existing];

  const savedItem: CustomerLocation = {
    id: addr.id || `local-${Date.now()}`,
    customer_id: userId,
    label: addr.label,
    address_line: addr.address_line.trim(),
    city: addr.city?.trim() || null,
    district: addr.district?.trim() || null,
    state: addr.state || 'Odisha',
    pincode: addr.pincode?.trim() || null,
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
    is_default: isDefault || updatedList.length === 0,
    created_at: new Date().toISOString()
  };

  if (addr.id) {
    updatedList = updatedList.map((item) => (item.id === addr.id ? savedItem : item));
  } else {
    updatedList = [savedItem, ...updatedList];
  }

  saveLocalAddresses(userId, updatedList);
  return { address: savedItem };
}

export async function deleteCustomerAddress(userId: string, addressId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase && !addressId.startsWith('local-')) {
    try {
      await supabase
        .from('doorbly_customer_locations')
        .delete()
        .eq('id', addressId)
        .eq('customer_id', userId);
    } catch {}
  }

  const existing = getLocalAddresses(userId).filter((a) => a.id !== addressId);
  saveLocalAddresses(userId, existing);
  return true;
}

export async function setDefaultCustomerAddress(userId: string, addressId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase && !addressId.startsWith('local-')) {
    try {
      await supabase
        .from('doorbly_customer_locations')
        .update({ is_default: false })
        .eq('customer_id', userId);
      await supabase
        .from('doorbly_customer_locations')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('customer_id', userId);
    } catch {}
  }

  const existing = getLocalAddresses(userId).map((a) => ({
    ...a,
    is_default: a.id === addressId
  }));
  saveLocalAddresses(userId, existing);
  return true;
}

// ============================================================
// CUSTOMER WALLET (Real Balance & Transactions — Never Fake Money)
// ============================================================

export async function fetchCustomerWallet(userId: string): Promise<{
  balance: number;
  transactions: WalletTransaction[];
}> {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { balance: 0, transactions: [] };
  }

  try {
    const { data: txData, error: txError } = await supabase
      .from('doorbly_wallet_transactions')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    const transactions: WalletTransaction[] = !txError && txData ? (txData as WalletTransaction[]) : [];

    // Compute real balance from completed transactions or profile column
    let calculatedBalance = 0;
    for (const tx of transactions) {
      if (tx.status === 'COMPLETED') {
        if (tx.type === 'CREDIT' || tx.type === 'REFUND' || tx.type === 'CASHBACK') {
          calculatedBalance += Number(tx.amount || 0);
        } else if (tx.type === 'DEBIT') {
          calculatedBalance -= Number(tx.amount || 0);
        }
      }
    }

    const { data: profData } = await supabase
      .from('doorbly_customer_profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle();

    const profileBalance = profData?.wallet_balance != null ? Number(profData.wallet_balance) : null;
    const finalBalance = transactions.length > 0 ? Math.max(0, calculatedBalance) : Math.max(0, profileBalance ?? 0);

    return {
      balance: finalBalance,
      transactions
    };
  } catch {
    return { balance: 0, transactions: [] };
  }
}

// ============================================================
// COUPONS & OFFERS (Real Backend Validation Only)
// ============================================================

export async function fetchAvailableCoupons(): Promise<DoorblyCoupon[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('doorbly_coupons')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const now = new Date();
      return (data as DoorblyCoupon[]).filter(
        (c) => !c.expires_at || new Date(c.expires_at) > now
      );
    }
  } catch {}

  return [];
}

export async function validateCouponCode(
  code: string,
  bookingSubtotal: number,
  categoryName?: string
): Promise<{ valid: boolean; coupon?: DoorblyCoupon; discountAmount: number; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, message: 'Please enter a coupon code.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { valid: false, discountAmount: 0, message: 'Unable to verify coupon right now.' };
  }

  try {
    const { data, error } = await supabase
      .from('doorbly_coupons')
      .select('*')
      .ilike('code', cleanCode)
      .eq('active', true)
      .maybeSingle();

    if (error || !data) {
      return { valid: false, discountAmount: 0, message: 'Invalid or expired coupon code.' };
    }

    const coupon = data as DoorblyCoupon;

    if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
      return { valid: false, discountAmount: 0, message: 'This coupon has expired.' };
    }

    if (bookingSubtotal < Number(coupon.min_booking_value || 0)) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum booking value of ₹${coupon.min_booking_value} required for this coupon.`
      };
    }

    if (
      coupon.eligible_category &&
      categoryName &&
      coupon.eligible_category.toLowerCase() !== categoryName.toLowerCase()
    ) {
      return {
        valid: false,
        discountAmount: 0,
        message: `This coupon is only valid for ${coupon.eligible_category} services.`
      };
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'FLAT') {
      discountAmount = Number(coupon.discount_value || 0);
    } else {
      discountAmount = Math.round((bookingSubtotal * Number(coupon.discount_value || 0)) / 100);
      if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
        discountAmount = Number(coupon.max_discount);
      }
    }

    discountAmount = Math.min(discountAmount, bookingSubtotal);

    return {
      valid: true,
      coupon,
      discountAmount,
      message: `Coupon ${coupon.code} applied! You saved ₹${discountAmount}.`
    };
  } catch {
    return { valid: false, discountAmount: 0, message: 'Could not validate coupon code.' };
  }
}

// ============================================================
// CUSTOMER SUPPORT & SAFETY TICKETS
// ============================================================

export async function fetchCustomerSupportTickets(userId: string): Promise<CustomerSupportTicket[]> {
  const supabase = getSupabase();
  if (!userId) return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('doorbly_customer_support_tickets')
        .select('*')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as CustomerSupportTicket[];
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_TICKETS}_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {}
  }
  return [];
}

export async function createSupportTicket(params: {
  customerId: string;
  bookingId?: string | null;
  issueCategory: CustomerSupportTicket['issue_category'];
  subject: string;
  description: string;
}): Promise<{ ticket?: CustomerSupportTicket; error?: string }> {
  const supabase = getSupabase();
  if (!params.customerId) {
    return { error: 'Please sign in to submit a support request.' };
  }

  const payload = {
    customer_id: params.customerId,
    booking_id: params.bookingId || null,
    issue_category: params.issueCategory,
    subject: params.subject.trim(),
    description: params.description.trim(),
    status: 'OPEN' as const
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('doorbly_customer_support_tickets')
        .insert(payload)
        .select()
        .single();

      if (!error && data) {
        return { ticket: data as CustomerSupportTicket };
      }
    } catch {}
  }

  const fallbackTicket: CustomerSupportTicket = {
    id: `TKT-${Date.now().toString().slice(-6)}`,
    ...payload,
    created_at: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const existing = await fetchCustomerSupportTickets(params.customerId);
      localStorage.setItem(
        `${STORAGE_KEY_TICKETS}_${params.customerId}`,
        JSON.stringify([fallbackTicket, ...existing])
      );
    } catch {}
  }

  return { ticket: fallbackTicket };
}
