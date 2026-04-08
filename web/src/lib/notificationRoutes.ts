/**
 * Map FCM / transactional push `data` to a client or admin SPA path.
 * Keep in sync with app/lib/services/hub_push_navigation.dart (Flutter WebView).
 */
export function notificationDataToPath(data: Record<string, string | undefined>): string | null {
  const kind = (data.kind ?? "").trim();
  if (!kind) return "/notifications";

  const orderId = data.order_id?.trim();
  const submissionId = data.submission_id?.trim();
  const campaignId = data.campaign_id?.trim();

  // User — payment / wallet
  if (/^USER_0[1-6]$/.test(kind)) {
    return "/wallet";
  }
  if (kind === "USER_07" || kind === "USER_26" || kind === "USER_29") {
    return "/transactions";
  }

  // User — KYC
  if (/^USER_(08|09|10)$/.test(kind)) {
    return "/kyc";
  }

  // User — payout
  if (/^USER_(11|12|13)$/.test(kind)) {
    return "/payout-accounts";
  }

  // User — orders / payment
  if (/^USER_(14|15|16|17|21|22)$/.test(kind)) {
    return orderId ? `/orders/${orderId}` : "/orders";
  }

  // User — campaigns / submissions
  if (kind === "USER_19") {
    if (submissionId) return `/submission/${submissionId}`;
    if (campaignId) return `/campaign/${campaignId}`;
    return "/campaigns";
  }
  if (/^USER_(18|20|27)$/.test(kind)) {
    if (submissionId) return `/submission/${submissionId}`;
    if (campaignId) return `/campaign/${campaignId}`;
    return "/campaigns";
  }

  // User — account / package
  if (/^USER_(23|24|25)$/.test(kind)) {
    return "/profile";
  }

  // User — wishlist stock (if used later)
  if (kind === "USER_28") {
    return "/wishlist";
  }

  // Admin
  if (kind === "ADMIN_A1") return "/system/deposits";
  if (kind === "ADMIN_A2") return "/system/withdrawals";
  if (kind === "ADMIN_A3") return "/system/kyc";
  if (kind === "ADMIN_A4") return "/system/payout-accounts";
  if (kind === "ADMIN_A5" || kind === "ADMIN_A10" || kind === "ADMIN_A11") {
    return orderId ? `/system/sales/${orderId}` : "/system/sales";
  }
  if (kind === "ADMIN_A6") return "/system/submissions";
  if (kind === "ADMIN_A7") return "/system/products";
  if (kind === "ADMIN_A8") return "/system";
  if (kind === "ADMIN_A9") return "/system/deposits";

  // Marketing / manual push (type push_notification) — inbox only
  if (data.type === "push_notification" && data.push_id) {
    return "/notifications";
  }

  return "/notifications";
}

/** Build lookup object from inbox row (kind + payload JSON). */
export function notificationRowToPath(row: {
  kind?: string | null;
  payload?: Record<string, unknown> | null;
}): string {
  const payload = row.payload ?? {};
  const flat: Record<string, string | undefined> = {
    kind: row.kind ?? undefined,
  };
  for (const [k, v] of Object.entries(payload)) {
    if (v != null && typeof v !== "object") {
      flat[k] = String(v);
    }
  }
  return notificationDataToPath(flat);
}
