/**
 * Precise financial calculation utilities for Clustro.app
 * Ensures zero floating-point error by using integer paise (cents) internally
 * and fair remainder distribution for division splits.
 */

export function toCents(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function roundMoney(amount: number): number {
  return fromCents(toCents(amount));
}

export function fmtMoney(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount) || 0;
  if (currency === 'INR') {
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export interface SplitShare {
  memberId: string;
  amount: number;
  percentage?: number;
  weight?: number;
}

/**
 * Calculates equal splits ensuring the sum of shares strictly equals the total expense amount.
 * Any remainder paise (cents) are distributed sequentially so no money is lost or gained.
 */
export function calculateEqualSplit(totalAmount: number, memberIds: string[]): SplitShare[] {
  if (memberIds.length === 0 || totalAmount <= 0) return [];
  
  const totalCents = toCents(totalAmount);
  const count = memberIds.length;
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents % count;

  return memberIds.map((memberId, idx) => {
    // Distribute 1 extra cent to the first `remainderCents` members
    const centsForMember = baseCents + (idx < remainderCents ? 1 : 0);
    return {
      memberId,
      amount: fromCents(centsForMember),
      percentage: Number(((centsForMember / totalCents) * 100).toFixed(2)),
    };
  });
}

/**
 * Calculates percentage splits ensuring total sum matches expense amount.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  splits: { memberId: string; percentage: number }[]
): SplitShare[] {
  if (splits.length === 0 || totalAmount <= 0) return [];
  const totalCents = toCents(totalAmount);
  
  let allocatedCents = 0;
  const result: SplitShare[] = [];

  for (let i = 0; i < splits.length; i++) {
    const isLast = i === splits.length - 1;
    if (isLast) {
      // Last participant gets the exact difference to guarantee sum === totalAmount
      const centsForMember = totalCents - allocatedCents;
      result.push({
        memberId: splits[i].memberId,
        amount: fromCents(centsForMember),
        percentage: splits[i].percentage,
      });
    } else {
      const centsForMember = Math.round((splits[i].percentage / 100) * totalCents);
      allocatedCents += centsForMember;
      result.push({
        memberId: splits[i].memberId,
        amount: fromCents(centsForMember),
        percentage: splits[i].percentage,
      });
    }
  }

  return result;
}

/**
 * Calculates share-based / weighted splits (e.g. 1 share vs 2 shares).
 */
export function calculateSharesSplit(
  totalAmount: number,
  splits: { memberId: string; shares: number }[]
): SplitShare[] {
  if (splits.length === 0 || totalAmount <= 0) return [];
  const totalShares = splits.reduce((sum, s) => sum + s.shares, 0);
  if (totalShares <= 0) return [];

  const totalCents = toCents(totalAmount);
  let allocatedCents = 0;
  const result: SplitShare[] = [];

  for (let i = 0; i < splits.length; i++) {
    const isLast = i === splits.length - 1;
    if (isLast) {
      const centsForMember = totalCents - allocatedCents;
      result.push({
        memberId: splits[i].memberId,
        amount: fromCents(centsForMember),
        weight: splits[i].shares,
      });
    } else {
      const centsForMember = Math.round((splits[i].shares / totalShares) * totalCents);
      allocatedCents += centsForMember;
      result.push({
        memberId: splits[i].memberId,
        amount: fromCents(centsForMember),
        weight: splits[i].shares,
      });
    }
  }

  return result;
}
