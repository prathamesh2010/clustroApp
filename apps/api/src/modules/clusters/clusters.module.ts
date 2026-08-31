import { Module } from '@nestjs/common';
import { ClustersService } from './clusters.service';
import { ClustersController } from './clusters.controller';
import { PrismaService } from '../../config/prisma.service';

@Module({
  controllers: [ClustersController],
  providers: [ClustersService, PrismaService],
  exports: [ClustersService],
})
export class ClustersModule {}
