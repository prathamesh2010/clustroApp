import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AddMemberSchema } from '@clustro/shared';

@Controller('clusters/:clusterId/members')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async getMembers(@Param('clusterId') clusterId: string) {
    return this.membersService.getClusterMembers(clusterId);
  }

  @Post()
  async addMember(
    @Param('clusterId') clusterId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const validated = AddMemberSchema.parse(body);
    return this.membersService.addMember(clusterId, userId, validated as any);
  }

  @Patch(':memberId')
  async updateRole(
    @Param('clusterId') clusterId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.membersService.updateMemberRole(clusterId, memberId, userId, body);
  }

  @Post(':memberId/claim')
  async claimMember(
    @Param('clusterId') clusterId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.membersService.claimOfflineMember(clusterId, memberId, userId);
  }
}
