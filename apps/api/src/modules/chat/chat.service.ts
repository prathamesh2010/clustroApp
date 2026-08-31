import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ChatMessageDto } from '@clustro/shared';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getClusterMessages(clusterId: string, limit: number = 100): Promise<ChatMessageDto[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { clusterId },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((m) => ({
      id: m.id,
      clusterId: m.clusterId,
      senderId: m.senderId,
      senderName: m.sender.name || m.sender.username,
      senderAvatarUrl: m.sender.avatarUrl,
      messageText: m.messageText,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async saveMessage(clusterId: string, senderId: string, text: string): Promise<ChatMessageDto> {
    const user = await this.prisma.user.findUnique({ where: { id: senderId } });
    if (!user) throw new NotFoundException('User not found');

    const msg = await this.prisma.chatMessage.create({
      data: {
        clusterId,
        senderId,
        messageText: text.trim(),
      },
      include: {
        sender: true,
      },
    });

    return {
      id: msg.id,
      clusterId: msg.clusterId,
      senderId: msg.senderId,
      senderName: user.name || user.username,
      senderAvatarUrl: user.avatarUrl,
      messageText: msg.messageText,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}
