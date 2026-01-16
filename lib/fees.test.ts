import { describe, it, expect } from "@jest/globals";
import { calculatePriceBreakdown, formatGBP, poundsToPennies } from "./fees";

describe("Fee Calculations", () => {
  describe("calculatePriceBreakdown", () => {
    it("calculates fees correctly for typical booking", () => {
      // £200 base price
      const breakdown = calculatePriceBreakdown(20000);

      // Guest fee: 9.5% = £19 = 1900 pennies
      expect(breakdown.guestFeePennies).toBe(1900);

      // Guest fee VAT: 20% of £19 = £3.80 = 380 pennies
      expect(breakdown.guestFeeVatPennies).toBe(380);

      // Host fee: 2.5% = £5 = 500 pennies
      expect(breakdown.hostFeePennies).toBe(500);

      // Host fee VAT: 20% of £5 = £1 = 100 pennies
      expect(breakdown.hostFeeVatPennies).toBe(100);

      // Total charge: £200 + £19 + £3.80 = £222.80 = 22280 pennies
      expect(breakdown.totalChargePennies).toBe(22280);

      // Host payout: £200 - £5 - £1 = £194 = 19400 pennies
      expect(breakdown.hostPayoutPennies).toBe(19400);
    });

    it("caps guest fee at £150", () => {
      // £2000 base price - guest fee would be £190 (9.5%) without cap
      // But £190 > £150, so it gets capped
      const breakdown = calculatePriceBreakdown(200000);

      // Guest fee capped at £150 = 15000 pennies
      expect(breakdown.guestFeePennies).toBe(15000);

      // Guest fee VAT: 20% of £150 = £30 = 3000 pennies
      expect(breakdown.guestFeeVatPennies).toBe(3000);

      // Total: £2000 + £150 + £30 = £2180 = 218000 pennies
      expect(breakdown.totalChargePennies).toBe(218000);
    });

    it("handles small amounts correctly", () => {
      // £10 base price
      const breakdown = calculatePriceBreakdown(1000);

      // Guest fee: 9.5% = £0.95 = 95 pennies
      expect(breakdown.guestFeePennies).toBe(95);

      // Guest fee VAT: 20% of 95 = 19 pennies
      expect(breakdown.guestFeeVatPennies).toBe(19);

      // Host fee: 2.5% = £0.25 = 25 pennies
      expect(breakdown.hostFeePennies).toBe(25);

      // Host fee VAT: 20% of 25 = 5 pennies
      expect(breakdown.hostFeeVatPennies).toBe(5);

      // Total: £10 + £0.95 + £0.19 = £11.14 = 1114 pennies
      expect(breakdown.totalChargePennies).toBe(1114);

      // Host payout: £10 - £0.25 - £0.05 = £9.70 = 970 pennies
      expect(breakdown.hostPayoutPennies).toBe(970);
    });

    it("rounds correctly", () => {
      // £100.33 base price (10033 pennies)
      const breakdown = calculatePriceBreakdown(10033);

      // Guest fee: 9.5% = 953.135 → 953 pennies
      expect(breakdown.guestFeePennies).toBe(953);

      // Guest fee VAT: 20% of 953 = 190.6 → 191 pennies
      expect(breakdown.guestFeeVatPennies).toBe(191);

      // Host fee: 2.5% = 250.825 → 251 pennies
      expect(breakdown.hostFeePennies).toBe(251);

      // Host fee VAT: 20% of 251 = 50.2 → 50 pennies
      expect(breakdown.hostFeeVatPennies).toBe(50);
    });
  });

  describe("formatGBP", () => {
    it("formats pennies to GBP string", () => {
      expect(formatGBP(12345)).toBe("£123.45");
      expect(formatGBP(100)).toBe("£1.00");
      expect(formatGBP(99)).toBe("£0.99");
      expect(formatGBP(0)).toBe("£0.00");
    });
  });

  describe("poundsToPennies", () => {
    it("converts pounds to pennies", () => {
      expect(poundsToPennies(123.45)).toBe(12345);
      expect(poundsToPennies(1)).toBe(100);
      expect(poundsToPennies(0.99)).toBe(99);
    });

    it("rounds to nearest penny", () => {
      expect(poundsToPennies(1.234)).toBe(123);
      expect(poundsToPennies(1.235)).toBe(124);
    });
  });
});



