import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('ledger/dashboard')
  async getPersonalDashboard(@CurrentUser('id') userId: string) {
    return this.ledgerService.getPersonalDashboard(userId);
  }

  @Get('clusters/:clusterId/activity')
  @UseGuards(ClusterMemberGuard)
  async getClusterActivity(@Param('clusterId') clusterId: string) {
    return this.ledgerService.getClusterActivityLogs(clusterId);
  }
}
