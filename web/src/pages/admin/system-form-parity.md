# System Form Parity Matrix

This matrix documents the `/system` form parity baseline used for the full-pass update.

## Coverage Rules

- Every writable model/API field is rendered in create/edit form.
- Computed or operational metadata is shown as read-only context.
- All relation fields use searchable select UI (no raw numeric ID entry widgets).

## Entity Checks

- `UserForm`: added identity/profile fields, package/referrer searchable relations, and readonly wallet/timestamps.
- `VendorForm`: added searchable `user`, `logo`, and readonly payable/receivable metadata.
- `PayoutAccountForm`: added searchable `user`, plus `reject_reason`, `qr_image`, and timestamps.
- `DepositForm` and `WithdrawalForm`: added searchable `user` + `payout_account`, plus `paid_date_time`, `screenshot`, `reject_reason`, and metadata.
- `CategoryForm`: added searchable `parent`, `image`, and timestamps.
- `ProductForm`: switched to searchable `category` + `vendor`, added `image` and timestamps.
- `CampaignForm`: switched to searchable `product`, added `image` and timestamps.
- `PackageForm`: added readonly linked products visibility and timestamps.
- `PurchaseForm`: switched `vendor`, `user`, and line-item `product` to searchable selectors, added readonly totals/timestamps.
- `SaleForm`: switched `vendor`, `user`, `address`, and line-item `product` to searchable selectors, added readonly totals/timestamps.
- `PaidRecordForm`: switched `vendor`, `user`, `purchase` to searchable selectors, added timestamps.
- `ReceivedRecordForm`: switched `vendor`, `user`, `sales` to searchable selectors, added timestamps.
- `AddressAdminForm`: switched `user` and `city` to searchable selectors, added timestamps.
- `ShippingChargeForm`: switched `city` to searchable selector, added timestamps.
- `SystemWithdrawalForm`: added `reject_reason` and readonly status/timestamps.
