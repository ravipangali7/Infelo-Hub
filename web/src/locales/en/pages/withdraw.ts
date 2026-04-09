export default {
  title: "Withdraw",
  processingNote: "Withdrawals are processed within 24-48 hours after approval.",
  disabledByAdmin: "Withdrawals are currently disabled by Administration.",
  kycRequired:
    "Verified identity (KYC) is required before you can withdraw.",
  completeVerification: "Complete verification",
  requestHistory: "Request history",
  noRequests: "No withdrawal requests yet",
  withdrawFund: "Withdraw Fund",
  dialogTitle: "Withdraw fund",
  dialogDescHasAccount:
    "Choose wallet, amount, and payout account. Withdrawals are reviewed before processing.",
  dialogDescNoAccountStep1:
    "Step 1: Add a payout account and wait for approval. Then enter an amount and submit your withdrawal.",
  dialogDescNoAccountStep2:
    "You cannot request a withdrawal until at least one account is approved.",
  selectWallet: "Select Wallet",
  earningWallet: "Earning Wallet",
  topupWallet: "Top-up Wallet",
  enterAmount: "Enter Amount",
  available: "Available: रु {{amount}}",
  payoutPendingHint:
    "After a payout account is approved, you can enter an amount and complete your withdrawal here.",
  payoutAccount: "Payout account",
  rejectedHint:
    "A previous payout account was not approved. Add a new one from payout accounts to continue.",
  pendingListIntro:
    "These accounts are waiting for admin approval. You can withdraw as soon as one is approved.",
  pendingApproval: "Pending approval",
  needAccountHint:
    "You need an approved payout account before you can withdraw. Add your bank or wallet details, then wait for approval. Use the button at the bottom to go to payout accounts.",
  addManagePayout: "Add or manage payout accounts",
  summary: "Summary",
  amount: "Amount",
  fee: "Fee",
  youWillReceive: "You'll receive",
  submitFailed: "Failed to submit withdrawal request.",
  submitting: "Submitting…",
  requestWithdrawal: "Request withdrawal",
  waitingApproval: "Waiting for payout account approval",
  waitingNote:
    "Withdrawal is unavailable until an account is approved. This is usually reviewed within 24–48 hours.",
  viewPayoutAccounts: "View payout accounts",
  addPayoutToContinue: "Add payout account to continue",
} as const;
