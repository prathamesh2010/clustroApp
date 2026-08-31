import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { UserDto, SubscriptionTier } from '@clustro/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async searchUsers(query: string, currentUserId: string): Promise<UserDto[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isActive: true },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 10,
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      defaultCurrency: u.defaultCurrency,
      subscriptionTier: u.subscriptionTier as SubscriptionTier,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string; avatarUrl?: string; defaultCurrency?: string }): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.defaultCurrency && { defaultCurrency: data.defaultCurrency }),
      },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      defaultCurrency: user.defaultCurrency,
      subscriptionTier: user.subscriptionTier as SubscriptionTier,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
