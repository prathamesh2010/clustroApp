import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, PrismaService],
  exports: [ExportsService],
})
export class ExportsModule {}
