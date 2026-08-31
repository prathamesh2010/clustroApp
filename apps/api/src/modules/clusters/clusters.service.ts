import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ClusterType, ClusterStatus, ClusterRole, ActionType, ClusterDto, ClusterMemberDto } from '@clustro/shared';
import * as crypto from 'crypto';

@Injectable()
export class ClustersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserClusters(userId: string, status?: string): Promise<ClusterDto[]> {
    const memberships = await this.prisma.clusterMember.findMany({
      where: { userId },
      select: { clusterId: true, id: true },
    });

    const clusterIds = memberships.map((m) => m.clusterId);
    if (clusterIds.length === 0) return [];

    const whereClause: any = {
      id: { in: clusterIds },
      deletedAt: null,
    };

    if (status && status !== 'all' && status !== 'ledger') {
      whereClause.status = status as ClusterStatus;
    }

    const clusters = await this.prisma.cluster.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, avatarUrl: true },
            },
            parentMember: {
              select: { id: true, displayName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        expenses: {
          where: { deletedAt: null },
          include: { splits: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return clusters.map((c) => {
      const myMember = c.members.find((m) => m.userId === userId);
      const myEffId = (myMember?.role === 'inherited' && myMember.parentMemberId)
        ? myMember.parentMemberId
        : myMember?.id;

      let totalExpense = 0;
      let myPaid = 0;
      let myOwed = 0;

      c.expenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        totalExpense += amt;

        if (myMember) {
          const payer = c.members.find((m) => m.id === e.paidByMemberId);
          const payerEffId = (payer?.role === 'inherited' && payer.parentMemberId)
            ? payer.parentMemberId
            : payer?.id;

          if (payerEffId === myEffId) {
            myPaid += amt;
          }

          e.splits.forEach((s) => {
            const splitMember = c.members.find((m) => m.id === s.memberId);
            const splitEffId = (splitMember?.role === 'inherited' && splitMember.parentMemberId)
              ? splitMember.parentMemberId
              : splitMember?.id;

            if (splitEffId === myEffId) {
              myOwed += Number(s.allocatedAmount) || 0;
            }
          });
        }
      });

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type as ClusterType,
        status: c.status as ClusterStatus,
        currency: c.currency,
        location: c.location,
        startDate: c.startDate ? c.startDate.toISOString().slice(0, 10) : null,
        endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
        ownerId: c.ownerId,
        inviteCode: c.inviteCode,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        memberCount: c.members.length,
        totalExpense: Math.round(totalExpense * 100) / 100,
        myBalance: myMember
          ? {
              paid: Math.round(myPaid * 100) / 100,
              owed: Math.round(myOwed * 100) / 100,
              net: Math.round((myPaid - myOwed) * 100) / 100,
            }
          : undefined,
        members: c.members.map((m) => this.mapMemberToDto(m)),
      };
    });
  }

  async getClusterById(clusterId: string, userId: string): Promise<ClusterDto> {
    const cluster = await this.prisma.cluster.findFirst({
      where: { id: clusterId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true, avatarUrl: true },
            },
            parentMember: {
              select: { id: true, displayName: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        expenses: {
          where: { deletedAt: null },
          include: { splits: true },
        },
      },
    });

    if (!cluster) {
      throw new NotFoundException('Cluster not found');
    }

    const isMember = cluster.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You do not have permission to view this cluster');
    }

    const myMember = cluster.members.find((m) => m.userId === userId);
    const myEffId = (myMember?.role === 'inherited' && myMember.parentMemberId)
      ? myMember.parentMemberId
      : myMember?.id;

    let totalExpense = 0;
    let myPaid = 0;
    let myOwed = 0;

    cluster.expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      totalExpense += amt;

      if (myMember) {
        const payer = cluster.members.find((m) => m.id === e.paidByMemberId);
        const payerEffId = (payer?.role === 'inherited' && payer.parentMemberId)
          ? payer.parentMemberId
          : payer?.id;

        if (payerEffId === myEffId) {
          myPaid += amt;
        }

        e.splits.forEach((s) => {
          const splitMember = cluster.members.find((m) => m.id === s.memberId);
          const splitEffId = (splitMember?.role === 'inherited' && splitMember.parentMemberId)
            ? splitMember.parentMemberId
            : splitMember?.id;

          if (splitEffId === myEffId) {
            myOwed += Number(s.allocatedAmount) || 0;
          }
        });
      }
    });

    return {
      id: cluster.id,
      name: cluster.name,
      description: cluster.description,
      type: cluster.type as ClusterType,
      status: cluster.status as ClusterStatus,
      currency: cluster.currency,
      location: cluster.location,
      startDate: cluster.startDate ? cluster.startDate.toISOString().slice(0, 10) : null,
      endDate: cluster.endDate ? cluster.endDate.toISOString().slice(0, 10) : null,
      ownerId: cluster.ownerId,
      inviteCode: cluster.inviteCode,
      createdAt: cluster.createdAt.toISOString(),
      updatedAt: cluster.updatedAt.toISOString(),
      memberCount: cluster.members.length,
      totalExpense: Math.round(totalExpense * 100) / 100,
      myBalance: myMember
        ? {
            paid: Math.round(myPaid * 100) / 100,
            owed: Math.round(myOwed * 100) / 100,
            net: Math.round((myPaid - myOwed) * 100) / 100,
          }
        : undefined,
      members: cluster.members.map((m) => this.mapMemberToDto(m)),
    };
  }

  async createCluster(userId: string, data: {
    name: string;
    description?: string | null;
    type?: ClusterType;
    status?: ClusterStatus;
    currency?: string;
    startDate?: string | null;
    endDate?: string | null;
    location?: string | null;
  }): Promise<ClusterDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const cluster = await this.prisma.$transaction(async (tx) => {
      const newCluster = await tx.cluster.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          type: (data.type as any) || ClusterType.FAMILY,
          status: (data.status as any) || ClusterStatus.LIVE,
          currency: data.currency || 'INR',
          location: data.location?.trim() || null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          ownerId: userId,
          inviteCode,
        },
      });

      // Creator automatically becomes Owner member
      await tx.clusterMember.create({
        data: {
          clusterId: newCluster.id,
          userId: user.id,
          displayName: user.name,
          role: ClusterRole.OWNER,
        },
      });

      // Audit log
      await tx.activityLog.create({
        data: {
          clusterId: newCluster.id,
          actorId: userId,
          actionType: ActionType.CLUSTER_CREATED,
          summaryText: `Cluster "${newCluster.name}" created by ${user.name}`,
        },
      });

      return newCluster;
    });

    return this.getClusterById(cluster.id, userId);
  }

  async updateCluster(clusterId: string, userId: string, data: {
    name?: string;
    description?: string | null;
    type?: ClusterType;
    status?: ClusterStatus;
    startDate?: string | null;
    endDate?: string | null;
    location?: string | null;
  }): Promise<ClusterDto> {
    const cluster = await this.prisma.cluster.findUnique({ where: { id: clusterId } });
    if (!cluster) throw new NotFoundException('Cluster not found');

    if (cluster.ownerId !== userId) {
      throw new ForbiddenException('Only the cluster owner can modify cluster settings');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.cluster.update({
        where: { id: clusterId },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.type && { type: data.type as any }),
          ...(data.status && { status: data.status as any }),
          ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
          ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
          ...(data.location !== undefined && { location: data.location?.trim() || null }),
        },
      });

      let summary = 'Cluster details updated';
      if (data.status && data.status !== cluster.status) {
        summary = `Cluster status changed to ${data.status.toUpperCase()}`;
        await tx.activityLog.create({
          data: {
            clusterId,
            actorId: userId,
            actionType: ActionType.STATUS_CHANGED,
            summaryText: summary,
          },
        });
      } else if (data.startDate !== undefined || data.endDate !== undefined) {
        summary = 'Cluster dates updated';
        await tx.activityLog.create({
          data: {
            clusterId,
            actorId: userId,
            actionType: ActionType.DATES_UPDATED,
            summaryText: summary,
          },
        });
      }

      return res;
    });

    return this.getClusterById(updated.id, userId);
  }

  async joinByInviteCode(inviteCode: string, userId: string): Promise<ClusterDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      include: { members: true },
    });

    if (!cluster || cluster.deletedAt) {
      throw new NotFoundException('Invalid cluster invite code');
    }

    const existingMember = cluster.members.find((m) => m.userId === userId);
    if (existingMember) {
      return this.getClusterById(cluster.id, userId);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.clusterMember.create({
        data: {
          clusterId: cluster.id,
          userId: user.id,
          displayName: user.name,
          role: ClusterRole.MEMBER,
        },
      });

      await tx.activityLog.create({
        data: {
          clusterId: cluster.id,
          actorId: userId,
          actionType: ActionType.MEMBER_ADDED,
          summaryText: `${user.name} joined via invite code`,
        },
      });
    });

    return this.getClusterById(cluster.id, userId);
  }

  private mapMemberToDto(m: any): ClusterMemberDto {
    return {
      id: m.id,
      clusterId: m.clusterId,
      userId: m.userId,
      displayName: m.displayName,
      email: m.email,
      phone: m.phone,
      role: m.role as ClusterRole,
      parentMemberId: m.parentMemberId,
      isPlaceholder: m.isPlaceholder,
      isOnline: !!m.userId,
      avatarUrl: m.avatarUrl || m.user?.avatarUrl || null,
      createdAt: m.createdAt.toISOString(),
      user: m.user
        ? {
            id: m.user.id,
            name: m.user.name,
            username: m.user.username,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          }
        : null,
      parentMember: m.parentMember
        ? {
            id: m.parentMember.id,
            displayName: m.parentMember.displayName,
            role: m.parentMember.role as ClusterRole,
          }
        : null,
    };
  }
}
