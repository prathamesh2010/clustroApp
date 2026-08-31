import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateClusterSchema, UpdateClusterSchema } from '@clustro/shared';

@Controller('clusters')
@UseGuards(JwtAuthGuard)
export class ClustersController {
  constructor(private readonly clustersService: ClustersService) {}

  @Get()
  async getUserClusters(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.clustersService.getUserClusters(userId, status);
  }

  @Post()
  async createCluster(
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const validated = CreateClusterSchema.parse(body);
    return this.clustersService.createCluster(userId, validated as any);
  }

  @Post('join')
  async joinByInvite(
    @CurrentUser('id') userId: string,
    @Body('inviteCode') inviteCode: string,
  ) {
    return this.clustersService.joinByInviteCode(inviteCode, userId);
  }

  @Get(':id')
  async getClusterById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clustersService.getClusterById(id, userId);
  }

  @Patch(':id')
  async updateCluster(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const validated = UpdateClusterSchema.parse(body);
    return this.clustersService.updateCluster(id, userId, validated as any);
  }
}
