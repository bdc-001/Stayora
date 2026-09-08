/** Stayora checkout currency — Stripe INR (amounts in paise = ₹ × 100). */
export const CURRENCY_CODE = "INR" as const;
export const CURRENCY_LOCALE = "en-IN";

/** Format major-unit amount (rupees) for display. */
export function formatMoney(amountMajor: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amountMajor) ? amountMajor : 0);
}

/** Format minor-unit amount (paise) for trip quotes / PaymentIntents. */
export function formatMoneyMinor(amountMinor: number): string {
  return formatMoney((Number.isFinite(amountMinor) ? amountMinor : 0) / 100);
}
