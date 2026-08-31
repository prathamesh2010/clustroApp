import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import {
  ClusterRole,
  PaymentStatus,
  PaymentMethod,
  ActionType,
  SettlementSummaryDto,
  SettlementBalance,
  SettlementTransactionDto,
  PaymentRecordDto,
  toCents,
  fromCents,
} from '@clustro/shared';

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async getClusterSettlementSummary(clusterId: string): Promise<SettlementSummaryDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: {
        members: {
          include: {
            user: true,
            parentMember: true,
          },
        },
        expenses: {
          where: { deletedAt: null },
          include: { splits: true },
        },
        settlementPayments: {
          where: { status: PaymentStatus.SUCCESSFUL },
        },
      },
    });

    if (!cluster) throw new NotFoundException('Cluster not found');

    const members = cluster.members;
    const expenses = cluster.expenses;
    const payments = cluster.settlementPayments;

    // Helper to get effective ID (dependent rolls up to head)
    const getEffId = (memberId: string): string => {
      const m = members.find((x) => x.id === memberId);
      if (m && m.role === ClusterRole.INHERITED && m.parentMemberId) {
        return m.parentMemberId;
      }
      return memberId;
    };

    // Initialize balance map for effective members (non-inherited)
    const effMemberIds = members
      .filter((m) => m.role !== ClusterRole.INHERITED)
      .map((m) => m.id);

    const paidMap: Record<string, number> = {};
    const owedMap: Record<string, number> = {};
    const settledPaidMap: Record<string, number> = {};
    const settledReceivedMap: Record<string, number> = {};

    effMemberIds.forEach((id) => {
      paidMap[id] = 0;
      owedMap[id] = 0;
      settledPaidMap[id] = 0;
      settledReceivedMap[id] = 0;
    });

    let totalExpenseCents = 0;

    // 1. Process Expenses
    expenses.forEach((exp) => {
      const expCents = toCents(Number(exp.amount));
      totalExpenseCents += expCents;

      const payerEffId = getEffId(exp.paidByMemberId);
      if (paidMap[payerEffId] !== undefined) {
        paidMap[payerEffId] += expCents;
      } else {
        paidMap[payerEffId] = expCents;
      }

      exp.splits.forEach((s) => {
        const splitCents = toCents(Number(s.allocatedAmount));
        const splitEffId = getEffId(s.memberId);
        if (owedMap[splitEffId] !== undefined) {
          owedMap[splitEffId] += splitCents;
        } else {
          owedMap[splitEffId] = splitCents;
        }
      });
    });

    // 2. Process Settled Payments (Direct offsets)
    payments.forEach((p) => {
      const amtCents = toCents(Number(p.amount));
      const fromEffId = getEffId(p.fromMemberId);
      const toEffId = getEffId(p.toMemberId);

      if (settledPaidMap[fromEffId] !== undefined) settledPaidMap[fromEffId] += amtCents;
      if (settledReceivedMap[toEffId] !== undefined) settledReceivedMap[toEffId] += amtCents;
    });

    // 3. Build Balances
    const balances: SettlementBalance[] = effMemberIds.map((id) => {
      const m = members.find((x) => x.id === id)!;
      const dependents = members.filter((x) => x.parentMemberId === id);

      const paidCents = paidMap[id] || 0;
      const owedCents = owedMap[id] || 0;
      const sPaidCents = settledPaidMap[id] || 0;
      const sRecCents = settledReceivedMap[id] || 0;

      // Net = (Paid - Owed) + (SettledPaid - SettledReceived)
      // If you owe money and you paid via settled payment, your debt decreases.
      const netCents = (paidCents - owedCents) + (sPaidCents - sRecCents);

      return {
        memberId: id,
        displayName: m.displayName,
        role: m.role as ClusterRole,
        isHead: m.role === ClusterRole.HEAD || m.role === ClusterRole.OWNER || dependents.length > 0,
        paid: fromCents(paidCents),
        owed: fromCents(owedCents),
        net: fromCents(netCents),
        rollupCount: dependents.length,
        rollupNames: dependents.map((d) => d.displayName),
      };
    });

    // 4. Compute Min-Cash-Flow suggested transactions
    const transactions = this.computeMinCashFlow(balances);

    const isSettled = balances.every((b) => Math.abs(b.net) < 0.01);

    return {
      balances,
      transactions,
      totalExpense: fromCents(totalExpenseCents),
      isSettled,
    };
  }

  computeMinCashFlow(balances: SettlementBalance[]): SettlementTransactionDto[] {
    const debtors: { memberId: string; name: string; amtCents: number }[] = [];
    const creditors: { memberId: string; name: string; amtCents: number }[] = [];

    balances.forEach((b) => {
      const cents = toCents(b.net);
      if (cents < -50) { // owes more than 50 paise
        debtors.push({ memberId: b.memberId, name: b.displayName, amtCents: -cents });
      } else if (cents > 50) { // receives more than 50 paise
        creditors.push({ memberId: b.memberId, name: b.displayName, amtCents: cents });
      }
    });

    debtors.sort((a, b) => b.amtCents - a.amtCents);
    creditors.sort((a, b) => b.amtCents - a.amtCents);

    const transactions: SettlementTransactionDto[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const paymentCents = Math.min(debtor.amtCents, creditor.amtCents);

      transactions.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amount: fromCents(paymentCents),
      });

      debtor.amtCents -= paymentCents;
      creditor.amtCents -= paymentCents;

      if (debtor.amtCents < 50) dIdx++;
      if (creditor.amtCents < 50) cIdx++;
    }

    return transactions;
  }

  async recordPayment(
    clusterId: string,
    userId: string,
    data: {
      fromMemberId: string;
      toMemberId: string;
      amount: number;
      paymentMethod?: PaymentMethod;
      providerReference?: string | null;
      note?: string | null;
    },
  ): Promise<PaymentRecordDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { members: true },
    });
    if (!cluster) throw new NotFoundException('Cluster not found');

    const fromMember = cluster.members.find((m) => m.id === data.fromMemberId);
    const toMember = cluster.members.find((m) => m.id === data.toMemberId);

    if (!fromMember || !toMember) {
      throw new BadRequestException('Invalid payer or receiver member');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.settlementPayment.create({
        data: {
          clusterId,
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          amount: data.amount,
          currency: cluster.currency,
          status: PaymentStatus.SUCCESSFUL,
          paymentMethod: data.paymentMethod || PaymentMethod.UPI,
          providerReference: data.providerReference || null,
          note: data.note?.trim() || null,
          paidAt: new Date(),
          recordedByUserId: userId,
        },
        include: {
          fromMember: true,
          toMember: true,
        },
      });

      await tx.activityLog.create({
        data: {
          clusterId,
          actorId: userId,
          actionType: ActionType.SETTLEMENT_RECORDED,
          summaryText: `${fromMember.displayName} paid ₹${data.amount.toLocaleString('en-IN')} to ${toMember.displayName} (${data.paymentMethod || 'UPI'})`,
        },
      });

      return p;
    });

    return {
      id: payment.id,
      clusterId: payment.clusterId,
      fromMemberId: payment.fromMemberId,
      toMemberId: payment.toMemberId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status as PaymentStatus,
      paymentMethod: payment.paymentMethod as PaymentMethod,
      providerReference: payment.providerReference,
      note: payment.note,
      paidAt: payment.paidAt?.toISOString() || null,
      createdAt: payment.createdAt.toISOString(),
      fromMember: {
        id: fromMember.id,
        clusterId: fromMember.clusterId,
        displayName: fromMember.displayName,
        role: fromMember.role as ClusterRole,
        isPlaceholder: fromMember.isPlaceholder,
        isOnline: !!fromMember.userId,
        createdAt: fromMember.createdAt.toISOString(),
      },
      toMember: {
        id: toMember.id,
        clusterId: toMember.clusterId,
        displayName: toMember.displayName,
        role: toMember.role as ClusterRole,
        isPlaceholder: toMember.isPlaceholder,
        isOnline: !!toMember.userId,
        createdAt: toMember.createdAt.toISOString(),
      },
    };
  }

  async getPastPayments(clusterId: string): Promise<PaymentRecordDto[]> {
    const payments = await this.prisma.settlementPayment.findMany({
      where: { clusterId },
      include: {
        fromMember: true,
        toMember: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      clusterId: p.clusterId,
      fromMemberId: p.fromMemberId,
      toMemberId: p.toMemberId,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status as PaymentStatus,
      paymentMethod: p.paymentMethod as PaymentMethod,
      providerReference: p.providerReference,
      note: p.note,
      paidAt: p.paidAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
      fromMember: {
        id: p.fromMember.id,
        clusterId: p.fromMember.clusterId,
        displayName: p.fromMember.displayName,
        role: p.fromMember.role as ClusterRole,
        isPlaceholder: p.fromMember.isPlaceholder,
        isOnline: !!p.fromMember.userId,
        createdAt: p.fromMember.createdAt.toISOString(),
      },
      toMember: {
        id: p.toMember.id,
        clusterId: p.toMember.clusterId,
        displayName: p.toMember.displayName,
        role: p.toMember.role as ClusterRole,
        isPlaceholder: p.toMember.isPlaceholder,
        isOnline: !!p.toMember.userId,
        createdAt: p.toMember.createdAt.toISOString(),
      },
    }));
  }
}
