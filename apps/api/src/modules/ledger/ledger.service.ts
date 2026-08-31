import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import {
  ClusterStatus,
  ClusterType,
  ClusterRole,
  PersonalDashboardSummaryDto,
  PersonalLedgerClusterSummary,
  fromCents,
  toCents,
} from '@clustro/shared';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonalDashboard(userId: string): Promise<PersonalDashboardSummaryDto> {
    const memberships = await this.prisma.clusterMember.findMany({
      where: { userId },
      include: {
        cluster: {
          include: {
            members: true,
            expenses: {
              where: { deletedAt: null },
              include: { splits: true },
              orderBy: { expenseDate: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalPersonalPaidCents = 0;
    let totalPersonalOwedCents = 0;
    let totalAcrossClustersCents = 0;

    let activeCount = 0;
    let pendingCount = 0;
    let endedCount = 0;

    const categoryMap: Record<string, number> = {};
    const clusterSummaries: PersonalLedgerClusterSummary[] = [];

    for (const m of memberships) {
      const cluster = m.cluster;
      if (cluster.deletedAt) continue;

      if (cluster.status === ClusterStatus.LIVE) activeCount++;
      else if (cluster.status === ClusterStatus.PENDING) pendingCount++;
      else if (cluster.status === ClusterStatus.ENDED) endedCount++;

      const myEffId = (m.role === ClusterRole.INHERITED && m.parentMemberId)
        ? m.parentMemberId
        : m.id;

      let clusterTotalCents = 0;
      let myClusterPaidCents = 0;
      let myClusterOwedCents = 0;
      const recentExpensesList: any[] = [];

      for (const exp of cluster.expenses) {
        const expCents = toCents(Number(exp.amount));
        clusterTotalCents += expCents;

        const payer = cluster.members.find((x) => x.id === exp.paidByMemberId);
        const payerEffId = (payer?.role === ClusterRole.INHERITED && payer.parentMemberId)
          ? payer.parentMemberId
          : payer?.id;

        const isPaidByMe = payerEffId === myEffId;
        if (isPaidByMe) {
          myClusterPaidCents += expCents;
        }

        let mySplitCents = 0;
        for (const s of exp.splits) {
          const splitMember = cluster.members.find((x) => x.id === s.memberId);
          const splitEffId = (splitMember?.role === ClusterRole.INHERITED && splitMember.parentMemberId)
            ? splitMember.parentMemberId
            : splitMember?.id;

          if (splitEffId === myEffId) {
            const splitAmtCents = toCents(Number(s.allocatedAmount));
            myClusterOwedCents += splitAmtCents;
            mySplitCents += splitAmtCents;

            // Add to category distribution
            const cat = exp.category || 'OTHER';
            categoryMap[cat] = (categoryMap[cat] || 0) + splitAmtCents;
          }
        }

        if (isPaidByMe || mySplitCents > 0) {
          if (recentExpensesList.length < 5) {
            recentExpensesList.push({
              id: exp.id,
              description: exp.description,
              amount: Number(exp.amount),
              myShare: fromCents(mySplitCents),
              createdAt: exp.createdAt.toISOString(),
            });
          }
        }
      }

      totalPersonalPaidCents += myClusterPaidCents;
      totalPersonalOwedCents += myClusterOwedCents;
      totalAcrossClustersCents += clusterTotalCents;

      clusterSummaries.push({
        clusterId: cluster.id,
        clusterName: cluster.name,
        clusterType: cluster.type as ClusterType,
        clusterStatus: cluster.status as ClusterStatus,
        startDate: cluster.startDate ? cluster.startDate.toISOString().slice(0, 10) : null,
        endDate: cluster.endDate ? cluster.endDate.toISOString().slice(0, 10) : null,
        currency: cluster.currency,
        totalClusterExpense: fromCents(clusterTotalCents),
        myPaid: fromCents(myClusterPaidCents),
        myOwed: fromCents(myClusterOwedCents),
        myNet: fromCents(myClusterPaidCents - myClusterOwedCents),
        myEntriesCount: recentExpensesList.length,
        recentExpenses: recentExpensesList,
      });
    }

    const totalCategoryCents = Object.values(categoryMap).reduce((s, v) => s + v, 0);
    const categoryBreakdown = Object.entries(categoryMap).map(([category, cents]) => ({
      category,
      amount: fromCents(cents),
      percentage: totalCategoryCents > 0 ? Number(((cents / totalCategoryCents) * 100).toFixed(1)) : 0,
    }));

    return {
      totalAcrossClusters: fromCents(totalAcrossClustersCents),
      personalPaid: fromCents(totalPersonalPaidCents),
      personalOwed: fromCents(totalPersonalOwedCents),
      personalNet: fromCents(totalPersonalPaidCents - totalPersonalOwedCents),
      activeClusterCount: activeCount,
      pendingClusterCount: pendingCount,
      endedClusterCount: endedCount,
      clusterSummaries,
      categoryBreakdown,
    };
  }

  async getClusterActivityLogs(clusterId: string) {
    const logs = await this.prisma.activityLog.findMany({
      where: { clusterId },
      include: {
        actor: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => ({
      id: l.id,
      clusterId: l.clusterId,
      actorId: l.actorId,
      actionType: l.actionType,
      summaryText: l.summaryText,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
      actor: l.actor,
    }));
  }
}
