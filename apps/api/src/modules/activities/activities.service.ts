import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ActivityCategory, ActivityDto } from '@clustro/shared';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getClusterActivities(clusterId: string): Promise<ActivityDto[]> {
    const activities = await this.prisma.activity.findMany({
      where: { clusterId },
      include: {
        expenses: {
          where: { deletedAt: null },
        },
      },
      orderBy: [{ dayNumber: 'asc' }, { date: 'asc' }],
    });

    return activities.map((a) => {
      const totalExpense = a.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        id: a.id,
        clusterId: a.clusterId,
        userId: a.userId,
        title: a.title,
        description: a.description,
        category: a.category as ActivityCategory,
        date: a.date.toISOString().slice(0, 10),
        dayNumber: a.dayNumber,
        totalExpense: Math.round(totalExpense * 100) / 100,
        expenseCount: a.expenses.length,
        createdAt: a.createdAt.toISOString(),
      };
    });
  }

  async createActivity(
    userId: string,
    data: {
      clusterId?: string | null;
      title: string;
      description?: string | null;
      category?: ActivityCategory;
      date: string;
      dayNumber?: number | null;
    },
  ): Promise<ActivityDto> {
    const activity = await this.prisma.activity.create({
      data: {
        clusterId: data.clusterId || null,
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category: (data.category as any) || ActivityCategory.EVENT,
        date: new Date(data.date),
        dayNumber: data.dayNumber || null,
      },
    });

    return {
      id: activity.id,
      clusterId: activity.clusterId,
      userId: activity.userId,
      title: activity.title,
      description: activity.description,
      category: activity.category as ActivityCategory,
      date: activity.date.toISOString().slice(0, 10),
      dayNumber: activity.dayNumber,
      totalExpense: 0,
      expenseCount: 0,
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
