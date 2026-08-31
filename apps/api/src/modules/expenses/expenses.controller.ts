import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateExpenseSchema } from '@clustro/shared';

@Controller('clusters/:clusterId/expenses')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  async getExpenses(
    @Param('clusterId') clusterId: string,
    @Query('category') category?: string,
    @Query('memberId') memberId?: string,
    @Query('activityId') activityId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.expensesService.getClusterExpenses(clusterId, {
      category,
      memberId,
      activityId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':expenseId')
  async getExpenseById(
    @Param('clusterId') clusterId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.expensesService.getExpenseById(clusterId, expenseId);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('receipts', 5))
  async createExpense(
    @Param('clusterId') clusterId: string,
    @CurrentUser('id') userId: string,
    @Body() rawBody: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let body = rawBody;
    // Handle form-data JSON fields
    if (typeof body.amount === 'string') body.amount = parseFloat(body.amount);
    if (typeof body.splitMemberIds === 'string') {
      try { body.splitMemberIds = JSON.parse(body.splitMemberIds); } catch (e) {}
    }
    if (typeof body.customSplits === 'string') {
      try { body.customSplits = JSON.parse(body.customSplits); } catch (e) {}
    }

    const validated = CreateExpenseSchema.parse(body);
    return this.expensesService.createExpense(clusterId, userId, validated as any, files);
  }

  @Delete(':expenseId')
  async deleteExpense(
    @Param('clusterId') clusterId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.expensesService.deleteExpense(clusterId, expenseId, userId);
    return { success: true, message: 'Expense deleted' };
  }
}
