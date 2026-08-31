import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_cluster')
  handleJoinCluster(
    @ConnectedSocket() client: Socket,
    @MessageBody() clusterId: string,
  ) {
    client.join(`cluster:${clusterId}`);
    this.logger.log(`Socket ${client.id} joined cluster:${clusterId}`);
    return { status: 'joined', clusterId };
  }

  @SubscribeMessage('leave_cluster')
  handleLeaveCluster(
    @ConnectedSocket() client: Socket,
    @MessageBody() clusterId: string,
  ) {
    client.leave(`cluster:${clusterId}`);
    return { status: 'left', clusterId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { clusterId: string; senderId: string; text: string },
  ) {
    if (!payload.clusterId || !payload.senderId || !payload.text?.trim()) {
      return;
    }

    const savedMsg = await this.chatService.saveMessage(
      payload.clusterId,
      payload.senderId,
      payload.text,
    );

    // Broadcast to everyone in the cluster room
    this.server.to(`cluster:${payload.clusterId}`).emit('new_message', savedMsg);
    return savedMsg;
  }
}
