export interface AgentProfile {
  id: string;
  name: string;
  phone: string | null;
  rating: number | null;
  totalJobs: number | null;
  vehicleNumber: string | null;
  badgeText: string;
}

export interface WalletTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'topup' | 'booking' | 'coin_reward' | 'pass' | 'referral' | 'tip';
  timestamp: string;
}

export interface PromoCoupon {
  code: string;
  title: string;
  description: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxDiscount?: number;
  minOrder: number;
  badge: string;
}

export interface SavedPlace {
  id: 'home' | 'work' | 'other';
  label: string;
  address: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'agent';
  text: string;
  time: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export type DispatchTier = 'express' | 'standard' | 'pro';

export interface DispatchTierInfo {
  id: DispatchTier;
  name: string;
  tagline: string;
  etaText: string;
  surcharge: number;
  badge: string;
}

export const DISPATCH_TIERS: DispatchTierInfo[] = [
  {
    id: 'express',
    name: 'Doorbly Express Agent',
    tagline: 'Instant dispatch • Nearest verified agent',
    etaText: '30–45 mins',
    surcharge: 49,
    badge: 'FASTEST'
  },
  {
    id: 'standard',
    name: 'Doorbly Standard',
    tagline: 'Scheduled slot • Zero convenience surcharge',
    etaText: 'On Time Slot',
    surcharge: 0,
    badge: 'POPULAR'
  },
  {
    id: 'pro',
    name: 'Doorbly Pro Agent',
    tagline: 'Senior specialist technician + diagnostic kit',
    etaText: 'Priority Slot',
    surcharge: 99,
    badge: 'TOP RATED'
  }
];

export const PROMO_COUPONS: PromoCoupon[] = [
  {
    code: 'FIRST50',
    title: 'Flat ₹50 OFF',
    description: 'Instant ₹50 discount on any doorstep service booking',
    discountType: 'flat',
    discountValue: 50,
    minOrder: 199,
    badge: 'WELCOME OFFER'
  },
  {
    code: 'RAPID20',
    title: '20% OFF up to ₹150',
    description: 'Save 20% on Express Agent & priority doorstep bookings',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 150,
    minOrder: 249,
    badge: 'EXPRESS SPECIAL'
  },
  {
    code: 'ODISHA100',
    title: 'Flat ₹100 OFF',
    description: 'Special Odisha discount on bookings above ₹499',
    discountType: 'flat',
    discountValue: 100,
    minOrder: 499,
    badge: 'SUPER SAVER'
  },
  {
    code: 'CORP15',
    title: '15% OFF Corporate & Freelance',
    description: 'Save up to ₹250 on business, IT, and freelance services',
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 250,
    minOrder: 399,
    badge: 'PRO DEAL'
  }
];

const STORAGE_KEYS = {
  WALLET: 'doorbly_wallet_state_v2',
  PLACES: 'doorbly_saved_places_v2',
  SOS_CONTACTS: 'doorbly_sos_contacts_v2',
  CHATS: 'doorbly_agent_chats_v2',
  RATINGS: 'doorbly_agent_ratings_v2'
};

export interface WalletState {
  balance: number;
  coins: number;
  powerPassActive: boolean;
  powerPassExpiry: string | null;
  transactions: WalletTransaction[];
}

// Clean zero-initial state (no fake/demo transactions or balances)
const INITIAL_WALLET: WalletState = {
  balance: 0,
  coins: 0,
  powerPassActive: false,
  powerPassExpiry: null,
  transactions: []
};

const listeners = new Set<() => void>();
function notifyChange() {
  listeners.forEach((fn) => fn());
}

export function subscribeRapidoState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getWalletState(): WalletState {
  if (typeof window === 'undefined') return INITIAL_WALLET;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET);
    if (!raw) {
      return INITIAL_WALLET;
    }
    return JSON.parse(raw) as WalletState;
  } catch {
    return INITIAL_WALLET;
  }
}

export function saveWalletState(state: WalletState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.WALLET, JSON.stringify(state));
  notifyChange();
}

export function addMoneyToWallet(amount: number, method: string): WalletState {
  const current = getWalletState();
  const updated: WalletState = {
    ...current,
    balance: current.balance + amount,
    transactions: [
      {
        id: `tx-${Date.now()}`,
        title: `Added via ${method}`,
        amount,
        type: 'credit',
        category: 'topup',
        timestamp: new Date().toISOString()
      },
      ...current.transactions
    ]
  };
  saveWalletState(updated);
  return updated;
}

export function activatePowerPass(): { success: boolean; message: string; state: WalletState } {
  const current = getWalletState();
  if (current.powerPassActive) {
    return { success: true, message: 'Doorbly Power Pass is already active!', state: current };
  }
  const passCost = 99;
  const newBalance = current.balance >= passCost ? current.balance - passCost : current.balance;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  const updated: WalletState = {
    ...current,
    balance: newBalance,
    powerPassActive: true,
    powerPassExpiry: expiry.toISOString().split('T')[0],
    transactions: [
      {
        id: `tx-pass-${Date.now()}`,
        title: 'Doorbly Power Pass Activated (30 Days)',
        amount: passCost,
        type: 'debit',
        category: 'pass',
        timestamp: new Date().toISOString()
      },
      ...current.transactions
    ]
  };
  saveWalletState(updated);
  return {
    success: true,
    message: 'Doorbly Power Pass activated! Enjoy flat 15% OFF on bookings.',
    state: updated
  };
}

export function recordBookingWalletReward(
  serviceName: string,
  paidFromWallet: number,
  coinsRedeemed: number,
  totalAmount: number
): void {
  const current = getWalletState();
  const earnedCoins = Math.max(0, Math.round(totalAmount * 0.05));
  const nextTransactions = [...current.transactions];

  if (paidFromWallet > 0) {
    nextTransactions.unshift({
      id: `tx-pay-${Date.now()}`,
      title: `Paid for ${serviceName}`,
      amount: paidFromWallet,
      type: 'debit',
      category: 'booking',
      timestamp: new Date().toISOString()
    });
  }

  const updated: WalletState = {
    ...current,
    balance: Math.max(0, current.balance - paidFromWallet),
    coins: Math.max(0, current.coins - coinsRedeemed + earnedCoins),
    transactions: nextTransactions
  };
  saveWalletState(updated);
}

// Deterministic 4-digit Start PIN derived from the real booking ID
export function getBookingStartPin(bookingId: string): string {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    hash = (hash * 31 + bookingId.charCodeAt(i)) % 9000;
  }
  const pin = 1000 + Math.abs(hash % 9000);
  return String(pin);
}

// Saved Places Management (empty until user saves their own real places)
export function getSavedPlaces(): SavedPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLACES);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlace[];
  } catch {
    return [];
  }
}

export function savePlace(place: SavedPlace): SavedPlace[] {
  const current = getSavedPlaces();
  const filtered = current.filter((p) => p.id !== place.id);
  const updated = [...filtered, place];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PLACES, JSON.stringify(updated));
    notifyChange();
  }
  return updated;
}

// Emergency Contacts Management (empty until user adds their real contacts)
export function getEmergencyContacts(): EmergencyContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SOS_CONTACTS);
    if (!raw) return [];
    return JSON.parse(raw) as EmergencyContact[];
  } catch {
    return [];
  }
}

export function addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): EmergencyContact[] {
  const current = getEmergencyContacts();
  const updated: EmergencyContact[] = [
    ...current,
    {
      ...contact,
      id: `ec-${Date.now()}`
    }
  ];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SOS_CONTACTS, JSON.stringify(updated));
    notifyChange();
  }
  return updated;
}

export function removeEmergencyContact(id: string): EmergencyContact[] {
  const current = getEmergencyContacts().filter((c) => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.SOS_CONTACTS, JSON.stringify(current));
    notifyChange();
  }
  return current;
}

// Agent Rating & Tip Storage
export interface BookingRatingRecord {
  bookingId: string;
  stars: number;
  tags: string[];
  tipAmount: number;
  feedback?: string;
}

export function getBookingRating(bookingId: string): BookingRatingRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.RATINGS}_${bookingId}`);
    return raw ? (JSON.parse(raw) as BookingRatingRecord) : null;
  } catch {
    return null;
  }
}

export function saveBookingRating(record: BookingRatingRecord): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEYS.RATINGS}_${record.bookingId}`, JSON.stringify(record));
  notifyChange();
}
