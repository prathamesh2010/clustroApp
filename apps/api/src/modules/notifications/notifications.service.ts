import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NotificationDto, NotificationType } from '@clustro/shared';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string): Promise<NotificationDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      clusterId: n.clusterId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      linkUrl: n.linkUrl,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
