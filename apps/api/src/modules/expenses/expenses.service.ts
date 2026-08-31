import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  SplitType,
  ActivityCategory,
  ActionType,
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  toCents,
  fromCents,
  ExpenseDto,
  ClusterRole,
} from '@clustro/shared';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getClusterExpenses(
    clusterId: string,
    filters?: {
      category?: string;
      memberId?: string;
      activityId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ExpenseDto[]> {
    const where: any = {
      clusterId,
      deletedAt: null,
    };

    if (filters?.category) {
      where.category = filters.category as ActivityCategory;
    }
    if (filters?.activityId) {
      where.activityId = filters.activityId;
    }
    if (filters?.memberId) {
      where.OR = [
        { paidByMemberId: filters.memberId },
        { splits: { some: { memberId: filters.memberId } } },
      ];
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        paidByMember: {
          include: { user: true, parentMember: true },
        },
        splits: {
          include: {
            member: {
              include: { user: true, parentMember: true },
            },
          },
        },
        attachments: true,
        activity: true,
      },
      orderBy: { expenseDate: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return expenses.map((e) => this.mapExpenseToDto(e));
  }

  async getExpenseById(clusterId: string, expenseId: string): Promise<ExpenseDto> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, clusterId, deletedAt: null },
      include: {
        paidByMember: {
          include: { user: true, parentMember: true },
        },
        splits: {
          include: {
            member: {
              include: { user: true, parentMember: true },
            },
          },
        },
        attachments: true,
        activity: true,
      },
    });

    if (!expense) throw new NotFoundException('Expense not found');
    return this.mapExpenseToDto(expense);
  }

  async createExpense(
    clusterId: string,
    userId: string,
    data: {
      amount: number;
      currency?: string;
      description: string;
      category?: string;
      paidByMemberId: string;
      splitType?: SplitType;
      splitMemberIds?: string[];
      customSplits?: { memberId: string; amount?: number; percentage?: number; shares?: number }[];
      activityId?: string | null;
      expenseDate?: string;
      notes?: string | null;
      location?: string | null;
    },
    files?: Express.Multer.File[],
  ): Promise<ExpenseDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { members: true },
    });
    if (!cluster) throw new NotFoundException('Cluster not found');

    const totalAmount = data.amount;
    if (totalAmount <= 0) {
      throw new BadRequestException('Expense amount must be positive');
    }

    const payer = cluster.members.find((m) => m.id === data.paidByMemberId);
    if (!payer) {
      throw new BadRequestException('Payer is not a valid member of this cluster');
    }

    const splitType = data.splitType || SplitType.EQUAL;
    let splitAllocations: { memberId: string; allocatedAmount: number; percentageOrWeight?: number }[] = [];

    // Calculate splits based on SplitType
    if (splitType === SplitType.EQUAL) {
      const splittableMemberIds = (data.splitMemberIds && data.splitMemberIds.length > 0)
        ? data.splitMemberIds
        : cluster.members.filter((m) => m.role !== ClusterRole.INHERITED).map((m) => m.id);

      if (splittableMemberIds.length === 0) {
        throw new BadRequestException('Select at least one member to split with');
      }

      const shares = calculateEqualSplit(totalAmount, splittableMemberIds);
      splitAllocations = shares.map((s) => ({
        memberId: s.memberId,
        allocatedAmount: s.amount,
        percentageOrWeight: s.percentage,
      }));
    } else if (splitType === SplitType.CUSTOM) {
      if (!data.customSplits || data.customSplits.length === 0) {
        throw new BadRequestException('Custom split amounts are required');
      }
      let sumCents = 0;
      splitAllocations = data.customSplits.map((s) => {
        const amt = s.amount || 0;
        sumCents += toCents(amt);
        return {
          memberId: s.memberId,
          allocatedAmount: amt,
        };
      });

      if (sumCents !== toCents(totalAmount)) {
        throw new BadRequestException(
          `Custom split total (₹${fromCents(sumCents)}) does not equal expense total (₹${totalAmount})`,
        );
      }
    } else if (splitType === SplitType.PERCENTAGE) {
      if (!data.customSplits || data.customSplits.length === 0) {
        throw new BadRequestException('Percentage split values are required');
      }
      const shares = calculatePercentageSplit(
        totalAmount,
        data.customSplits.map((s) => ({ memberId: s.memberId, percentage: s.percentage || 0 })),
      );
      splitAllocations = shares.map((s) => ({
        memberId: s.memberId,
        allocatedAmount: s.amount,
        percentageOrWeight: s.percentage,
      }));
    } else if (splitType === SplitType.SHARES) {
      if (!data.customSplits || data.customSplits.length === 0) {
        throw new BadRequestException('Share counts are required');
      }
      const shares = calculateSharesSplit(
        totalAmount,
        data.customSplits.map((s) => ({ memberId: s.memberId, shares: s.shares || 1 })),
      );
      splitAllocations = shares.map((s) => ({
        memberId: s.memberId,
        allocatedAmount: s.amount,
        percentageOrWeight: s.weight,
      }));
    }

    // Process attachments
    const attachmentsToCreate = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const uploaded = await this.storageService.saveReceiptImage(file);
        attachmentsToCreate.push({
          storageKey: uploaded.storageKey,
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName,
          fileType: uploaded.fileType,
          fileSizeBytes: uploaded.fileSizeBytes,
        });
      }
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          clusterId,
          paidByMemberId: data.paidByMemberId,
          amount: totalAmount,
          currency: data.currency || cluster.currency,
          description: data.description.trim(),
          category: (data.category as any) || ActivityCategory.FOOD,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
          splitType: splitType as any,
          activityId: data.activityId || null,
          location: data.location?.trim() || null,
          notes: data.notes?.trim() || null,
          createdByUserId: userId,
          splits: {
            create: splitAllocations.map((s) => ({
              memberId: s.memberId,
              allocatedAmount: s.allocatedAmount,
              percentageOrWeight: s.percentageOrWeight,
            })),
          },
          attachments: {
            create: attachmentsToCreate,
          },
        },
        include: {
          paidByMember: { include: { user: true, parentMember: true } },
          splits: { include: { member: { include: { user: true, parentMember: true } } } },
          attachments: true,
          activity: true,
        },
      });

      let summary = `${payer.displayName} paid ₹${totalAmount.toLocaleString('en-IN')} for "${data.description.trim()}"`;
      if (payer.role === ClusterRole.INHERITED && payer.parentMemberId) {
        const parent = cluster.members.find((m) => m.id === payer.parentMemberId);
        summary += ` (rolled up under ${parent?.displayName || 'Head'})`;
      }

      await tx.activityLog.create({
        data: {
          clusterId,
          actorId: userId,
          actionType: ActionType.EXPENSE_CREATED,
          summaryText: summary,
        },
      });

      return created;
    });

    return this.mapExpenseToDto(expense);
  }

  async deleteExpense(clusterId: string, expenseId: string, userId: string): Promise<void> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, clusterId, deletedAt: null },
      include: { paidByMember: true },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          clusterId,
          actorId: userId,
          actionType: ActionType.EXPENSE_DELETED,
          summaryText: `Expense "${expense.description}" (₹${Number(expense.amount).toLocaleString('en-IN')}) was deleted`,
        },
      });
    });
  }

  private mapExpenseToDto(e: any): ExpenseDto {
    return {
      id: e.id,
      clusterId: e.clusterId,
      paidByMemberId: e.paidByMemberId,
      amount: Number(e.amount),
      currency: e.currency,
      description: e.description,
      category: e.category,
      expenseDate: e.expenseDate.toISOString().slice(0, 10),
      splitType: e.splitType as SplitType,
      activityId: e.activityId,
      location: e.location,
      notes: e.notes,
      createdByUserId: e.createdByUserId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      paidByMember: e.paidByMember
        ? {
            id: e.paidByMember.id,
            clusterId: e.paidByMember.clusterId,
            userId: e.paidByMember.userId,
            displayName: e.paidByMember.displayName,
            role: e.paidByMember.role as ClusterRole,
            parentMemberId: e.paidByMember.parentMemberId,
            isPlaceholder: e.paidByMember.isPlaceholder,
            isOnline: !!e.paidByMember.userId,
            createdAt: e.paidByMember.createdAt.toISOString(),
          }
        : undefined,
      splits: (e.splits || []).map((s: any) => ({
        id: s.id,
        expenseId: s.expenseId,
        memberId: s.memberId,
        allocatedAmount: Number(s.allocatedAmount),
        percentageOrWeight: s.percentageOrWeight ? Number(s.percentageOrWeight) : null,
        member: s.member
          ? {
              id: s.member.id,
              clusterId: s.member.clusterId,
              userId: s.member.userId,
              displayName: s.member.displayName,
              role: s.member.role as ClusterRole,
              parentMemberId: s.member.parentMemberId,
              isPlaceholder: s.member.isPlaceholder,
              isOnline: !!s.member.userId,
              createdAt: s.member.createdAt.toISOString(),
            }
          : undefined,
      })),
      attachments: (e.attachments || []).map((a: any) => ({
        id: a.id,
        expenseId: a.expenseId,
        storageKey: a.storageKey,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSizeBytes: a.fileSizeBytes,
      })),
      activity: e.activity
        ? {
            id: e.activity.id,
            title: e.activity.title,
            category: e.activity.category,
          }
        : null,
    };
  }
}
