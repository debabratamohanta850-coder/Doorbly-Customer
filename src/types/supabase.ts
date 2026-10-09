export type CategoryType = 'DOORSTEP' | 'FREELANCE' | 'CORPORATE';

export type CanonicalBookingStatus =
  | 'PENDING'
  | 'SEARCHING_PARTNER'
  | 'PARTNER_ASSIGNED'
  | 'PARTNER_ACCEPTED'
  | 'PARTNER_ON_THE_WAY'
  | 'PARTNER_ARRIVED'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_PARTNER'
  | 'CANCELLED_BY_DOORBLY'
  | 'NO_PARTNER_AVAILABLE'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type DoorblyBookingStatus =
  | CanonicalBookingStatus
  | 'Pending'
  | 'Searching Partner'
  | 'Partner Assigned'
  | 'Accepted'
  | 'Partner Accepted'
  | 'On The Way'
  | 'Partner Arrived'
  | 'Started'
  | 'Completed'
  | 'Cancelled'
  | 'Scheduled'
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DoorblyPaymentStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'Pending'
  | 'Paid'
  | 'Failed'
  | 'pending'
  | 'paid'
  | 'failed';

export type ServiceSkillLevel =
  | 'Unskilled'
  | 'Semi-Skilled'
  | 'Skilled'
  | 'Highly Skilled'
  | 'Professional';

export interface CatalogService {
  id: string;
  service_code?: string;
  category_code?: string;
  category_name: string;
  category_type?: CategoryType | string;
  subcategory?: string | null;
  service_name: string;
  description: string | null;
  pricing_unit: string;
  price: number;
  customer_hourly_price?: number;
  provider_hourly_rate?: number;
  doorbly_charge?: number;
  unit?: string;
  skill_level?: ServiceSkillLevel | string;
  duration_minutes?: number | null;
  active: boolean;
  image?: string | null;
}

export interface ServiceCategory {
  id: string;
  category_code: string;
  category_name: string;
  category_type: CategoryType | string;
  description?: string | null;
  sort_order?: number;
  active: boolean;
  count?: number;
  image?: string | null;
}

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  profile_photo: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  wallet_balance?: number | null;
  referral_code?: string | null;
  referred_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DoorblyPartnerProfile {
  id: string;
  full_name: string;
  phone?: string | null;
  photo_url?: string | null;
  rating?: number | null;
  completed_jobs?: number | null;
  experience_years?: number | null;
  service_categories?: string[] | null;
  skills?: string[] | null;
  district?: string | null;
  city?: string | null;
  is_online?: boolean;
  is_available?: boolean;
  account_status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  fcm_token?: string | null;
}

export interface DoorblyBooking {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  service_id?: string | null;
  category_id?: string | null;
  service_name_snapshot: string;
  category_name_snapshot?: string | null;
  customer_price: number;
  tax_amount?: number | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  coupon_code?: string | null;
  pricing_unit?: string | null;
  booking_type?: 'BOOK_NOW' | 'SCHEDULED' | string | null;
  address: string;
  city?: string | null;
  district?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  preferred_date: string;
  preferred_time: string;
  instructions?: string | null;
  additional_details?: Record<string, string> | null;
  status: DoorblyBookingStatus;
  payment_status: DoorblyPaymentStatus;
  payment_method?: string | null;
  payment_transaction_id?: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  partner_phone?: string | null;
  partner_photo?: string | null;
  partner_rating?: number | null;
  partner_latitude?: number | null;
  partner_longitude?: number | null;
  partner_accepted_at?: string | null;
  partner_arrived_at?: string | null;
  service_started_at?: string | null;
  service_completed_at?: string | null;
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  refund_status?: 'NONE' | 'REFUND_REQUESTED' | 'REFUND_PROCESSING' | 'REFUND_COMPLETED' | string | null;
  is_reviewed?: boolean | null;
  created_at: string;
  updated_at?: string;
}

export interface CustomerLocation {
  id: string;
  customer_id: string;
  label: 'Home' | 'Office' | 'Other' | string;
  address_line: string;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at?: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  status: DoorblyBookingStatus;
  notes?: string | null;
  created_at: string;
}

export interface BookingChatMessage {
  id: string;
  booking_id: string;
  customer_id: string;
  partner_id?: string | null;
  sender_role: 'customer' | 'partner';
  sender_id: string;
  message: string;
  created_at: string;
}

export interface CustomerReview {
  id: string;
  booking_id: string;
  customer_id: string;
  partner_id?: string | null;
  service_id?: string | null;
  rating: number;
  service_quality?: number | null;
  partner_behaviour?: number | null;
  timeliness?: number | null;
  overall_experience?: number | null;
  review_text?: string | null;
  created_at: string;
}

export interface CustomerSupportTicket {
  id: string;
  customer_id: string;
  booking_id?: string | null;
  issue_category:
    | 'Booking issue'
    | 'Payment issue'
    | 'Partner issue'
    | 'Service issue'
    | 'Refund issue'
    | 'Account issue'
    | 'Safety / SOS'
    | 'Other';
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  updated_at?: string;
}

export interface WalletTransaction {
  id: string;
  customer_id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'CASHBACK';
  amount: number;
  description: string;
  booking_id?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
}

export interface DoorblyCoupon {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discount_type: 'FLAT' | 'PERCENTAGE';
  discount_value: number;
  max_discount?: number | null;
  min_booking_value: number;
  eligible_category?: string | null;
  eligible_service_id?: string | null;
  expires_at?: string | null;
  usage_limit?: number | null;
  active: boolean;
}

export interface CustomerNotificationItem {
  id: string;
  customer_id: string;
  booking_id?: string | null;
  event_type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
