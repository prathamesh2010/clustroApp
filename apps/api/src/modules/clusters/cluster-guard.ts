import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ClusterMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const clusterId = request.params.clusterId || request.params.id;

    if (!user || !clusterId) {
      throw new ForbiddenException('User or Cluster ID missing');
    }

    const member = await this.prisma.clusterMember.findFirst({
      where: {
        clusterId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this cluster');
    }

    // Attach cluster member record to request for controllers
    request.clusterMember = member;
    return true;
  }
}
