import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ClusterRole, ActionType, ClusterMemberDto } from '@clustro/shared';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getClusterMembers(clusterId: string): Promise<ClusterMemberDto[]> {
    const members = await this.prisma.clusterMember.findMany({
      where: { clusterId },
      include: {
        user: {
          select: { id: true, name: true, username: true, email: true, avatarUrl: true },
        },
        parentMember: {
          select: { id: true, displayName: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => this.mapMemberToDto(m));
  }

  async addMember(
    clusterId: string,
    actorUserId: string,
    data: {
      name: string;
      usernameOrEmail?: string | null;
      role?: ClusterRole;
      parentMemberId?: string | null;
    },
  ): Promise<ClusterMemberDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { members: true },
    });
    if (!cluster) throw new NotFoundException('Cluster not found');

    const actorMember = cluster.members.find((m) => m.userId === actorUserId);
    if (!actorMember || (actorMember.role !== ClusterRole.OWNER && actorMember.role !== ClusterRole.HEAD)) {
      throw new ForbiddenException('Only cluster owners or family heads can add members');
    }

    const role = data.role || ClusterRole.MEMBER;
    let parentMemberId = data.parentMemberId || null;

    if (role === ClusterRole.INHERITED) {
      if (!parentMemberId) {
        throw new BadRequestException('Inherited/dependent members must roll up to a Head or Owner');
      }
      const parent = cluster.members.find((m) => m.id === parentMemberId);
      if (!parent) {
        throw new BadRequestException('Selected parent head is not a member of this cluster');
      }
    } else {
      parentMemberId = null;
    }

    let linkedUser = null;
    let isPlaceholder = true;

    if (data.usernameOrEmail?.trim()) {
      const query = data.usernameOrEmail.trim().toLowerCase();
      linkedUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: query }, { username: query }],
        },
      });

      if (linkedUser) {
        const alreadyMember = cluster.members.find((m) => m.userId === linkedUser.id);
        if (alreadyMember) {
          throw new ConflictException('User is already a member of this cluster');
        }
        isPlaceholder = false;
      }
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.clusterMember.create({
        data: {
          clusterId,
          userId: linkedUser?.id || null,
          displayName: data.name.trim(),
          role: role as any,
          parentMemberId,
          isPlaceholder,
        },
        include: {
          user: true,
          parentMember: true,
        },
      });

      let summary = `${data.name.trim()} added as ${role}`;
      if (role === ClusterRole.INHERITED && parentMemberId) {
        const parent = cluster.members.find((m) => m.id === parentMemberId);
        summary = `${data.name.trim()} added as dependent under ${parent?.displayName || 'Head'}`;
      }

      await tx.activityLog.create({
        data: {
          clusterId,
          actorId: actorUserId,
          actionType: ActionType.MEMBER_ADDED,
          summaryText: summary,
        },
      });

      return newMember;
    });

    return this.mapMemberToDto(member);
  }

  async updateMemberRole(
    clusterId: string,
    memberId: string,
    actorUserId: string,
    data: { role?: ClusterRole; parentMemberId?: string | null },
  ): Promise<ClusterMemberDto> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: { members: true },
    });
    if (!cluster) throw new NotFoundException('Cluster not found');

    const actor = cluster.members.find((m) => m.userId === actorUserId);
    if (!actor || actor.role !== ClusterRole.OWNER) {
      throw new ForbiddenException('Only the cluster owner can modify member roles');
    }

    const target = cluster.members.find((m) => m.id === memberId);
    if (!target) throw new NotFoundException('Member not found in cluster');

    const updated = await this.prisma.clusterMember.update({
      where: { id: memberId },
      data: {
        ...(data.role && { role: data.role as any }),
        parentMemberId: data.role === ClusterRole.INHERITED ? data.parentMemberId : null,
      },
      include: {
        user: true,
        parentMember: true,
      },
    });

    return this.mapMemberToDto(updated);
  }

  async claimOfflineMember(clusterId: string, memberId: string, currentUserId: string): Promise<ClusterMemberDto> {
    const member = await this.prisma.clusterMember.findFirst({
      where: { id: memberId, clusterId, isPlaceholder: true, userId: null },
    });

    if (!member) {
      throw new NotFoundException('Offline placeholder member not found or already claimed');
    }

    const user = await this.prisma.user.findUnique({ where: { id: currentUserId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.clusterMember.update({
      where: { id: memberId },
      data: {
        userId: user.id,
        isPlaceholder: false,
      },
      include: { user: true, parentMember: true },
    });

    return this.mapMemberToDto(updated);
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
