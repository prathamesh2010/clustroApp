import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [SettlementController],
  providers: [SettlementService, PrismaService],
  exports: [SettlementService],
})
export class SettlementModule {}
