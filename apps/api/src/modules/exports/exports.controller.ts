import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';

@Controller('clusters/:clusterId/export')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('csv')
  async exportCsv(
    @Param('clusterId') clusterId: string,
    @Res() res: Response,
  ) {
    const { filename, csvData } = await this.exportsService.exportClusterCsv(clusterId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvData);
  }
}
