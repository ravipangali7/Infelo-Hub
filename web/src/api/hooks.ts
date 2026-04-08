import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clientApi,
  adminApi,
  getLandingContent,
  getHomeConfig,
  getCmsPageBySlug,
  clientApi_wishlist,
  getPublicSiteSettings,
  getPublicAppVersion,
  trackEvent,
  getAdminPendingCounts,
  analyticsApi,
  getProductSections,
} from "./endpoints";
import type { ProductSectionsMode } from "./endpoints";
import type { TrackEventPayload } from "./endpoints";
import type { SystemSetting } from "./types";
import { getToken } from "./client";

const clientKeys = {
  dashboard: ["client", "dashboard"] as const,
  profile: ["client", "profile"] as const,
  kyc: ["client", "kyc"] as const,
  payoutAccounts: ["client", "payoutAccounts"] as const,
  payoutAccount: (id: number) => ["client", "payoutAccount", id] as const,
  addresses: ["client", "addresses"] as const,
  shippingCharges: ["client", "shippingCharges"] as const,
  address: (id: number) => ["client", "address", id] as const,
  wallet: ["client", "wallet"] as const,
  /** Invalidate with this so deposit/withdraw/unfiltered list queries all refetch. */
  paymentRequestsRoot: ["client", "paymentRequests"] as const,
  paymentRequests: (type?: string) => ["client", "paymentRequests", type] as const,
  products: (params?: { category?: string; category_tree?: string; search?: string }) => ["client", "products", params] as const,
  product: (slug: string) => ["client", "product", slug] as const,
  productById: (id: number) => ["client", "productById", id] as const,
  categories: ["client", "categories"] as const,
  packages: ["client", "packages"] as const,
  package: (id: number) => ["client", "package", id] as const,
  campaigns: ["client", "campaigns"] as const,
  campaign: (id: number) => ["client", "campaign", id] as const,
  submissions: ["client", "submissions"] as const,
  submission: (id: number) => ["client", "submission", id] as const,
  orders: ["client", "orders"] as const,
  order: (id: number) => ["client", "order", id] as const,
  /** Invalidate with this so wallet + tabbed transaction lists all refetch. */
  transactionsRoot: ["client", "transactions"] as const,
  transactions: (tf?: string) => ["client", "transactions", tf] as const,
  referrals: ["client", "referrals"] as const,
  teamTree: ["client", "teamTree"] as const,
  notifications: (opts?: { unread_only?: boolean }) => ["client", "notifications", opts ?? {}] as const,
  notificationUnreadCount: ["client", "notificationUnreadCount"] as const,
};

const websiteKeys = {
  landing: ["website", "landing"] as const,
  homeConfig: ["website", "homeConfig"] as const,
  cmsPage: (slug: string) => ["website", "cmsPage", slug] as const,
};

export const adminKeys = {
  dashboard: ["admin", "dashboard"] as const,
  pendingCounts: ["admin", "pendingCounts"] as const,
  users: (params?: Record<string, string>) => ["admin", "users", params] as const,
  user: (id: number) => ["admin", "user", id] as const,
  kycList: (params?: Record<string, unknown>) => ["admin", "kyc", params] as const,
  payoutAccounts: (params?: Record<string, unknown>) => ["admin", "payoutAccounts", params] as const,
  payoutAccount: (id: number) => ["admin", "payoutAccount", id] as const,
  deposits: (params?: Record<string, unknown>) => ["admin", "deposits", params] as const,
  deposit: (id: number) => ["admin", "deposit", id] as const,
  withdrawals: (params?: Record<string, unknown>) => ["admin", "withdrawals", params] as const,
  withdrawal: (id: number) => ["admin", "withdrawal", id] as const,
  categories: (params?: Record<string, unknown>) => ["admin", "categories", params] as const,
  category: (id: number) => ["admin", "category", id] as const,
  products: (params?: Record<string, unknown>) => ["admin", "products", params] as const,
  product: (id: number) => ["admin", "product", id] as const,
  campaigns: (params?: Record<string, unknown>) => ["admin", "campaigns", params] as const,
  campaign: (id: number) => ["admin", "campaign", id] as const,
  submissions: (params?: Record<string, unknown>) => ["admin", "submissions", params] as const,
  submission: (id: number) => ["admin", "submission", id] as const,
  packages: (params?: Record<string, unknown>) => ["admin", "packages", params] as const,
  package: (id: number) => ["admin", "package", id] as const,
  sales: (params?: Record<string, unknown>) => ["admin", "sales", params] as const,
  sale: (id: number) => ["admin", "sale", id] as const,
  transactions: (params?: Record<string, unknown>) => ["admin", "transactions", params] as const,
  transaction: (id: number) => ["admin", "transaction", id] as const,
  settings: ["admin", "settings"] as const,
  vendors: (params?: Record<string, unknown>) => ["admin", "vendors", params] as const,
  vendor: (id: number) => ["admin", "vendor", id] as const,
  purchases: (params?: Record<string, unknown>) => ["admin", "purchases", params] as const,
  purchase: (id: number) => ["admin", "purchase", id] as const,
  activityLogs: (params?: Record<string, unknown>) => ["admin", "activityLogs", params] as const,
  cities: (params?: Record<string, unknown>) => ["admin", "cities", params] as const,
  city: (id: number) => ["admin", "city", id] as const,
  shippingCharges: (params?: Record<string, unknown>) => ["admin", "shippingCharges", params] as const,
  shippingCharge: (id: number) => ["admin", "shippingCharge", id] as const,
  addressesAdmin: (params?: Record<string, unknown>) => ["admin", "addresses", params] as const,
  addressAdmin: (id: number) => ["admin", "address", id] as const,
  paidRecords: (params?: Record<string, unknown>) => ["admin", "paidRecords", params] as const,
  paidRecord: (id: number) => ["admin", "paidRecord", id] as const,
  receivedRecords: (params?: Record<string, unknown>) => ["admin", "receivedRecords", params] as const,
  receivedRecord: (id: number) => ["admin", "receivedRecord", id] as const,
  systemWithdrawals: (params?: Record<string, unknown>) => ["admin", "systemWithdrawals", params] as const,
  systemWithdrawal: (id: number) => ["admin", "systemWithdrawal", id] as const,
  banners: (params?: Record<string, unknown>) => ["admin", "banners", params] as const,
  banner: (id: number) => ["admin", "banner", id] as const,
  siteSettings: ["admin", "siteSettings"] as const,
  cmsPages: (params?: Record<string, unknown>) => ["admin", "cmsPages", params] as const,
  cmsPage: (id: number) => ["admin", "cmsPage", id] as const,
  pushNotifications: (params?: Record<string, unknown>) => ["admin", "pushNotifications", params] as const,
  pushNotification: (id: number) => ["admin", "pushNotification", id] as const,
};

export const useAuth = () => !!getToken();

/** Public website hooks (no auth) */
export function useLandingContent() {
  return useQuery({
    queryKey: websiteKeys.landing,
    queryFn: getLandingContent,
    enabled: true,
  });
}

export function useHomeConfig() {
  return useQuery({
    queryKey: websiteKeys.homeConfig,
    queryFn: getHomeConfig,
    enabled: true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCmsPage(slug: string | null) {
  return useQuery({
    queryKey: websiteKeys.cmsPage(slug ?? ""),
    queryFn: () => getCmsPageBySlug(slug!),
    enabled: !!slug,
  });
}

/** Client hooks */
export function useClientDashboard() {
  return useQuery({
    queryKey: clientKeys.dashboard,
    queryFn: () => clientApi.getDashboard(),
    enabled: !!getToken(),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: clientKeys.profile,
    queryFn: () => clientApi.getProfile(),
    enabled: !!getToken(),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.profile }),
  });
}

export function useKycStatus() {
  return useQuery({
    queryKey: clientKeys.kyc,
    queryFn: () => clientApi.getKycStatus(),
    enabled: !!getToken(),
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.submitKyc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.kyc });
      qc.invalidateQueries({ queryKey: clientKeys.profile });
    },
  });
}

export function usePayoutAccounts() {
  return useQuery({
    queryKey: clientKeys.payoutAccounts,
    queryFn: () => clientApi.getPayoutAccounts(),
    enabled: !!getToken(),
  });
}

export function useCreatePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.createPayoutAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.payoutAccounts }),
  });
}

export function useDeletePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.deletePayoutAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.payoutAccounts }),
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: clientKeys.addresses,
    queryFn: () => clientApi.getAddresses(),
    enabled: !!getToken(),
  });
}

export function useShippingCharges() {
  return useQuery({
    queryKey: clientKeys.shippingCharges,
    queryFn: () => clientApi.getShippingCharges(),
    enabled: !!getToken(),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.createAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.addresses }),
  });
}

export function useUpdateAddress(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof clientApi.updateAddress>[1]) => clientApi.updateAddress(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.addresses });
      qc.invalidateQueries({ queryKey: clientKeys.address(id) });
    },
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.deleteAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: clientKeys.addresses }),
  });
}

export function useWallet() {
  return useQuery({
    queryKey: clientKeys.wallet,
    queryFn: () => clientApi.getWallet(),
    enabled: !!getToken(),
  });
}

export function usePaymentRequests(type?: string) {
  return useQuery({
    queryKey: clientKeys.paymentRequests(type),
    queryFn: () => clientApi.getPaymentRequests(type),
    enabled: !!getToken(),
  });
}

export function useCreatePaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.createPaymentRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientKeys.paymentRequestsRoot });
      qc.invalidateQueries({ queryKey: clientKeys.wallet });
      qc.invalidateQueries({ queryKey: clientKeys.transactionsRoot });
    },
  });
}

export function useProducts(params?: { category?: string; category_tree?: string; search?: string }) {
  return useQuery({
    queryKey: clientKeys.products(params),
    queryFn: () => clientApi.getProducts(params),
    enabled: true,
  });
}

export function useProductSections(opts: {
  mode: ProductSectionsMode;
  perSection?: number;
  featuredLimit?: number;
  omitSections?: boolean;
}) {
  const { mode, perSection = 8, featuredLimit = 8, omitSections = false } = opts;
  return useQuery({
    queryKey: ["client", "productSections", mode, perSection, featuredLimit, omitSections] as const,
    queryFn: () => getProductSections({ mode, perSection, featuredLimit, omitSections }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(slug: string | null) {
  return useQuery({
    queryKey: clientKeys.product(slug ?? ""),
    queryFn: () => clientApi.getProduct(slug!),
    enabled: !!slug,
  });
}

export function useProductById(id: number | null) {
  return useQuery({
    queryKey: clientKeys.productById(id ?? 0),
    queryFn: () => clientApi.getProductById(id!),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: clientKeys.categories,
    queryFn: () => clientApi.getCategories(),
    enabled: true,
  });
}

export function usePackages() {
  return useQuery({
    queryKey: clientKeys.packages,
    queryFn: () => clientApi.getPackages(),
    enabled: !!getToken(),
  });
}

export function usePackage(id: number | null) {
  return useQuery({
    queryKey: clientKeys.package(id ?? 0),
    queryFn: () => clientApi.getPackage(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: clientKeys.campaigns,
    queryFn: () => clientApi.getCampaigns(),
    enabled: true,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCampaign(id: number | null) {
  return useQuery({
    queryKey: clientKeys.campaign(id ?? 0),
    queryFn: () => clientApi.getCampaign(id!),
    enabled: !!id,
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: clientKeys.submissions,
    queryFn: () => clientApi.getSubmissions(),
    enabled: !!getToken(),
  });
}

export function useSubmission(id: number | null) {
  return useQuery({
    queryKey: clientKeys.submission(id ?? 0),
    queryFn: () => clientApi.getSubmission(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientApi.createSubmission,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: clientKeys.submissions });
      qc.invalidateQueries({ queryKey: clientKeys.submission(data.id) });
    },
  });
}

export function useCreateSubmissionProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, formData }: { submissionId: number; formData: FormData }) =>
      clientApi.createSubmissionProof(submissionId, formData),
    onSuccess: (_, { submissionId }) => {
      qc.invalidateQueries({ queryKey: clientKeys.submissions });
      qc.invalidateQueries({ queryKey: clientKeys.submission(submissionId) });
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: clientKeys.orders,
    queryFn: () => clientApi.getOrders(),
    enabled: !!getToken(),
  });
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: clientKeys.order(id ?? 0),
    queryFn: () => clientApi.getOrder(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useTransactions(transaction_for?: string) {
  return useQuery({
    queryKey: clientKeys.transactions(transaction_for),
    queryFn: () => clientApi.getTransactions(transaction_for),
    enabled: !!getToken(),
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: clientKeys.referrals,
    queryFn: () => clientApi.getReferrals(),
    enabled: !!getToken(),
  });
}

export function useTeamTree() {
  return useQuery({
    queryKey: clientKeys.teamTree,
    queryFn: () => clientApi.getTeamTree(),
    enabled: !!getToken(),
  });
}

export function useClientNotifications(opts?: { unread_only?: boolean }) {
  return useQuery({
    queryKey: clientKeys.notifications(opts),
    queryFn: () => clientApi.getNotifications(opts),
    enabled: !!getToken(),
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: clientKeys.notificationUnreadCount,
    queryFn: () => clientApi.getNotificationUnreadCount(),
    enabled: !!getToken(),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clientApi.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
      qc.invalidateQueries({ queryKey: clientKeys.notificationUnreadCount });
    },
  });
}

export function useMarkAllNotificationsUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clientApi.markAllNotificationsUnread(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
      qc.invalidateQueries({ queryKey: clientKeys.notificationUnreadCount });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientApi.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
      qc.invalidateQueries({ queryKey: clientKeys.notificationUnreadCount });
    },
  });
}

export function useMarkNotificationUnread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientApi.markNotificationUnread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "notifications"] });
      qc.invalidateQueries({ queryKey: clientKeys.notificationUnreadCount });
    },
  });
}

/** Admin hooks */
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: () => adminApi.getDashboard(),
    enabled: !!getToken(),
  });
}

export function useAdminUserList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.users(params as Record<string, string> | undefined),
    queryFn: () => adminApi.getUsers(params),
    enabled: !!getToken(),
  });
}

export function useAdminUser(id: number | null) {
  return useQuery({
    queryKey: adminKeys.user(id ?? 0),
    queryFn: () => adminApi.getUser(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminUpdateUser(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updateUser>[1]) => adminApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
      qc.invalidateQueries({ queryKey: adminKeys.user(id) });
    },
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
      qc.invalidateQueries({ queryKey: adminKeys.user(id) });
    },
  });
}

export function useAdminKycList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.kycList(params),
    queryFn: () => adminApi.getKycList(params),
    enabled: !!getToken(),
  });
}

export function useAdminApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.approveKyc,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.kycList() }),
  });
}

export function useAdminRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      adminApi.rejectKyc(userId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.kycList() }),
  });
}

export function useAdminPayoutAccountList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.payoutAccounts(params),
    queryFn: () => adminApi.getPayoutAccounts(params),
    enabled: !!getToken(),
  });
}

export function useAdminPayoutAccount(id: number | null) {
  return useQuery({
    queryKey: adminKeys.payoutAccount(id ?? 0),
    queryFn: () => adminApi.getPayoutAccount(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreatePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createPayoutAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.payoutAccounts() }),
  });
}

export function useAdminUpdatePayoutAccount(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updatePayoutAccount>[1]) => adminApi.updatePayoutAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.payoutAccounts() });
      qc.invalidateQueries({ queryKey: adminKeys.payoutAccount(id) });
    },
  });
}

export function useAdminDeletePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deletePayoutAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.payoutAccounts() }),
  });
}

export function useAdminDepositList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.deposits(params),
    queryFn: () => adminApi.getDeposits(params),
    enabled: !!getToken(),
  });
}

export function useAdminDeposit(id: number | null) {
  return useQuery({
    queryKey: adminKeys.deposit(id ?? 0),
    queryFn: () => adminApi.getDeposit(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createDeposit,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.deposits() }),
  });
}

export function useAdminUpdateDeposit(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updateDeposit>[1]) => adminApi.updateDeposit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.deposits() });
      qc.invalidateQueries({ queryKey: adminKeys.deposit(id) });
    },
  });
}

export function useAdminDeleteDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteDeposit,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.deposits() }),
  });
}

export function useAdminWithdrawalList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.withdrawals(params),
    queryFn: () => adminApi.getWithdrawals(params),
    enabled: !!getToken(),
  });
}

export function useAdminWithdrawal(id: number | null) {
  return useQuery({
    queryKey: adminKeys.withdrawal(id ?? 0),
    queryFn: () => adminApi.getWithdrawal(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.withdrawals() }),
  });
}

export function useAdminUpdateWithdrawal(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updateWithdrawal>[1]) => adminApi.updateWithdrawal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.withdrawals() });
      qc.invalidateQueries({ queryKey: adminKeys.withdrawal(id) });
    },
  });
}

export function useAdminDeleteWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.withdrawals() }),
  });
}

export function useAdminCategoryList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.categories(params),
    queryFn: () => adminApi.getCategories(params),
    enabled: !!getToken(),
  });
}

export function useAdminProductList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.getProducts(params),
    enabled: !!getToken(),
  });
}

export function useAdminCampaignList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.campaigns(params),
    queryFn: () => adminApi.getCampaigns(params),
    enabled: !!getToken(),
  });
}

export function useAdminSubmissionList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.submissions(params),
    queryFn: () => adminApi.getSubmissions(params),
    enabled: !!getToken(),
  });
}

export function useAdminPackageList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.packages(params),
    queryFn: () => adminApi.getPackages(params),
    enabled: !!getToken(),
  });
}

export function useAdminPackage(id: number | null) {
  return useQuery({
    queryKey: adminKeys.package(id ?? 0),
    queryFn: () => adminApi.getPackage(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminSalesList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.sales(params),
    queryFn: () => adminApi.getSales(params),
    enabled: !!getToken(),
  });
}

export function useAdminTransactionList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.transactions(params),
    queryFn: () => adminApi.getTransactions(params),
    enabled: !!getToken(),
  });
}

export function useAdminTransaction(id: number | null) {
  return useQuery({
    queryKey: adminKeys.transaction(id ?? 0),
    queryFn: () => adminApi.getTransaction(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteTransaction,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: adminKeys.transactions() });
      qc.invalidateQueries({ queryKey: adminKeys.transaction(id) });
    },
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => adminApi.getSettings(),
    enabled: !!getToken(),
    retry: (_, error) => {
      const err = error as { status?: number };
      return err?.status !== 404;
    },
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings }),
  });
}

export function useAdminUpdateMobileSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formData,
      json,
      onProgress,
    }: {
      formData?: FormData;
      json?: Partial<SystemSetting>;
      onProgress?: (loaded: number, total: number) => void;
    }) => {
      if (formData) {
        return adminApi.updateSettingsMultipartWithProgress(formData, onProgress);
      }
      if (json) {
        return adminApi.updateSettings(json);
      }
      throw new Error("formData or json required");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings }),
  });
}

export function useAdminVendorList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.vendors(params),
    queryFn: () => adminApi.getVendors(params),
    enabled: !!getToken(),
  });
}

export function useAdminVendor(id: number | null) {
  return useQuery({
    queryKey: adminKeys.vendor(id ?? 0),
    queryFn: () => adminApi.getVendor(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createVendor,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.vendors }),
  });
}

export function useAdminUpdateVendor(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updateVendor>[1]) => adminApi.updateVendor(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.vendors });
      qc.invalidateQueries({ queryKey: adminKeys.vendor(id) });
    },
  });
}

export function useAdminDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteVendor,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: adminKeys.vendors });
      qc.invalidateQueries({ queryKey: adminKeys.vendor(id) });
    },
  });
}

export function useAdminPurchaseList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.purchases(params),
    queryFn: () => adminApi.getPurchases(params),
    enabled: !!getToken(),
  });
}

export function useAdminPurchase(id: number | null) {
  return useQuery({
    queryKey: adminKeys.purchase(id ?? 0),
    queryFn: () => adminApi.getPurchase(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createPurchase,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.purchases() }),
  });
}

export function useAdminUpdatePurchase(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updatePurchase>[1]) => adminApi.updatePurchase(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.purchases() });
      qc.invalidateQueries({ queryKey: adminKeys.purchase(id) });
    },
  });
}

export function useAdminDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deletePurchase,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.purchases() }),
  });
}

export function useAdminActivityLogList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.activityLogs(params),
    queryFn: () => adminApi.getActivityLogs(params),
    enabled: !!getToken(),
  });
}

export function useAdminCityList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.cities(params),
    queryFn: () => adminApi.getCities(params),
    enabled: !!getToken(),
  });
}

export function useAdminCity(id: number | null) {
  return useQuery({
    queryKey: adminKeys.city(id ?? 0),
    queryFn: () => adminApi.getCity(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminShippingChargeList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.shippingCharges(params),
    queryFn: () => adminApi.getShippingCharges(params),
    enabled: !!getToken(),
  });
}

export function useAdminShippingCharge(id: number | null) {
  return useQuery({
    queryKey: adminKeys.shippingCharge(id ?? 0),
    queryFn: () => adminApi.getShippingCharge(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminAddressList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.addressesAdmin(params),
    queryFn: () => adminApi.getAddressesAdmin(params),
    enabled: !!getToken(),
  });
}

export function useAdminAddress(id: number | null) {
  return useQuery({
    queryKey: adminKeys.addressAdmin(id ?? 0),
    queryFn: () => adminApi.getAddressAdmin(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminPaidRecordList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.paidRecords(params),
    queryFn: () => adminApi.getPaidRecords(params),
    enabled: !!getToken(),
  });
}

export function useAdminPaidRecord(id: number | null) {
  return useQuery({
    queryKey: adminKeys.paidRecord(id ?? 0),
    queryFn: () => adminApi.getPaidRecord(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminReceivedRecordList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.receivedRecords(params),
    queryFn: () => adminApi.getReceivedRecords(params),
    enabled: !!getToken(),
  });
}

export function useAdminReceivedRecord(id: number | null) {
  return useQuery({
    queryKey: adminKeys.receivedRecord(id ?? 0),
    queryFn: () => adminApi.getReceivedRecord(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminSystemWithdrawalList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.systemWithdrawals(params),
    queryFn: () => adminApi.getSystemWithdrawals(params),
    enabled: !!getToken(),
  });
}

export function useAdminSystemWithdrawal(id: number | null) {
  return useQuery({
    queryKey: adminKeys.systemWithdrawal(id ?? 0),
    queryFn: () => adminApi.getSystemWithdrawal(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateSystemWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createSystemWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawals() }),
  });
}

export function useAdminDeleteSystemWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteSystemWithdrawal,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.systemWithdrawals() }),
  });
}

export function useAdminCategory(id: number | null) {
  return useQuery({
    queryKey: adminKeys.category(id ?? 0),
    queryFn: () => adminApi.getCategory(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminProduct(id: number | null) {
  return useQuery({
    queryKey: adminKeys.product(id ?? 0),
    queryFn: () => adminApi.getProduct(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCampaign(id: number | null) {
  return useQuery({
    queryKey: adminKeys.campaign(id ?? 0),
    queryFn: () => adminApi.getCampaign(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminSubmission(id: number | null) {
  return useQuery({
    queryKey: adminKeys.submission(id ?? 0),
    queryFn: () => adminApi.getSubmission(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteSubmission,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: adminKeys.submissions() });
      qc.invalidateQueries({ queryKey: adminKeys.submission(id) });
    },
  });
}

export function useAdminSale(id: number | null) {
  return useQuery({
    queryKey: adminKeys.sale(id ?? 0),
    queryFn: () => adminApi.getSale(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createSale,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.sales() }),
  });
}

export function useAdminUpdateSale(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof adminApi.updateSale>[1]) => adminApi.updateSale(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.sales() });
      qc.invalidateQueries({ queryKey: adminKeys.sale(id) });
    },
  });
}

export function useAdminDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteSale,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.sales() }),
  });
}

// ── Banner hooks ───────────────────────────────────────────────────────────────

export function useAdminBannerList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.banners(params),
    queryFn: () => adminApi.getBanners(params),
    enabled: !!getToken(),
  });
}

export function useAdminBanner(id: number | null) {
  return useQuery({
    queryKey: adminKeys.banner(id ?? 0),
    queryFn: () => adminApi.getBanner(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.createBanner(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.banners() }),
  });
}

export function useAdminUpdateBanner(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.updateBanner(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.banners() });
      qc.invalidateQueries({ queryKey: adminKeys.banner(id) });
    },
  });
}

export function useAdminDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteBanner,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.banners() }),
  });
}

// ── Site Settings hooks ────────────────────────────────────────────────────────

export function useAdminSiteSettings() {
  return useQuery({
    queryKey: adminKeys.siteSettings,
    queryFn: () => adminApi.getAdminSiteSettings(),
    enabled: !!getToken(),
  });
}

export function useAdminSaveSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.saveAdminSiteSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.siteSettings });
      qc.invalidateQueries({ queryKey: ["website", "siteSettings"] });
    },
  });
}

// ── CMS Page hooks ─────────────────────────────────────────────────────────────

export function useAdminCmsPageList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.cmsPages(params),
    queryFn: () => adminApi.getCmsPages(params),
    enabled: !!getToken(),
  });
}

export function useAdminCmsPage(id: number | null) {
  return useQuery({
    queryKey: adminKeys.cmsPage(id ?? 0),
    queryFn: () => adminApi.getCmsPage(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreateCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.createCmsPage(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.cmsPages() }),
  });
}

export function useAdminUpdateCmsPage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.updateCmsPage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.cmsPages() });
      qc.invalidateQueries({ queryKey: adminKeys.cmsPage(id) });
    },
  });
}

export function useAdminDeleteCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteCmsPage,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.cmsPages() }),
  });
}

// ── Push notifications (admin) ────────────────────────────────────────────────

export function useAdminPushNotificationList(params?: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: adminKeys.pushNotifications(params),
    queryFn: () => adminApi.getPushNotifications(params),
    enabled: !!getToken(),
  });
}

export function useAdminPushNotification(id: number | null) {
  return useQuery({
    queryKey: adminKeys.pushNotification(id ?? 0),
    queryFn: () => adminApi.getPushNotification(id!),
    enabled: !!getToken() && !!id,
  });
}

export function useAdminCreatePushNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.createPushNotification(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.pushNotifications() }),
  });
}

export function useAdminUpdatePushNotification(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => adminApi.updatePushNotification(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.pushNotifications() });
      qc.invalidateQueries({ queryKey: adminKeys.pushNotification(id) });
    },
  });
}

export function useAdminDeletePushNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deletePushNotification,
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.pushNotifications() }),
  });
}

// ── Wishlist hooks ─────────────────────────────────────────────────────────────

export function useWishlist() {
  return useQuery({
    queryKey: ["client", "wishlist"],
    queryFn: () => clientApi_wishlist.getWishlist(),
    enabled: !!getToken(),
  });
}

export function useWishlistIds() {
  return useQuery({
    queryKey: ["client", "wishlistIds"],
    queryFn: () => clientApi_wishlist.getWishlistIds(),
    enabled: !!getToken(),
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => clientApi_wishlist.addToWishlist(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "wishlist"] });
      qc.invalidateQueries({ queryKey: ["client", "wishlistIds"] });
    },
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => clientApi_wishlist.removeFromWishlist(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", "wishlist"] });
      qc.invalidateQueries({ queryKey: ["client", "wishlistIds"] });
    },
  });
}

// ── Public Site Settings hook ──────────────────────────────────────────────────

export function usePublicSiteSettings() {
  return useQuery({
    queryKey: ["website", "siteSettings"],
    queryFn: getPublicSiteSettings,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function usePublicAppVersion() {
  return useQuery({
    queryKey: ["website", "appVersion"],
    queryFn: getPublicAppVersion,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

// ── Admin Pending Counts (sidebar badges) ──────────────────────────────────────

export function useAdminPendingCounts() {
  return useQuery({
    queryKey: adminKeys.pendingCounts,
    queryFn: getAdminPendingCounts,
    enabled: !!getToken(),
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

// ── Activity Tracking mutation ─────────────────────────────────────────────────

export function useTrackEvent() {
  return useMutation({
    mutationFn: (payload: TrackEventPayload) => trackEvent(payload),
  });
}

// ── Analytics hooks ───────────────────────────────────────────────────────────

export function useAnalyticsOverview(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "overview", dateFrom, dateTo],
    queryFn: () => analyticsApi.getOverview(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsUsers(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "users", dateFrom, dateTo],
    queryFn: () => analyticsApi.getUsers(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsSales(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "sales", dateFrom, dateTo],
    queryFn: () => analyticsApi.getSales(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsProducts(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "products", dateFrom, dateTo],
    queryFn: () => analyticsApi.getProducts(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsVendors(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "vendors", dateFrom, dateTo],
    queryFn: () => analyticsApi.getVendors(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsProcurement(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "procurement", dateFrom, dateTo],
    queryFn: () => analyticsApi.getProcurement(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsAffiliates(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "affiliates", dateFrom, dateTo],
    queryFn: () => analyticsApi.getAffiliates(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsCampaigns(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "campaigns", dateFrom, dateTo],
    queryFn: () => analyticsApi.getCampaigns(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsFinance(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "finance", dateFrom, dateTo],
    queryFn: () => analyticsApi.getFinance(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsBehaviour(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "behaviour", dateFrom, dateTo],
    queryFn: () => analyticsApi.getBehaviour(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsRetention(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "retention", dateFrom, dateTo],
    queryFn: () => analyticsApi.getRetention(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}

export function useAnalyticsIntelligence() {
  return useQuery({
    queryKey: ["admin", "analytics", "intelligence"],
    queryFn: () => analyticsApi.getIntelligence(),
    enabled: !!getToken(),
    staleTime: 120_000,
  });
}

export function useAnalyticsSms(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["admin", "analytics", "sms", dateFrom, dateTo],
    queryFn: () => analyticsApi.getSms(dateFrom, dateTo),
    enabled: !!getToken(),
    staleTime: 60_000,
  });
}
