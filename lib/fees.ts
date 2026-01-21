/**
 * Fee Calculations for padoq
 *
 * Business Rules:
 * - Guest fee: 9.5% of base price (NO CAP)
 * - Host fee: 2.5% of base price (NO CAP)
 * - VAT (20%) is applied ONLY to service fees (guest fee + host fee)
 * - All amounts stored in pennies to avoid float precision issues
 *
 * AUTHORITATIVE SOURCE: This file is the single source of truth for all fee calculations.
 * Do not duplicate or override these rates elsewhere.
 */

export interface PriceBreakdown {
  basePricePennies: number;
  guestFeePennies: number;
  guestFeeVatPennies: number;
  hostFeePennies: number;
  hostFeeVatPennies: number;
  totalChargePennies: number;
  hostPayoutPennies: number;
}

/**
 * Calculate complete price breakdown for a booking
 * @param basePricePennies - Base price (nightly rate * nights) in pennies
 * @returns Complete breakdown of all fees and totals
 */
export function calculatePriceBreakdown(
  basePricePennies: number
): PriceBreakdown {
  // Guest fee: 9.5% (no cap)
  const guestFeePennies = Math.round(0.095 * basePricePennies);

  // VAT on guest fee: 20%
  const guestFeeVatPennies = Math.round(0.2 * guestFeePennies);

  // Host fee: 2.5% of base
  const hostFeePennies = Math.round(0.025 * basePricePennies);

  // VAT on host fee: 20%
  const hostFeeVatPennies = Math.round(0.2 * hostFeePennies);

  // Total charge to guest: base + guest fee + VAT on guest fee
  const totalChargePennies =
    basePricePennies + guestFeePennies + guestFeeVatPennies;

  // Host payout: base - host fee - VAT on host fee
  const hostPayoutPennies =
    basePricePennies - hostFeePennies - hostFeeVatPennies;

  return {
    basePricePennies,
    guestFeePennies,
    guestFeeVatPennies,
    hostFeePennies,
    hostFeeVatPennies,
    totalChargePennies,
    hostPayoutPennies,
  };
}

/**
 * Format pennies to GBP string
 * @param pennies - Amount in pennies
 * @returns Formatted string like "£123.45"
 */
export function formatGBP(pennies: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pennies / 100);
}

/**
 * Convert GBP pounds to pennies
 * @param pounds - Amount in pounds
 * @returns Amount in pennies
 */
export function poundsToPennies(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Convert pennies to GBP pounds
 * @param pennies - Amount in pennies
 * @returns Amount in pounds
 */
export function penniesToPounds(pennies: number): number {
  return pennies / 100;
}



