import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateActivitySchema } from '@clustro/shared';

@Controller('clusters/:clusterId/activities')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async getActivities(@Param('clusterId') clusterId: string) {
    return this.activitiesService.getClusterActivities(clusterId);
  }

  @Post()
  async createActivity(
    @Param('clusterId') clusterId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const validated = CreateActivitySchema.parse(body);
    return this.activitiesService.createActivity(userId, {
      ...validated,
      clusterId,
    });
  }
}
