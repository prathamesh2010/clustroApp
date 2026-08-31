import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterMemberGuard } from '../clusters/cluster-guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('clusters/:clusterId/chat')
@UseGuards(JwtAuthGuard, ClusterMemberGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Param('clusterId') clusterId: string) {
    return this.chatService.getClusterMessages(clusterId);
  }

  @Post('messages')
  async sendMessage(
    @Param('clusterId') clusterId: string,
    @CurrentUser('id') userId: string,
    @Body('text') text: string,
  ) {
    return this.chatService.saveMessage(clusterId, userId, text);
  }
}
