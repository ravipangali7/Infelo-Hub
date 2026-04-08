import { api, patchFormWithUploadProgress } from "./client";
import type {
  User,
  UserKycListItem,
  ClientDashboard,
  WalletBalance,
  PayoutAccount,
  PaymentRequest,
  Address,
  Product,
  ProductCategory,
  Package,
  Campaign,
  CampaignSubmission,
  CampaignSubmissionProof,
  CreateCampaignSubmissionPayload,
  CreateOrderPayload,
  ShippingCharge,
  Sales,
  Transaction,
  SystemSetting,
  Vendor,
  Purchase,
  ActivityLog,
  PaginatedResponse,
  LandingContent,
  HomeConfig,
  PaidRecord,
  ReceivedRecord,
  SystemWithdrawal,
  Banner,
  PushNotification,
  PushNotificationListItem,
  PushNotificationSendChunkResult,
  SiteSetting,
  CmsPage,
  WishlistItem,
  ClientInboxNotification,
  PublicSiteSetting,
  PublicAppVersion,
  ProductSectionsResponse,
  AnalyticsOverview,
  AnalyticsUsers,
  AnalyticsSales,
  AnalyticsProducts,
  AnalyticsVendors,
  AnalyticsProcurement,
  AnalyticsAffiliates,
  AnalyticsCampaigns,
  AnalyticsFinance,
  AnalyticsBehaviour,
  AnalyticsRetention,
  AnalyticsIntelligence,
  AnalyticsSms,
  OtpRequestResponse,
  SmsLog,
} from "./types";
import type { AdminDashboard } from "./types";

const client = (path: string) => `client/${path.replace(/^\//, "")}`;
const admin = (path: string) => `admin/${path.replace(/^\//, "")}`;

/** Build query string for admin list endpoints (paginated, ordered, filtered). */
function adminListParams(
  params: Record<string, string | number | undefined>,
  opts?: { includeSummary?: boolean }
): string {
  const merged: Record<string, string | number | undefined> = {
    ...params,
    ...(opts?.includeSummary === false ? {} : { include_summary: 1 }),
  };
  const filtered = Object.fromEntries(
    Object.entries(merged)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)])
  ) as Record<string, string>;
  const q = new URLSearchParams(filtered).toString();
  return q ? `?${q}` : "";
}

/** Auth */
export async function login(phone: string, password: string) {
  return api.post<{ token: string; user: User }>("auth/login/", { phone, password });
}

export async function register(phone: string, password: string, name?: string) {
  return api.post<{ token: string; user: User }>("auth/register/", { phone, password, name });
}

export async function registerRequestOtp(phone: string) {
  return api.post<OtpRequestResponse>("auth/register/request-otp/", { phone });
}

export async function registerVerifyOtp(phone: string, otp: string) {
  return api.post<{ detail: string }>("auth/register/verify-otp/", { phone, otp });
}

export async function registerComplete(phone: string, name: string, password: string, confirm_password: string) {
  return api.post<{ token: string; user: User }>("auth/register/complete/", { phone, name, password, confirm_password });
}

export async function forgotPasswordRequestOtp(phone: string) {
  return api.post<OtpRequestResponse>("auth/forgot-password/request-otp/", { phone });
}

export async function forgotPasswordVerifyOtp(phone: string, otp: string) {
  return api.post<{ detail: string }>("auth/forgot-password/verify-otp/", { phone, otp });
}

export async function resetPassword(phone: string, password: string, confirm_password: string) {
  return api.post<{ detail: string }>("auth/forgot-password/reset/", { phone, password, confirm_password });
}

export async function getMe() {
  return api.get<User>("auth/me/");
}

export async function logout() {
  return api.post<{ detail: string }>("auth/logout/", {});
}

/** Public website (no auth) */
export async function getLandingContent() {
  return api.get<LandingContent>("landing/");
}

export async function getHomeConfig() {
  return api.get<HomeConfig>("home/");
}

export async function getCmsPageBySlug(slug: string) {
  return api.get<CmsPage>(`pages/${slug}/`);
}

export type ProductSectionsMode = "tree" | "direct";

export async function getProductSections(opts: {
  mode: ProductSectionsMode;
  perSection?: number;
  featuredLimit?: number;
  omitSections?: boolean;
}) {
  const { mode, perSection = 8, featuredLimit = 8, omitSections = false } = opts;
  const q = new URLSearchParams({
    mode,
    per_section: String(perSection),
    featured_limit: String(featuredLimit),
  });
  if (omitSections) {
    q.set("omit_sections", "1");
  }
  return api.get<ProductSectionsResponse>(client(`products/sections/?${q}`));
}

/** Client API */
export const clientApi = {
  getDashboard: () => api.get<ClientDashboard>(client("dashboard/")),
  getProfile: () => api.get<User>(client("profile/")),
  updateProfile: (data: Partial<User>) => api.patch<User>(client("profile/"), data),
  getKycStatus: () => api.get<User>(client("kyc/")),
  submitKyc: (formData: FormData) => api.postForm<User>(client("kyc/"), formData),
  getPayoutAccounts: () => api.get<PaginatedResponse<PayoutAccount>>(client("payout-accounts/")),
  createPayoutAccount: (data: Partial<PayoutAccount> | FormData) =>
    data instanceof FormData
      ? api.postForm<PayoutAccount>(client("payout-accounts/"), data)
      : api.post<PayoutAccount>(client("payout-accounts/"), data),
  getPayoutAccount: (id: number) => api.get<PayoutAccount>(client(`payout-accounts/${id}/`)),
  deletePayoutAccount: (id: number) => api.delete<void>(client(`payout-accounts/${id}/`)),
  getAddresses: () => api.get<PaginatedResponse<Address>>(client("addresses/")),
  createAddress: (data: Partial<Address>) => api.post<Address>(client("addresses/"), data),
  getAddress: (id: number) => api.get<Address>(client(`addresses/${id}/`)),
  updateAddress: (id: number, data: Partial<Address>) => api.patch<Address>(client(`addresses/${id}/`), data),
  deleteAddress: (id: number) => api.delete<void>(client(`addresses/${id}/`)),
  getWallet: () => api.get<WalletBalance>(client("wallet/")),
  getShippingCharges: () => api.get<PaginatedResponse<ShippingCharge>>(client("shipping-charges/")),
  getPaymentRequests: (type?: string) =>
    api.get<PaginatedResponse<PaymentRequest>>(
      type ? client(`payment-requests/?type=${type}`) : client("payment-requests/")
    ),
  createPaymentRequest: (data: Partial<PaymentRequest> | FormData) =>
    data instanceof FormData
      ? api.postForm<PaymentRequest>(client("payment-requests/"), data)
      : api.post<PaymentRequest>(client("payment-requests/"), data),
  getProducts: (params?: { category?: string; category_tree?: string; search?: string }) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, value]) => {
        if (value == null) return false;
        const normalized = String(value).trim().toLowerCase();
        return normalized !== "" && normalized !== "undefined" && normalized !== "null";
      })
    ) as Record<string, string>;
    const q = new URLSearchParams(cleanParams).toString();
    return api.get<PaginatedResponse<Product>>(client(q ? `products/?${q}` : "products/"));
  },
  getProduct: (slug: string) => api.get<Product>(client(`products/${slug}/`)),
  getProductById: (id: number) => api.get<Product>(client(`products/${id}/`)),
  getCategories: () => api.get<PaginatedResponse<ProductCategory>>(client("categories/")),
  getPackages: () => api.get<PaginatedResponse<Package>>(client("packages/")),
  getPackage: (id: number) => api.get<Package>(client(`packages/${id}/`)),
  getCampaigns: () => api.get<PaginatedResponse<Campaign>>(client("campaigns/")),
  getCampaign: (id: number) => api.get<Campaign>(client(`campaigns/${id}/`)),
  getSubmissions: () => api.get<PaginatedResponse<CampaignSubmission>>(client("submissions/")),
  createSubmission: (data: CreateCampaignSubmissionPayload) =>
    api.post<CampaignSubmission>(client("submissions/"), data),
  createSubmissionProof: (submissionId: number, formData: FormData) =>
    api.postForm<CampaignSubmissionProof>(client(`submissions/${submissionId}/proofs/`), formData),
  getSubmission: (id: number) => api.get<CampaignSubmission>(client(`submissions/${id}/`)),
  getOrders: () => api.get<PaginatedResponse<Sales>>(client("orders/")),
  getOrder: (id: number) => api.get<Sales>(client(`orders/${id}/`)),
  createOrder: (data: CreateOrderPayload) => api.post<Sales>(client("orders/"), data),
  getTransactions: (transaction_for?: string) =>
    api.get<PaginatedResponse<Transaction>>(
      transaction_for
        ? client(`transactions/?transaction_for=${transaction_for}`)
        : client("transactions/")
    ),
  getReferrals: () => api.get<PaginatedResponse<User>>(client("referrals/")),
  getTeamTree: () => api.get<{ user: User; children: unknown[] }>(client("team-tree/")),
  getNotifications: (opts?: { unread_only?: boolean }) => {
    const q = opts?.unread_only ? "?unread_only=true" : "";
    return api.get<ClientInboxNotification[]>(client(`notifications/${q}`));
  },
  getNotificationUnreadCount: () =>
    api.get<{ unread_count: number }>(client("notifications/unread-count/")),
  markAllNotificationsRead: () =>
    api.post<{ detail: string }>(client("notifications/mark-all-read/"), {}),
  markAllNotificationsUnread: () =>
    api.post<{ detail: string }>(client("notifications/mark-all-unread/"), {}),
  markNotificationRead: (id: number) =>
    api.post<{ detail: string }>(client(`notifications/${id}/read/`), {}),
  markNotificationUnread: (id: number) =>
    api.post<{ detail: string }>(client(`notifications/${id}/unread/`), {}),
};

/** Admin API */
export const adminApi = {
  getDashboard: () => api.get<AdminDashboard>(admin("dashboard/")),
  getUsers: (params?: { search?: string; kyc_status?: string; status?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<User>>(admin(`users/${q}`));
  },
  getUser: (id: number) => api.get<User>(admin(`users/${id}/`)),
  createUser: (data: Partial<User> & { phone: string; password: string }) => api.post<User>(admin("users/"), data),
  updateUser: (id: number, data: Partial<User>) => api.patch<User>(admin(`users/${id}/`), data),
  deleteUser: (id: number) => api.delete<void>(admin(`users/${id}/`)),
  getKycList: (params?: { kyc_status?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<UserKycListItem>>(admin(`kyc/${q}`));
  },
  approveKyc: (userId: number) => api.post<User>(admin(`kyc/${userId}/approve/`), {}),
  rejectKyc: (userId: number, reason: string) =>
    api.post<User>(admin(`kyc/${userId}/reject/`), { reason }),
  getPayoutAccounts: (params?: { search?: string; status?: string; user?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<PayoutAccount>>(admin(`payout-accounts/${q}`));
  },
  getPayoutAccount: (id: number) => api.get<PayoutAccount>(admin(`payout-accounts/${id}/`)),
  createPayoutAccount: (data: Partial<PayoutAccount> | FormData) =>
    data instanceof FormData
      ? api.postForm<PayoutAccount>(admin("payout-accounts/"), data)
      : api.post<PayoutAccount>(admin("payout-accounts/"), data),
  updatePayoutAccount: (id: number, data: Partial<PayoutAccount> | FormData) =>
    data instanceof FormData
      ? api.patchForm<PayoutAccount>(admin(`payout-accounts/${id}/`), data)
      : api.patch<PayoutAccount>(admin(`payout-accounts/${id}/`), data),
  deletePayoutAccount: (id: number) => api.delete<void>(admin(`payout-accounts/${id}/`)),
  approvePayoutAccount: (id: number) => api.post<PayoutAccount>(admin(`payout-accounts/${id}/approve/`), {}),
  rejectPayoutAccount: (id: number, reason: string) =>
    api.post<PayoutAccount>(admin(`payout-accounts/${id}/reject/`), { reason }),
  getDeposits: (params?: { status?: string; search?: string; user?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<PaymentRequest>>(admin(`deposits/${q}`));
  },
  getDeposit: (id: number) => api.get<PaymentRequest>(admin(`deposits/${id}/`)),
  createDeposit: (data: Partial<PaymentRequest> | FormData) =>
    data instanceof FormData
      ? api.postForm<PaymentRequest>(admin("deposits/"), data)
      : api.post<PaymentRequest>(admin("deposits/"), data),
  updateDeposit: (id: number, data: Partial<PaymentRequest> | FormData) =>
    data instanceof FormData
      ? api.patchForm<PaymentRequest>(admin(`deposits/${id}/`), data)
      : api.patch<PaymentRequest>(admin(`deposits/${id}/`), data),
  deleteDeposit: (id: number) => api.delete<void>(admin(`deposits/${id}/`)),
  approveDeposit: (id: number) => api.post<PaymentRequest>(admin(`deposits/${id}/approve/`), {}),
  rejectDeposit: (id: number, reason: string) =>
    api.post<PaymentRequest>(admin(`deposits/${id}/reject/`), { reason }),
  getWithdrawals: (params?: { status?: string; search?: string; user?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<PaymentRequest>>(admin(`withdrawals/${q}`));
  },
  getWithdrawal: (id: number) => api.get<PaymentRequest>(admin(`withdrawals/${id}/`)),
  createWithdrawal: (data: Partial<PaymentRequest> | FormData) =>
    data instanceof FormData
      ? api.postForm<PaymentRequest>(admin("withdrawals/"), data)
      : api.post<PaymentRequest>(admin("withdrawals/"), data),
  updateWithdrawal: (id: number, data: Partial<PaymentRequest> | FormData) =>
    data instanceof FormData
      ? api.patchForm<PaymentRequest>(admin(`withdrawals/${id}/`), data)
      : api.patch<PaymentRequest>(admin(`withdrawals/${id}/`), data),
  deleteWithdrawal: (id: number) => api.delete<void>(admin(`withdrawals/${id}/`)),
  approveWithdrawal: (id: number) => api.post<PaymentRequest>(admin(`withdrawals/${id}/approve/`), {}),
  rejectWithdrawal: (id: number, reason: string) =>
    api.post<PaymentRequest>(admin(`withdrawals/${id}/reject/`), { reason }),
  getCategories: (params?: { search?: string; is_active?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<ProductCategory>>(admin(`categories/${q}`));
  },
  getCategory: (id: number) => api.get<ProductCategory>(admin(`categories/${id}/`)),
  createCategory: (data: Partial<ProductCategory> | FormData) =>
    data instanceof FormData
      ? api.postForm<ProductCategory>(admin("categories/"), data)
      : api.post<ProductCategory>(admin("categories/"), data),
  updateCategory: (id: number, data: Partial<ProductCategory> | FormData) =>
    data instanceof FormData
      ? api.patchForm<ProductCategory>(admin(`categories/${id}/`), data)
      : api.patch<ProductCategory>(admin(`categories/${id}/`), data),
  deleteCategory: (id: number) => api.delete<void>(admin(`categories/${id}/`)),
  getProducts: (params?: {
    vendor?: string;
    category?: string;
    is_active?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
    order_by?: string;
  }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Product>>(admin(`products/${q}`));
  },
  reorderProductsPage: (orderedIds: number[], params: Record<string, string | number | undefined>) => {
    const q = adminListParams(params);
    return api.post<{ detail: string; count: number }>(admin(`products/reorder-page/${q}`), {
      ordered_ids: orderedIds,
    });
  },
  getProduct: (id: number) => api.get<Product>(admin(`products/${id}/`)),
  createProduct: (data: Partial<Product> | FormData) =>
    data instanceof FormData
      ? api.postForm<Product>(admin("products/"), data)
      : api.post<Product>(admin("products/"), data),
  updateProduct: (id: number, data: Partial<Product> | FormData) =>
    data instanceof FormData
      ? api.patchForm<Product>(admin(`products/${id}/`), data)
      : api.patch<Product>(admin(`products/${id}/`), data),
  deleteProduct: (id: number) => api.delete<void>(admin(`products/${id}/`)),
  getCampaigns: (params?: { status?: string; search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Campaign>>(admin(`campaigns/${q}`));
  },
  getCampaign: (id: number) => api.get<Campaign>(admin(`campaigns/${id}/`)),
  createCampaign: (data: Partial<Campaign> | FormData) =>
    data instanceof FormData
      ? api.postForm<Campaign>(admin("campaigns/"), data)
      : api.post<Campaign>(admin("campaigns/"), data),
  updateCampaign: (id: number, data: Partial<Campaign> | FormData) =>
    data instanceof FormData
      ? api.patchForm<Campaign>(admin(`campaigns/${id}/`), data)
      : api.patch<Campaign>(admin(`campaigns/${id}/`), data),
  deleteCampaign: (id: number) => api.delete<void>(admin(`campaigns/${id}/`)),
  getSubmissions: (params?: { status?: string; campaign?: string; user?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<CampaignSubmission>>(admin(`submissions/${q}`));
  },
  getSubmission: (id: number) => api.get<CampaignSubmission>(admin(`submissions/${id}/`)),
  deleteSubmission: (id: number) => api.delete<void>(admin(`submissions/${id}/`)),
  approveSubmission: (id: number) => api.post<CampaignSubmission>(admin(`submissions/${id}/approve/`), {}),
  rejectSubmission: (id: number, reason: string) =>
    api.post<CampaignSubmission>(admin(`submissions/${id}/reject/`), { reason }),
  getPackages: (params?: { search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Package>>(admin(`packages/${q}`));
  },
  getPackage: (id: number) => api.get<Package>(admin(`packages/${id}/`)),
  createPackage: (data: Partial<Package>) => api.post<Package>(admin("packages/"), data),
  updatePackage: (id: number, data: Partial<Package>) => api.patch<Package>(admin(`packages/${id}/`), data),
  deletePackage: (id: number) => api.delete<void>(admin(`packages/${id}/`)),
  getSales: (params?: { status?: string; payment_status?: string; user?: string; vendor?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Sales>>(admin(`sales/${q}`));
  },
  getSale: (id: number) => api.get<Sales>(admin(`sales/${id}/`)),
  createSale: (data: Record<string, unknown>) => api.post<Sales>(admin("sales/"), data),
  updateSale: (id: number, data: Record<string, unknown>) => api.patch<Sales>(admin(`sales/${id}/`), data),
  deleteSale: (id: number) => api.delete<void>(admin(`sales/${id}/`)),
  updateSaleStatus: (id: number, status: string) =>
    api.patch<Sales>(admin(`sales/${id}/status/`), { status }),
  getTransactions: (params?: { status?: string; user?: string; transaction_type?: string; transaction_for?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Transaction>>(admin(`transactions/${q}`));
  },
  getTransaction: (id: number) => api.get<Transaction>(admin(`transactions/${id}/`)),
  deleteTransaction: (id: number) => api.delete<void>(admin(`transactions/${id}/`)),
  getSettings: () => api.get<SystemSetting>(admin("settings/")),
  updateSettings: (data: Partial<SystemSetting> | FormData) =>
    data instanceof FormData
      ? api.patchForm<SystemSetting>(admin("settings/"), data)
      : api.patch<SystemSetting>(admin("settings/"), data),
  updateSettingsMultipartWithProgress: (
    formData: FormData,
    onProgress?: (loaded: number, total: number) => void
  ) => patchFormWithUploadProgress<SystemSetting>(admin("settings/"), formData, onProgress),
  getVendors: (params?: { search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Vendor>>(admin(`vendors/${q}`));
  },
  getVendor: (id: number) => api.get<Vendor>(admin(`vendors/${id}/`)),
  createVendor: (data: Partial<Vendor> | FormData) =>
    data instanceof FormData
      ? api.postForm<Vendor>(admin("vendors/"), data)
      : api.post<Vendor>(admin("vendors/"), data),
  updateVendor: (id: number, data: Partial<Vendor> | FormData) =>
    data instanceof FormData
      ? api.patchForm<Vendor>(admin(`vendors/${id}/`), data)
      : api.patch<Vendor>(admin(`vendors/${id}/`), data),
  deleteVendor: (id: number) => api.delete<void>(admin(`vendors/${id}/`)),
  getPurchases: (params?: { vendor?: string; user?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Purchase>>(admin(`purchases/${q}`));
  },
  getPurchase: (id: number) => api.get<Purchase>(admin(`purchases/${id}/`)),
  createPurchase: (data: Record<string, unknown>) => api.post<Purchase>(admin("purchases/"), data),
  updatePurchase: (id: number, data: Record<string, unknown>) => api.patch<Purchase>(admin(`purchases/${id}/`), data),
  deletePurchase: (id: number) => api.delete<void>(admin(`purchases/${id}/`)),
  getActivityLogs: (params?: { platform?: string; is_guest?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<ActivityLog>>(admin(`activity-logs/${q}`));
  },
  getSmsLogs: (params?: { purpose?: string; status?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<SmsLog>>(admin(`sms-logs/${q}`));
  },
  getCities: (params?: { search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<{ id: number; name: string; created_at: string; updated_at: string }>>(admin(`cities/${q}`));
  },
  getCity: (id: number) => api.get<{ id: number; name: string; created_at: string; updated_at: string }>(admin(`cities/${id}/`)),
  createCity: (data: { name: string }) => api.post<{ id: number; name: string; created_at: string; updated_at: string }>(admin("cities/"), data),
  updateCity: (id: number, data: { name?: string }) => api.patch<{ id: number; name: string; created_at: string; updated_at: string }>(admin(`cities/${id}/`), data),
  deleteCity: (id: number) => api.delete<void>(admin(`cities/${id}/`)),
  getShippingCharges: (params?: { city?: string; search?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<{ id: number; city: number; city_name: string; charge: string; created_at: string; updated_at: string }>>(admin(`shipping-charges/${q}`));
  },
  getShippingCharge: (id: number) => api.get<{ id: number; city: number; city_name: string; charge: string; created_at: string; updated_at: string }>(admin(`shipping-charges/${id}/`)),
  createShippingCharge: (data: { city: number; charge: number | string }) => api.post(admin("shipping-charges/"), data),
  updateShippingCharge: (id: number, data: { city?: number; charge?: number | string }) => api.patch(admin(`shipping-charges/${id}/`), data),
  deleteShippingCharge: (id: number) => api.delete<void>(admin(`shipping-charges/${id}/`)),
  getAddressesAdmin: (params?: { user?: string; city?: string; search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Address>>(admin(`addresses/${q}`));
  },
  getAddressAdmin: (id: number) => api.get<Address>(admin(`addresses/${id}/`)),
  createAddressAdmin: (data: Partial<Address>) => api.post<Address>(admin("addresses/"), data),
  updateAddressAdmin: (id: number, data: Partial<Address>) => api.patch<Address>(admin(`addresses/${id}/`), data),
  deleteAddressAdmin: (id: number) => api.delete<void>(admin(`addresses/${id}/`)),
  getPaidRecords: (params?: { vendor?: string; user?: string; payment_method?: string; search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<PaidRecord>>(admin(`paid-records/${q}`));
  },
  getPaidRecord: (id: number) => api.get<PaidRecord>(admin(`paid-records/${id}/`)),
  createPaidRecord: (data: Partial<PaidRecord>) => api.post<PaidRecord>(admin("paid-records/"), data),
  updatePaidRecord: (id: number, data: Partial<PaidRecord>) => api.patch<PaidRecord>(admin(`paid-records/${id}/`), data),
  deletePaidRecord: (id: number) => api.delete<void>(admin(`paid-records/${id}/`)),
  getReceivedRecords: (params?: { vendor?: string; user?: string; payment_method?: string; search?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<ReceivedRecord>>(admin(`received-records/${q}`));
  },
  getReceivedRecord: (id: number) => api.get<ReceivedRecord>(admin(`received-records/${id}/`)),
  createReceivedRecord: (data: Partial<ReceivedRecord>) => api.post<ReceivedRecord>(admin("received-records/"), data),
  updateReceivedRecord: (id: number, data: Partial<ReceivedRecord>) => api.patch<ReceivedRecord>(admin(`received-records/${id}/`), data),
  deleteReceivedRecord: (id: number) => api.delete<void>(admin(`received-records/${id}/`)),
  getSystemWithdrawals: (params?: { status?: string; date_from?: string; date_to?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<SystemWithdrawal>>(admin(`system-withdrawals/${q}`));
  },
  getSystemWithdrawal: (id: number) => api.get<SystemWithdrawal>(admin(`system-withdrawals/${id}/`)),
  createSystemWithdrawal: (data: Partial<SystemWithdrawal>) => api.post<SystemWithdrawal>(admin("system-withdrawals/"), data),
  patchSystemWithdrawal: (id: number, data: Partial<{ remarks: string; reject_reason: string; amount: number }>) =>
    api.patch<SystemWithdrawal>(admin(`system-withdrawals/${id}/`), data),
  deleteSystemWithdrawal: (id: number) => api.delete<void>(admin(`system-withdrawals/${id}/`)),
  approveSystemWithdrawal: (id: number) => api.post<SystemWithdrawal>(admin(`system-withdrawals/${id}/approve/`), {}),
  rejectSystemWithdrawal: (id: number, reason: string) =>
    api.post<SystemWithdrawal>(admin(`system-withdrawals/${id}/reject/`), { reason }),
  // Banners
  getBanners: (params?: { search?: string; is_active?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<Banner>>(admin(`banners/${q}`));
  },
  getBanner: (id: number) => api.get<Banner>(admin(`banners/${id}/`)),
  createBanner: (data: FormData) => api.postForm<Banner>(admin("banners/"), data),
  updateBanner: (id: number, data: FormData) => api.patchForm<Banner>(admin(`banners/${id}/`), data),
  deleteBanner: (id: number) => api.delete<void>(admin(`banners/${id}/`)),
  // Site Settings
  getAdminSiteSettings: () => api.get<SiteSetting>(admin("site-settings/")),
  saveAdminSiteSettings: (data: FormData) => api.postForm<SiteSetting>(admin("site-settings/"), data),
  // CMS Pages
  getCmsPages: (params?: { search?: string; is_active?: string; page?: number; page_size?: number; order_by?: string }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<CmsPage>>(admin(`cms-pages/${q}`));
  },
  getCmsPage: (id: number) => api.get<CmsPage>(admin(`cms-pages/${id}/`)),
  createCmsPage: (data: FormData) => api.postForm<CmsPage>(admin("cms-pages/"), data),
  updateCmsPage: (id: number, data: FormData) => api.patchForm<CmsPage>(admin(`cms-pages/${id}/`), data),
  deleteCmsPage: (id: number) => api.delete<void>(admin(`cms-pages/${id}/`)),
  // Push notifications (admin)
  resolvePushReceiverPhones: (phones: string[]) =>
    api.post<{ user_ids: number[]; missing: string[] }>(admin("push-notifications/resolve-phones/"), { phones }),
  getPushNotifications: (params?: {
    search?: string;
    page?: number;
    page_size?: number;
    order_by?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const q = adminListParams(params ?? {});
    return api.get<PaginatedResponse<PushNotificationListItem>>(admin(`push-notifications/${q}`));
  },
  getPushNotification: (id: number) => api.get<PushNotification>(admin(`push-notifications/${id}/`)),
  createPushNotification: (data: FormData) =>
    api.postForm<PushNotification>(admin("push-notifications/"), data),
  updatePushNotification: (id: number, data: FormData) =>
    api.patchForm<PushNotification>(admin(`push-notifications/${id}/`), data),
  deletePushNotification: (id: number) => api.delete<void>(admin(`push-notifications/${id}/`)),
  sendPushNotificationChunk: (id: number, body: { offset: number; limit: number }) =>
    api.post<PushNotificationSendChunkResult>(admin(`push-notifications/${id}/send-chunk/`), body),
};

// Client wishlist
export const clientApi_wishlist = {
  getWishlist: () => api.get<WishlistItem[]>(client("wishlist/")),
  getWishlistIds: () => api.get<{ product_ids: number[] }>(client("wishlist/ids/")),
  addToWishlist: (productId: number) => api.post<WishlistItem>(client("wishlist/"), { product: productId }),
  removeFromWishlist: (productId: number) => api.delete<void>(client(`wishlist/${productId}/`)),
};

// Public site settings
export const getPublicSiteSettings = () => api.get<PublicSiteSetting>("site-settings/");

export const getPublicAppVersion = () => api.get<PublicAppVersion>("app-version/");

// Activity tracking (auth-optional, works for both users and guests)
export interface TrackEventPayload {
  event_name: string;
  platform?: string;
  session_id?: string;
  session_number?: number;
  event_value?: string;
  event_properties?: Record<string, unknown>;
  page_url?: string;
  page_path?: string;
  page_title?: string;
  referrer_url?: string;
  scroll_depth?: number;
  time_on_page?: number;
  clicks_count?: number;
  timezone?: string;
}
export const trackEvent = (payload: TrackEventPayload) =>
  api.post<{ detail: string }>("track/", payload);

// Admin pending counts (for sidebar badges)
export interface PendingCounts {
  payout_accounts: number;
  deposits: number;
  withdrawals: number;
  kyc: number;
  submissions: number;
  sales: number;
}
export const getAdminPendingCounts = () =>
  api.get<PendingCounts>(admin("pending-counts/"));

// Analytics API helpers
function analyticsParams(dateFrom?: string, dateTo?: string): string {
  const p: Record<string, string> = {};
  if (dateFrom) p.date_from = dateFrom;
  if (dateTo) p.date_to = dateTo;
  const q = new URLSearchParams(p).toString();
  return q ? `?${q}` : "";
}

export const analyticsApi = {
  getOverview: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsOverview>(admin(`analytics/overview/${analyticsParams(dateFrom, dateTo)}`)),
  getUsers: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsUsers>(admin(`analytics/users/${analyticsParams(dateFrom, dateTo)}`)),
  getSales: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsSales>(admin(`analytics/sales/${analyticsParams(dateFrom, dateTo)}`)),
  getProducts: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsProducts>(admin(`analytics/products/${analyticsParams(dateFrom, dateTo)}`)),
  getVendors: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsVendors>(admin(`analytics/vendors/${analyticsParams(dateFrom, dateTo)}`)),
  getProcurement: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsProcurement>(admin(`analytics/procurement/${analyticsParams(dateFrom, dateTo)}`)),
  getAffiliates: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsAffiliates>(admin(`analytics/affiliates/${analyticsParams(dateFrom, dateTo)}`)),
  getCampaigns: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsCampaigns>(admin(`analytics/campaigns/${analyticsParams(dateFrom, dateTo)}`)),
  getFinance: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsFinance>(admin(`analytics/finance/${analyticsParams(dateFrom, dateTo)}`)),
  getBehaviour: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsBehaviour>(admin(`analytics/behaviour/${analyticsParams(dateFrom, dateTo)}`)),
  getRetention: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsRetention>(admin(`analytics/retention/${analyticsParams(dateFrom, dateTo)}`)),
  getIntelligence: () =>
    api.get<AnalyticsIntelligence>(admin("analytics/intelligence/")),
  getSms: (dateFrom?: string, dateTo?: string) =>
    api.get<AnalyticsSms>(admin(`analytics/sms/${analyticsParams(dateFrom, dateTo)}`)),
};
