import { SettlementService } from './settlement.service';
import { ClusterRole, calculateEqualSplit, calculatePercentageSplit, calculateSharesSplit } from '@clustro/shared';

describe('SettlementService & Financial Calculation Engine', () => {
  let service: SettlementService;

  beforeEach(() => {
    // Instantiate service without DB mock for algorithmic tests
    service = new SettlementService(null as any);
  });

  describe('calculateEqualSplit (Exact Decimal & Remainder Allocation)', () => {
    it('splits ₹100 equally among 3 members without losing paise', () => {
      const shares = calculateEqualSplit(100, ['m1', 'm2', 'm3']);
      expect(shares).toHaveLength(3);
      expect(shares[0].amount).toBe(33.34);
      expect(shares[1].amount).toBe(33.33);
      expect(shares[2].amount).toBe(33.33);

      const totalAllocated = shares.reduce((sum, s) => sum + s.amount, 0);
      expect(Number(totalAllocated.toFixed(2))).toBe(100.00);
    });

    it('splits ₹1000 among 6 members accurately', () => {
      const shares = calculateEqualSplit(1000, ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
      const totalAllocated = shares.reduce((sum, s) => sum + s.amount, 0);
      expect(Number(totalAllocated.toFixed(2))).toBe(1000.00);
      expect(shares[0].amount).toBe(166.67);
      expect(shares[1].amount).toBe(166.67);
      expect(shares[2].amount).toBe(166.67);
      expect(shares[3].amount).toBe(166.67);
      expect(shares[4].amount).toBe(166.66);
      expect(shares[5].amount).toBe(166.66);
    });
  });

  describe('calculatePercentageSplit & calculateSharesSplit', () => {
    it('accurately distributes percentage splits to match total', () => {
      const shares = calculatePercentageSplit(500, [
        { memberId: 'm1', percentage: 50 },
        { memberId: 'm2', percentage: 30 },
        { memberId: 'm3', percentage: 20 },
      ]);
      expect(shares[0].amount).toBe(250.00);
      expect(shares[1].amount).toBe(150.00);
      expect(shares[2].amount).toBe(100.00);
      expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(500.00);
    });

    it('accurately distributes weighted shares splits', () => {
      const shares = calculateSharesSplit(600, [
        { memberId: 'm1', shares: 1 },
        { memberId: 'm2', shares: 2 },
        { memberId: 'm3', shares: 3 },
      ]);
      expect(shares[0].amount).toBe(100.00);
      expect(shares[1].amount).toBe(200.00);
      expect(shares[2].amount).toBe(300.00);
      expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(600.00);
    });
  });

  describe('computeMinCashFlow (Settlement Transaction Minimization)', () => {
    it('simplifies a 3-person debt cycle into minimal transactions', () => {
      // Suppose A paid ₹300 for A, B, C (each owes ₹100)
      // Net: A = +200, B = -100, C = -100
      const balances = [
        { memberId: 'A', displayName: 'Alice', role: ClusterRole.OWNER, isHead: false, paid: 300, owed: 100, net: 200 },
        { memberId: 'B', displayName: 'Bob', role: ClusterRole.MEMBER, isHead: false, paid: 0, owed: 100, net: -100 },
        { memberId: 'C', displayName: 'Charlie', role: ClusterRole.MEMBER, isHead: false, paid: 0, owed: 100, net: -100 },
      ];

      const txs = service.computeMinCashFlow(balances);
      expect(txs).toHaveLength(2);
      expect(txs).toContainEqual({
        fromMemberId: 'B',
        fromName: 'Bob',
        toMemberId: 'A',
        toName: 'Alice',
        amount: 100,
      });
      expect(txs).toContainEqual({
        fromMemberId: 'C',
        fromName: 'Charlie',
        toMemberId: 'A',
        toName: 'Alice',
        amount: 100,
      });
    });

    it('guarantees Net Zero Sum across all balances', () => {
      const balances = [
        { memberId: '1', displayName: 'M1', role: ClusterRole.HEAD, isHead: true, paid: 5000, owed: 2000, net: 3000 },
        { memberId: '2', displayName: 'M2', role: ClusterRole.HEAD, isHead: true, paid: 1000, owed: 2500, net: -1500 },
        { memberId: '3', displayName: 'M3', role: ClusterRole.MEMBER, isHead: false, paid: 500, owed: 2000, net: -1500 },
      ];

      const netSum = balances.reduce((sum, b) => sum + b.net, 0);
      expect(netSum).toBe(0);

      const txs = service.computeMinCashFlow(balances);
      const totalTransferred = txs.reduce((sum, t) => sum + t.amount, 0);
      expect(totalTransferred).toBe(3000);
    });
  });
});
