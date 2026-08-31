import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RecordPaymentSchema } from '@clustro/shared';

@Controller('clusters/:clusterId/settlements')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get('summary')
  async getSummary(@Param('clusterId') clusterId: string) {
    return this.settlementService.getClusterSettlementSummary(clusterId);
  }

  @Get('payments')
  async getPayments(@Param('clusterId') clusterId: string) {
    return this.settlementService.getPastPayments(clusterId);
  }

  @Post('payments')
  async recordPayment(
    @Param('clusterId') clusterId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const validated = RecordPaymentSchema.parse(body);
    return this.settlementService.recordPayment(clusterId, userId, validated as any);
  }
}
