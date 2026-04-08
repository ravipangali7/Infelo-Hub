/** Types aligned to backend models (snake_case). */

export type KycStatus = 'pending' | 'approved' | 'rejected';
export type UserStatus = 'active' | 'freeze' | 'deactivate';
export type PayoutAccountStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'esewa' | 'khalti' | 'bank' | 'cod' | 'wallet';
export type PaymentRequestType = 'deposit' | 'withdraw';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';
export type WithdrawalWalletType = 'earning' | 'topup';
export type SalesStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type CampaignStatus = 'coming' | 'running' | 'finished' | 'deactivate';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'added' | 'deducted';
export type TransactionFor = 'deposit' | 'withdrawal' | 'package' | 'task_reward' | 'earning' | 'paid' | 'received' | 'order' | 'buying_reward' | 'system_withdrawal';
export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface User {
  id: number;
  phone: string;
  username: string | null;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  kyc_status: KycStatus;
  kyc_document_front: string | null;
  kyc_document_back: string | null;
  kyc_document_front_url: string | null;
  kyc_document_back_url: string | null;
  kyc_reject_reason: string;
  status: UserStatus;
  is_wallet_freeze: boolean;
  package: number | null;
  package_name: string | null;
  earning_wallet: string;
  topup_wallet: string;
  joined_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  referred_by: number | null;
  referred_by_name?: string | null;
  referred_by_phone?: string | null;
  is_staff: boolean;
  is_active: boolean;
}

export interface UserMinimal {
  id: number;
  phone: string;
  name: string;
  kyc_status: KycStatus;
  status: UserStatus;
  package: number | null;
  package_name: string | null;
  created_at: string;
}

/** Admin KYC management list row (includes document URLs for review). */
export interface UserKycListItem {
  id: number;
  phone: string;
  name: string;
  kyc_status: KycStatus;
  kyc_reject_reason: string;
  kyc_document_front_url: string | null;
  kyc_document_back_url: string | null;
  status: UserStatus;
  is_active: boolean;
  package: number | null;
  package_name: string | null;
  created_at: string;
}

export interface Package {
  id: number;
  name: string;
  amount: string;
  discount: string;
  direct_referral: string;
  level_one: string;
  level_two: string;
  level_three: string;
  level_four: string;
  level_five: string;
  level_six: string;
  level_seven: string;
  created_at: string;
  updated_at: string;
  products?: PackageProduct[];
}

export interface PackageProduct {
  id: number;
  package: number;
  product: number;
  product_name: string;
  selling_price: string;
  quantity: number;
  total: string;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: number;
  name: string;
  district: string;
  province: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutAccount {
  id: number;
  user: number;
  user_name?: string | null;
  user_phone?: string | null;
  payment_method: PaymentMethod;
  payment_method_display: string;
  status: PayoutAccountStatus;
  reject_reason: string;
  phone: string;
  qr_image: string;
  qr_image_url: string | null;
  bank_name: string;
  bank_branch: string;
  bank_account_no: string;
  bank_account_holder_name: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequest {
  id: number;
  user: number;
  type: PaymentRequestType;
  type_display: string;
  amount: string;
  payout_account: number | null;
  payout_account_detail?: PayoutAccount | null;
  user_name?: string | null;
  user_phone?: string | null;
  paid_date_time: string | null;
  screenshot: string;
  screenshot_url: string | null;
  remarks: string;
  status: PaymentRequestStatus;
  status_display: string;
  reject_reason: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  payment_transaction_id: string;
  /** Withdrawals only: source wallet (deposits use ''). */
  withdrawal_wallet_type: WithdrawalWalletType | '';
  withdrawal_wallet_type_display: string;
  /** Client withdraw create only; maps to withdrawal_wallet_type on the server. */
  wallet_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: number;
  user: number;
  user_name?: string | null;
  user_phone?: string | null;
  name: string;
  phone: string;
  country: string;
  state: string;
  district: string;
  city: number | null;
  city_name: string | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShippingCharge {
  id: number;
  city: number;
  city_name: string;
  city_district: string;
  city_province: string;
  charge: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  image: string;
  image_url: string | null;
  parent: number | null;
  parent_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Batched response from GET client/products/sections/ */
export interface ProductSectionRow {
  category: ProductCategory;
  products: Product[];
}

export interface ProductSectionsResponse {
  featured: Product[];
  sections: ProductSectionRow[];
}

export interface ProductImage {
  id: number;
  product: number;
  image: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  sku: string;
  is_active: boolean;
  is_featured: boolean;
  order_sort: number;
  is_affiliation: boolean;
  affiliation_reward_type: string;
  affiliation_reward: string;
  is_purchase_reward: boolean;
  purchase_reward_type: string;
  purchase_reward: string;
  vendor: number | null;
  vendor_name: string | null;
  category: number | null;
  category_name: string | null;
  short_description: string;
  long_description: string;
  stock: number;
  discount_type: string;
  discount: string;
  purchasing_price: string;
  selling_price: string;
  image: string;
  image_url: string | null;
  images?: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface SalesItem {
  id: number;
  sales: number;
  product: number;
  product_name: string;
  product_image_url?: string | null;
  selling_price: string;
  quantity: number;
  total: string;
  referred_by: number | null;
  reward: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sales {
  id: number;
  vendor: number | null;
  vendor_name: string | null;
  user: number;
  user_name: string | null;
  user_phone: string | null;
  address: number | null;
  address_detail?: Address | null;
  address_name: string | null;
  address_phone: string | null;
  address_text: string | null;
  address_city: string | null;
  address_district: string | null;
  address_state: string | null;
  subtotal: string;
  discount_type: string;
  discount: string;
  shipping_charge: string;
  total: string;
  status: SalesStatus;
  status_display: string;
  payment_status: PaymentStatus;
  payment_status_display: string;
  payment_method: PaymentMethod;
  items: SalesItem[];
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  status_display: string;
  description: string;
  image: string;
  image_url: string | null;
  video_link: string;
  commission_type: string;
  commission: string;
  product: number | null;
  product_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignSubmissionProof {
  id: number;
  campaign_submission: number;
  title: string;
  image: string;
  image_url: string | null;
  link: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

/** Payload for nested proofs when creating a campaign submission (JSON body). */
export interface CampaignProofInput {
  title?: string;
  link?: string;
  remarks?: string;
}

export interface CreateCampaignSubmissionPayload {
  campaign: number;
  proof_items: CampaignProofInput[];
}

export interface CampaignSubmission {
  id: number;
  campaign: number;
  campaign_name: string;
  campaign_detail?: Campaign;
  user: number;
  user_name?: string | null;
  user_phone?: string | null;
  status: SubmissionStatus;
  status_display: string;
  reject_reason: string;
  /** Set when campaign reward was credited to earning wallet on approval */
  reward_credited_at?: string | null;
  proofs: CampaignSubmissionProof[];
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  user: number;
  user_name?: string | null;
  user_phone?: string | null;
  payment_request_type?: string | null;
  payment_request_status?: string | null;
  payment_request_user_name?: string | null;
  amount: string;
  transaction_type: TransactionType;
  transaction_type_display: string;
  transaction_for: TransactionFor;
  transaction_for_display: string;
  status: TransactionStatus;
  status_display: string;
  is_system: boolean;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: number;
  balance: string;
  esewa_qr_url: string | null;
  esewa_phone: string;
  khalti_qr_url: string | null;
  khalti_phone: string;
  bank_qr_url: string | null;
  bank_name: string;
  bank_branch: string;
  bank_account_no: string;
  bank_account_holder_name: string;
  minimum_withdrawal: string;
  maximum_withdrawal: string;
  minimum_deposit: string;
  maximum_deposit: string;
  withdrawal_admin_fee_type: string;
  withdrawal_admin_fee: string;
  registration_fee: string;
  low_stock_threshold: number;
  high_value_payment_threshold: string;
  is_withdrawal: boolean;
  is_earning_withdrawal: boolean;
  is_topup_withdrawal: boolean;
  earning_limit_percentage: string;
  reward_percentage: string;
  sms_api_key: string;
  sms_sender_id: string;
  app_current_version: string;
  android_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemWithdrawal {
  id: number;
  amount: string;
  status: string;
  status_display: string;
  reject_reason: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface PaidRecord {
  id: number;
  name: string;
  amount: string;
  vendor: number | null;
  vendor_name: string | null;
  user: number | null;
  user_name?: string | null;
  user_phone?: string | null;
  payment_method: string;
  payment_method_display: string;
  remarks: string;
  purchase: number | null;
  purchase_total?: string | null;
  purchase_payment_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivedRecord {
  id: number;
  name: string;
  amount: string;
  vendor: number | null;
  vendor_name: string | null;
  user: number | null;
  user_name?: string | null;
  user_phone?: string | null;
  payment_method: string;
  payment_method_display: string;
  remarks: string;
  sales: number | null;
  sales_total?: string | null;
  sales_status?: string | null;
  sales_payment_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  user: number | null;
  user_name?: string | null;
  user_phone?: string | null;
  user_status?: string | null;
  name: string;
  logo: string;
  logo_url: string | null;
  phone: string;
  payable: string;
  receivable: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase: number;
  product: number;
  product_name: string;
  purchasing_price: string;
  quantity: number;
  total: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  vendor: number | null;
  vendor_name: string | null;
  user: number | null;
  user_name?: string | null;
  user_phone?: string | null;
  subtotal: string;
  discount_type: string;
  discount: string;
  total: string;
  payment_status: PaymentStatus;
  payment_status_display: string;
  items: PurchaseItem[];
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user: number | null;
  is_guest: boolean;
  session_id: string;
  event_name: string;
  event_timestamp: string | null;
  page_url: string;
  page_path: string;
  page_title: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDashboard {
  user: User;
  wallet: {
    earning_wallet: number;
    topup_wallet: number;
    package_name: string | null;
  };
  recent_transactions: Transaction[];
  featured_products: Product[];
  campaigns: Campaign[];
  packages: Package[];
}

/** Payment instructions for deposits (from system settings). */
export interface WalletDepositDetails {
  esewa_phone: string;
  esewa_qr_url: string | null;
  khalti_phone: string;
  khalti_qr_url: string | null;
  bank_name: string;
  bank_branch: string;
  bank_account_no: string;
  bank_account_holder_name: string;
  bank_qr_url: string | null;
}

export interface WalletBalance {
  earning_wallet: number;
  topup_wallet: number;
  package_id: number | null;
  package_name: string | null;
  limits: {
    minimum_withdrawal: string;
    maximum_withdrawal: string;
    minimum_deposit: string;
    maximum_deposit: string;
    withdrawal_admin_fee_type: string;
    withdrawal_admin_fee: string;
    is_withdrawal?: boolean;
    is_earning_withdrawal?: boolean;
    is_topup_withdrawal?: boolean;
  };
  deposit_details?: WalletDepositDetails;
}

export interface AdminDashboard {
  stats: {
    total_users: number;
    total_revenue: number;
    active_packages: number;
    total_orders: number;
  };
  revenue: {
    today: number;
    yesterday: number;
    today_vs_yesterday_pct: number;
    week: number;
    prev_week: number;
    week_pct: number;
    month: number;
    prev_month: number;
    month_pct: number;
    total: number;
  };
  users: {
    total: number;
    today: number;
    yesterday: number;
    today_vs_yesterday_pct: number;
    week: number;
    prev_week: number;
    week_pct: number;
    month: number;
    prev_month: number;
    month_pct: number;
    active_packages: number;
  };
  pending_actions: {
    payout_accounts: number;
    deposits: number;
    deposit_amount: number;
    withdrawals: number;
    withdrawal_amount: number;
    kyc: number;
    submissions: number;
    sales: number;
  };
  sales_pipeline: Record<string, { count: number; amount: number }>;
  campaigns: {
    total: number;
    active: number;
    total_submissions: number;
    approved_submissions: number;
    approval_rate: number;
  };
  wallet_economy: {
    total: number;
    earning: number;
    topup: number;
    pending_deposits: number;
    pending_withdrawals: number;
    approved_deposits: number;
    approved_withdrawals: number;
  };
  super_settings: {
    balance: number;
    sms_balance?: unknown;
    sms_balance_label?: string;
    sms_balance_caption?: string;
    sms_total?: number;
    sms_success?: number;
    sms_failed?: number;
  };
  package_distribution: Array<{ package__name: string; count: number }>;
  top_earners: Array<{ id: number; name: string; phone: string; earning_wallet: number; topup_wallet: number }>;
  revenue_chart: Array<{ date: string; revenue: number; orders: number }>;
  users_chart: Array<{ date: string; users: number }>;
  recent_transactions: Array<{
    id: number;
    user_id: number;
    user__name: string;
    user__phone: string;
    amount: number;
    transaction_type: string;
    transaction_for: string;
    status: string;
    created_at: string;
  }>;
}

export interface ApiError {
  status: number;
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface OtpRequestResponse {
  detail: string;
  expires_in: number;
}

export interface SmsLog {
  id: number;
  phone: string;
  purpose: string;
  message: string;
  provider: string;
  status: string;
  response_payload: Record<string, unknown>;
  consumed_units: number;
  created_at: string;
  updated_at: string;
}

/** Website / public (no auth) */
export interface LandingFeature {
  icon_key: string;
  title: string;
  desc: string;
}

export interface LandingContent {
  title: string;
  hero: {
    heading: string;
    subtitle: string;
    primary_button_text: string;
    secondary_button_text: string;
  };
  features: LandingFeature[];
  cta: {
    heading: string;
    subtext: string;
    button_text: string;
  };
  footer_text: string;
}

export interface Banner {
  id: number;
  title: string;
  image: string;
  image_url: string | null;
  link: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushNotificationListItem {
  id: number;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
  receivers_count: number;
}

export interface PushNotification {
  id: number;
  title: string;
  message: string;
  image: string | null;
  image_url: string | null;
  receivers: UserMinimal[];
  created_at: string;
  updated_at: string;
}

/** Client inbox row (push notifications where user is a receiver + read state). */
export interface ClientInboxNotification {
  id: number;
  title: string;
  message: string;
  kind?: string;
  payload?: Record<string, unknown> | null;
  image_url: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
}

export interface PushNotificationSendChunkResult {
  total: number;
  offset: number;
  limit: number;
  processed: number;
  success_count: number;
  failure_count: number;
  failures: { user_id: number; phone: string; error: string }[];
}

export interface HomeConfig {
  banners: Banner[];
  feature_flags?: Record<string, unknown>;
}

export interface SiteSetting {
  id?: number;
  name: string;
  logo: string;
  logo_url: string | null;
  title: string;
  subtitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  created_at?: string;
  updated_at?: string;
}

export interface PublicSiteSetting {
  id?: number;
  name?: string;
  logo_url?: string | null;
  title?: string;
  subtitle?: string;
  phone?: string;
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
}

/** Public app / APK info (same payload as Flutter update gate). */
export interface PublicAppVersion {
  app_current_version: string;
  android_file_url: string | null;
}

export interface CmsPage {
  id: number;
  name: string;
  slug: string;
  title: string;
  content: string;
  image: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: number;
  product: number;
  product_detail: Product;
  created_at: string;
}

export interface CreateOrderPayload {
  address: number;
  payment_method: string;
  items: { product: number; quantity: number }[];
  /** Optional referrer user id (from ?ref=); server validates and computes commission */
  affiliate_user_id?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  /** Present when API is called with include_summary=1 */
  summary?: Record<string, unknown>;
}

// ── Analytics Types ─────────────────────────────────────────────────────────

export interface AnalyticsPeriod { from: string; to: string; }

interface ChartPoint { date: string; [key: string]: string | number; }

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  gmv: { value: number; prev: number; pct: number; all_time: number };
  net_revenue: number;
  orders: { value: number; prev: number; pct: number };
  new_users: { value: number; prev: number; pct: number };
  total_users: number;
  active_users: number;
  dau: number;
  mau: number;
  system_balance: number;
  growth_rate: number;
  deposits_total: number;
  withdrawals_total: number;
  revenue_chart: ChartPoint[];
  orders_chart: ChartPoint[];
  users_chart: ChartPoint[];
}

export interface AnalyticsUsers {
  period: AnalyticsPeriod;
  total: number;
  new_in_period: { value: number; prev: number; pct: number };
  kyc: { pending: number; approved: number; rejected: number; approval_rate: number };
  status_distribution: { status: string; count: number }[];
  with_package: number;
  without_package: number;
  wallet_frozen: number;
  dormant_90_days: number;
  avg_earning_wallet: number;
  users_chart: ChartPoint[];
  kyc_chart: ChartPoint[];
  top_users: { id: number; name: string; phone: string; earning_wallet: number; topup_wallet: number; kyc_status: string; status: string }[];
}

export interface AnalyticsSales {
  period: AnalyticsPeriod;
  total_orders: { value: number; prev: number; pct: number };
  total_revenue: { value: number; prev: number; pct: number };
  aov: { value: number; prev: number };
  cancellation_rate: number;
  rejection_rate: number;
  delivery_rate: number;
  repeat_rate: number;
  shipping_revenue: number;
  discount_given: number;
  status_funnel: Record<string, { count: number; amount: number }>;
  payment_split: { payment_method: string; count: number; amount: number }[];
  peak_hours: { hour: number; count: number }[];
  peak_days: { weekday: number; day_name: string; count: number }[];
  revenue_chart: ChartPoint[];
  top_products: { product_id: number; product__name: string; qty: number; revenue: number }[];
}

export interface AnalyticsProducts {
  period: AnalyticsPeriod;
  total_products: number;
  active_products: number;
  inactive_products: number;
  out_of_stock: number;
  low_stock: number;
  never_purchased: number;
  stock_buckets: { out_of_stock: number; low_stock_1_9: number; medium_10_50: number; healthy_50_plus: number };
  products_with_margin: { id: number; name: string; sku: string; selling_price: number; purchasing_price: number; stock: number; margin: number }[];
  wishlist_conversion: { product_id: number; product__name: string; wishlist_count: number; purchased_count: number; conversion_rate: number }[];
  top_by_revenue: { product_id: number; product__name: string; units: number; revenue: number }[];
  affiliation_performance: { product_id: number; product__name: string; product__affiliation_reward: number; product__affiliation_reward_type: string; sales_count: number; revenue: number }[];
  cashback_performance: { product_id: number; product__name: string; product__purchase_reward: number; product__purchase_reward_type: string; sales_count: number; revenue: number }[];
  category_distribution: { category__name: string; count: number }[];
}

export interface AnalyticsVendors {
  period: AnalyticsPeriod;
  total_vendors: number;
  total_payable: number;
  total_receivable: number;
  net_vendor_balance: number;
  vendor_revenue: { sales__vendor_id: number; sales__vendor__name: string; revenue: number; orders: number }[];
  vendor_products: { id: number; name: string; payable: number; receivable: number; product_count: number }[];
  procurement_by_vendor: { purchase__vendor_id: number; purchase__vendor__name: string; total_cost: number; qty: number }[];
}

export interface AnalyticsProcurement {
  period: AnalyticsPeriod;
  total_purchases: number;
  total_cost: number;
  sales_revenue: number;
  gross_profit: number;
  gross_margin_pct: number;
  payment_status_split: { payment_status: string; count: number; amount: number }[];
  top_purchased_products: { product_id: number; product__name: string; qty: number; cost: number }[];
  cost_chart: ChartPoint[];
}

export interface AnalyticsAffiliates {
  period: AnalyticsPeriod;
  total_aff_sales: number;
  total_aff_revenue: number;
  total_aff_commissions: number;
  revenue_contribution_pct: number;
  aff_products_count: number;
  top_affiliates: { referred_by_id: number; referred_by__name: string; referred_by__phone: string; sales_count: number; earned: number; revenue: number }[];
  top_aff_products: { product_id: number; product__name: string; sales_count: number; commissions: number; revenue: number }[];
  aff_chart: ChartPoint[];
}

export interface AnalyticsCampaigns {
  period: AnalyticsPeriod;
  total_campaigns: number;
  campaigns_by_status: Record<string, number>;
  total_submissions: number;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate: number;
  total_rewards_paid: number;
  top_campaigns: { campaign_id: number; campaign__name: string; campaign__commission: number; campaign__commission_type: string; total_subs: number; approved_subs: number; approval_rate: number }[];
  rejection_reasons: { reject_reason: string; count: number }[];
  subs_chart: ChartPoint[];
}

export interface AnalyticsFinance {
  period: AnalyticsPeriod;
  wallet_economy: { earning: number; topup: number; total: number; liability: number };
  deposits: { approved: number; pending: number; rejected: number; by_method: { payment_method: string; count: number; amount: number }[] };
  withdrawals: { approved: number; pending: number; rejected: number; by_method: { payment_method: string; count: number; amount: number }[] };
  admin_fee: { type: string; rate: number };
  pnl: { sales_revenue: number; purchase_cost: number; affiliation_commissions: number; campaign_rewards: number; total_expenses: number; gross_profit: number; net_profit: number };
  cash_flow: { cash_in: number; cash_out: number; system_withdrawals: number; net: number };
  dep_chart: ChartPoint[];
  wdr_chart: ChartPoint[];
  tx_by_category: { transaction_for: string; count: number; amount: number }[];
}

export interface AnalyticsBehaviour {
  period: AnalyticsPeriod;
  total_sessions: number;
  total_events: number;
  guest_sessions: number;
  auth_sessions: number;
  avg_session_duration_sec: number;
  device_distribution: { device_type: string; count: number }[];
  os_distribution: { os_name: string; count: number }[];
  browser_distribution: { browser_name: string; count: number }[];
  top_pages: { page_path: string; page_title: string; count: number; avg_time: number; avg_scroll: number }[];
  top_events: { event_name: string; count: number }[];
  top_referrers: { referrer_url: string; count: number }[];
  peak_hours: { hour: number; count: number }[];
  sessions_chart: ChartPoint[];
  country_distribution: { country: string; count: number }[];
  platform_distribution: { platform: string; count: number }[];
}

export interface AnalyticsRetention {
  period: AnalyticsPeriod;
  mau: number;
  dau_chart: ChartPoint[];
  dormant: { '30_days': number; '60_days': number; '90_days': number };
  repeat_buyers: number;
  high_value_customers: { user_id: number; user__name: string; user__phone: string; total_spent: number; order_count: number }[];
  feature_usage: { page_path: string; sessions: number }[];
  avg_deposits_per_user: number;
  avg_orders_per_user: number;
}

export interface AnalyticsIntelligence {
  forecast: {
    avg_daily_revenue: number;
    trend_slope: number;
    forecast_30_days: number;
    forecast_90_days: number;
    chart: { day: number; date: string; forecast: number }[];
  };
  yoy_comparison: {
    this_year: number;
    last_year: number;
    ytd_revenue: number;
    ytd_last_year: number;
    yoy_pct: number;
    monthly: { month: string; this_year: number; last_year: number; pct_change: number }[];
  };
  stock_depletion: { product_id: number; name: string; stock: number; avg_daily_sales: number; days_until_empty: number | null }[];
  risk_alerts: {
    suspicious_withdrawal_users: { user_id: number; user__name: string; user__phone: string; count: number; total_amount: number }[];
    failed_tx_today: number;
    failed_tx_week: number;
    frozen_with_pending: number;
    pending_withdrawal_total: number;
    total_user_liability: number;
  };
  audit_log: { id: number; user_id: number; user__name: string; user__phone: string; amount: number; transaction_type: string; transaction_for: string; status: string; remarks: string; created_at: string }[];
  all_time_records: { total_revenue: number; total_users: number; total_orders: number; total_deposits: number; total_withdrawals: number };
}

export interface AnalyticsSms {
  period: AnalyticsPeriod;
  total_sent: number;
  success: number;
  failed: number;
  by_purpose: { purpose: string; count: number }[];
  balance: unknown;
  configured: boolean;
}
