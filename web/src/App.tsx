import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

// Client App Pages
import ClientLayout from "./layouts/ClientLayout";
import Home from "./pages/client/Home";
import Shop from "./pages/client/Shop";
import Wallet from "./pages/client/Wallet";
import Profile from "./pages/client/Profile";
import ProductDetail from "./pages/client/ProductDetail";
import CampaignDetail from "./pages/client/CampaignDetail";
import Deposit from "./pages/client/Deposit";
import Withdraw from "./pages/client/Withdraw";
import MyOrders from "./pages/client/MyOrders";
import OrderDetail from "./pages/client/OrderDetail";
import MyCampaigns from "./pages/client/MyCampaigns";
import SubmissionDetail from "./pages/client/SubmissionDetail";
import PayoutAccounts from "./pages/client/PayoutAccounts";
import Addresses from "./pages/client/Addresses";
import Transactions from "./pages/client/Transactions";
import KycPage from "./pages/client/KycPage";

// Admin Panel Pages
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminUserView from "./pages/admin/UserView";
import AdminUserForm from "./pages/admin/UserForm";
import AdminKyc from "./pages/admin/KycManagement";
import AdminPayoutAccounts from "./pages/admin/PayoutAccountsAdmin";
import AdminVendors from "./pages/admin/Vendors";
import AdminDeposits from "./pages/admin/Deposits";
import AdminWithdrawals from "./pages/admin/Withdrawals";
import AdminCategories from "./pages/admin/Categories";
import AdminProducts from "./pages/admin/Products";
import AdminCampaigns from "./pages/admin/Campaigns";
import AdminSubmissions from "./pages/admin/Submissions";
import AdminPackages from "./pages/admin/Packages";
import AdminPurchases from "./pages/admin/Purchases";
import AdminSales from "./pages/admin/Sales";
import AdminTransactions from "./pages/admin/Transactions";
import AdminSettings from "./pages/admin/Settings";
import AdminActivityLogs from "./pages/admin/ActivityLogs";
import AdminSmsLogs from "./pages/admin/SmsLogs";
import AdminCities from "./pages/admin/Cities";
import AdminCityView from "./pages/admin/CityView";
import AdminCityForm from "./pages/admin/CityForm";
import AdminShippingCharges from "./pages/admin/ShippingCharges";
import AdminAddressesAdmin from "./pages/admin/AddressesAdmin";
import AdminPaidRecords from "./pages/admin/PaidRecords";
import AdminReceivedRecords from "./pages/admin/ReceivedRecords";
import AdminSystemWithdrawals from "./pages/admin/SystemWithdrawals";
import AdminShippingChargeForm from "./pages/admin/ShippingChargeForm";
import AdminShippingChargeView from "./pages/admin/ShippingChargeView";
import AdminAddressAdminForm from "./pages/admin/AddressAdminForm";
import AdminAddressAdminView from "./pages/admin/AddressAdminView";
import AdminPaidRecordForm from "./pages/admin/PaidRecordForm";
import AdminPaidRecordView from "./pages/admin/PaidRecordView";
import AdminReceivedRecordForm from "./pages/admin/ReceivedRecordForm";
import AdminReceivedRecordView from "./pages/admin/ReceivedRecordView";
import AdminSystemWithdrawalView from "./pages/admin/SystemWithdrawalView";
import AdminCategoryForm from "./pages/admin/CategoryForm";
import AdminCategoryView from "./pages/admin/CategoryView";
import AdminProductForm from "./pages/admin/ProductForm";
import AdminProductView from "./pages/admin/ProductView";
import AdminCampaignForm from "./pages/admin/CampaignForm";
import AdminCampaignView from "./pages/admin/CampaignView";
import AdminPackageForm from "./pages/admin/PackageForm";
import AdminPackageView from "./pages/admin/PackageView";
import AdminSubmissionView from "./pages/admin/SubmissionView";
import AdminPurchaseView from "./pages/admin/PurchaseView";
import AdminSaleView from "./pages/admin/SaleView";
import AdminVendorForm from "./pages/admin/VendorForm";
import AdminVendorView from "./pages/admin/VendorView";
import AdminDepositView from "./pages/admin/DepositView";
import AdminWithdrawalView from "./pages/admin/WithdrawalView";
import AdminPayoutAccountView from "./pages/admin/PayoutAccountView";
import AdminTransactionView from "./pages/admin/TransactionView";
import AdminPayoutAccountForm from "./pages/admin/PayoutAccountForm";
import AdminDepositForm from "./pages/admin/DepositForm";
import AdminWithdrawalForm from "./pages/admin/WithdrawalForm";
import AdminPurchaseForm from "./pages/admin/PurchaseForm";
import AdminSaleForm from "./pages/admin/SaleForm";
import AdminSystemWithdrawalForm from "./pages/admin/SystemWithdrawalForm";

import Cart from "./pages/client/Cart";
import Checkout from "./pages/client/Checkout";
import LearnToEarn from "./pages/client/LearnToEarn";
import Wishlist from "./pages/client/Wishlist";
import Notifications from "./pages/client/Notifications";

// Analytics Pages
import OverviewAnalytics from "./pages/admin/analytics/OverviewAnalytics";
import UsersAnalytics from "./pages/admin/analytics/UsersAnalytics";
import SalesAnalytics from "./pages/admin/analytics/SalesAnalytics";
import ProductsAnalytics from "./pages/admin/analytics/ProductsAnalytics";
import EarningAnalytics from "./pages/admin/analytics/EarningAnalytics";
import FinanceAnalytics from "./pages/admin/analytics/FinanceAnalytics";
import BehaviourAnalytics from "./pages/admin/analytics/BehaviourAnalytics";
import IntelligenceAnalytics from "./pages/admin/analytics/IntelligenceAnalytics";
import SmsAnalytics from "./pages/admin/analytics/SmsAnalytics";

// Admin Content pages
import AdminBanners from "./pages/admin/Banners";
import AdminBannersNew from "./pages/admin/BannersNew";
import AdminBannersEdit from "./pages/admin/BannersEdit";
import AdminSiteSettings from "./pages/admin/SiteSettings";
import AdminCmsPages from "./pages/admin/CmsPages";
import AdminCmsPagesNew from "./pages/admin/CmsPagesNew";
import AdminCmsPagesEdit from "./pages/admin/CmsPagesEdit";
import AdminPushNotifications from "./pages/admin/PushNotifications";
import AdminPushNotificationsNew from "./pages/admin/PushNotificationsNew";
import AdminPushNotificationsEdit from "./pages/admin/PushNotificationsEdit";
import AdminPushNotificationView from "./pages/admin/PushNotificationView";
import AdminNotificationsInbox from "./pages/admin/AdminNotificationsInbox";

import CmsPage from "./pages/client/CmsPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AccountBlocked from "./pages/AccountBlocked";
import { CartProvider } from "./contexts/CartContext";
import ScrollToTop from "./components/ScrollToTop";
import { getToken } from "./api/client";
import FloatingWhatsAppButton from "./components/FloatingWhatsAppButton";
import { I18nHtmlLang } from "./components/I18nHtmlLang";

const queryClient = new QueryClient();

const RequireAuth = () => {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <I18nHtmlLang />
        <ScrollToTop />
        <FloatingWhatsAppButton />
        <Routes>
          {/* Client App Routes */}
          <Route path="/" element={<ClientLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route path="page/:slug" element={<CmsPage />} />
            <Route path="campaign/:id" element={<CampaignDetail />} />
            <Route path="campaigns" element={<MyCampaigns />} />
            <Route path="learn-to-earn" element={<LearnToEarn />} />

            <Route element={<RequireAuth />}>
              <Route path="wallet" element={<Wallet />} />
              <Route path="profile" element={<Profile />} />
              <Route path="deposit" element={<Deposit />} />
              <Route path="withdraw" element={<Withdraw />} />
              <Route path="orders" element={<MyOrders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="submission/:id" element={<SubmissionDetail />} />
              <Route path="payout-accounts" element={<PayoutAccounts />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="kyc" element={<KycPage />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Admin Panel Routes */}
          <Route path="/system" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="my-notifications" element={<AdminNotificationsInbox />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/new" element={<AdminUserForm />} />
            <Route path="users/:id" element={<AdminUserView />} />
            <Route path="users/:id/edit" element={<AdminUserForm />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="payout-accounts" element={<AdminPayoutAccounts />} />
            <Route path="payout-accounts/new" element={<AdminPayoutAccountForm />} />
            <Route path="payout-accounts/:id/edit" element={<AdminPayoutAccountForm />} />
            <Route path="payout-accounts/:id" element={<AdminPayoutAccountView />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="deposits" element={<AdminDeposits />} />
            <Route path="deposits/new" element={<AdminDepositForm />} />
            <Route path="deposits/:id/edit" element={<AdminDepositForm />} />
            <Route path="deposits/:id" element={<AdminDepositView />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="withdrawals/new" element={<AdminWithdrawalForm />} />
            <Route path="withdrawals/:id/edit" element={<AdminWithdrawalForm />} />
            <Route path="withdrawals/:id" element={<AdminWithdrawalView />} />
            <Route path="cities" element={<AdminCities />} />
            <Route path="cities/new" element={<AdminCityForm />} />
            <Route path="cities/:id" element={<AdminCityView />} />
            <Route path="cities/:id/edit" element={<AdminCityForm />} />
            <Route path="shipping-charges" element={<AdminShippingCharges />} />
            <Route path="shipping-charges/new" element={<AdminShippingChargeForm />} />
            <Route path="shipping-charges/:id/edit" element={<AdminShippingChargeForm />} />
            <Route path="shipping-charges/:id" element={<AdminShippingChargeView />} />
            <Route path="addresses" element={<AdminAddressesAdmin />} />
            <Route path="addresses/new" element={<AdminAddressAdminForm />} />
            <Route path="addresses/:id/edit" element={<AdminAddressAdminForm />} />
            <Route path="addresses/:id" element={<AdminAddressAdminView />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="categories/new" element={<AdminCategoryForm />} />
            <Route path="categories/:id/edit" element={<AdminCategoryForm />} />
            <Route path="categories/:id" element={<AdminCategoryView />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="products/:id" element={<AdminProductView />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="campaigns/new" element={<AdminCampaignForm />} />
            <Route path="campaigns/:id/edit" element={<AdminCampaignForm />} />
            <Route path="campaigns/:id" element={<AdminCampaignView />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="submissions/:id" element={<AdminSubmissionView />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="packages/new" element={<AdminPackageForm />} />
            <Route path="packages/:id/edit" element={<AdminPackageForm />} />
            <Route path="packages/:id" element={<AdminPackageView />} />
            <Route path="purchases" element={<AdminPurchases />} />
            <Route path="purchases/new" element={<AdminPurchaseForm />} />
            <Route path="purchases/:id/edit" element={<AdminPurchaseForm />} />
            <Route path="purchases/:id" element={<AdminPurchaseView />} />
            <Route path="sales" element={<AdminSales />} />
            <Route path="sales/new" element={<AdminSaleForm />} />
            <Route path="sales/:id/edit" element={<AdminSaleForm />} />
            <Route path="sales/:id" element={<AdminSaleView />} />
            <Route path="paid-records" element={<AdminPaidRecords />} />
            <Route path="paid-records/new" element={<AdminPaidRecordForm />} />
            <Route path="paid-records/:id/edit" element={<AdminPaidRecordForm />} />
            <Route path="paid-records/:id" element={<AdminPaidRecordView />} />
            <Route path="received-records" element={<AdminReceivedRecords />} />
            <Route path="received-records/new" element={<AdminReceivedRecordForm />} />
            <Route path="received-records/:id/edit" element={<AdminReceivedRecordForm />} />
            <Route path="received-records/:id" element={<AdminReceivedRecordView />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="transactions/:id" element={<AdminTransactionView />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="system-withdrawals" element={<AdminSystemWithdrawals />} />
            <Route path="system-withdrawals/new" element={<AdminSystemWithdrawalForm />} />
            <Route path="system-withdrawals/:id/edit" element={<AdminSystemWithdrawalForm />} />
            <Route path="system-withdrawals/:id" element={<AdminSystemWithdrawalView />} />
            <Route path="activity-logs" element={<AdminActivityLogs />} />
            <Route path="sms-logs" element={<AdminSmsLogs />} />
            <Route path="vendors/new" element={<AdminVendorForm />} />
            <Route path="vendors/:id/edit" element={<AdminVendorForm />} />
            <Route path="vendors/:id" element={<AdminVendorView />} />
            {/* Analytics */}
            <Route path="analytics" element={<OverviewAnalytics />} />
            <Route path="analytics/users" element={<UsersAnalytics />} />
            <Route path="analytics/sales" element={<SalesAnalytics />} />
            <Route path="analytics/products" element={<ProductsAnalytics />} />
            <Route path="analytics/earning" element={<EarningAnalytics />} />
            <Route path="analytics/finance" element={<FinanceAnalytics />} />
            <Route path="analytics/behaviour" element={<BehaviourAnalytics />} />
            <Route path="analytics/sms" element={<SmsAnalytics />} />
            <Route path="analytics/intelligence" element={<IntelligenceAnalytics />} />
            {/* Content */}
            <Route path="banners" element={<AdminBanners />} />
            <Route path="banners/new" element={<AdminBannersNew />} />
            <Route path="banners/:id/edit" element={<AdminBannersEdit />} />
            <Route path="site-settings" element={<AdminSiteSettings />} />
            <Route path="cms-pages" element={<AdminCmsPages />} />
            <Route path="cms-pages/new" element={<AdminCmsPagesNew />} />
            <Route path="cms-pages/:id/edit" element={<AdminCmsPagesEdit />} />
            <Route path="push-notifications" element={<AdminPushNotifications />} />
            <Route path="push-notifications/new" element={<AdminPushNotificationsNew />} />
            <Route path="push-notifications/:id/edit" element={<AdminPushNotificationsEdit />} />
            <Route path="push-notifications/:id" element={<AdminPushNotificationView />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/account-blocked" element={<AccountBlocked />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
