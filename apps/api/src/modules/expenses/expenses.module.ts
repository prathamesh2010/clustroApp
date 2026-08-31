import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaService } from '../../config/prisma.service';

@Module({
  imports: [StorageModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, PrismaService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
