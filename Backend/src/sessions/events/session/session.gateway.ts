import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable, UseGuards } from '@nestjs/common';
import { OnGatewayDisconnect } from '@nestjs/websockets';
import { WsJwtGuard } from '../../../auth/guards/ws-jwt/ws-jwt.guard';
import { SessionsService } from '../../sessions.service';

@WebSocketGateway({
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
    credentials: true,
  },
})
@Injectable()
export class SessionGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private clientSessions = new Map<string, string>();

  constructor(
    @InjectQueue('answer-ingestion')
    private readonly answerIngestionQueue: Queue,
    private readonly sessionsService: SessionsService,
  ) {}

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const result = await this.sessionsService.processJoinSession(
        data.sessionId,
        client.user?.userId,
      );

      if (result.error || !result.data) {
        return { error: result.error || 'Session not found' };
      }

      const {
        sessionId,
        status,
        scheduledStart,
        isCreator,
        initialStats,
        quizPayload,
        answeredQuestionIds,
      } = result.data;
      const roomName = `session_${sessionId}`;

      client.join(roomName);
      console.log(`[Socket] Client ${client.id} joined room: ${roomName}`);
      this.clientSessions.set(client.id, sessionId);
      this.broadcastParticipantCount(sessionId);

      if (isCreator) {
        const teacherRoom = `session_${sessionId}_teacher`;
        client.join(teacherRoom);
        console.log(
          `[Socket] Teacher ${client.id} joined room: ${teacherRoom}`,
        );

        if (initialStats && initialStats.length > 0) {
          client.emit('initial_stats', { stats: initialStats });
        }
      }

      if (quizPayload) {
        client.emit('quiz_started', quizPayload);
      }

      return {
        success: true,
        data: {
          sessionId,
          status,
          scheduledStart,
          isCreator,
          initialStats,
          answeredQuestionIds,
        },
      };
    } catch (error) {
      console.error(
        `[Socket] Error checking active session state for ${data.sessionId}:`,
        error,
      );
      return { error: 'Internal server error' };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody()
    data: {
      sessionId: string;
      questionId: string;
      response: string;
      timeTakenSecs: number;
    },
  ) {
    const actualUserId = client.user?.userId;

    if (!actualUserId) {
      return { error: 'Unauthorized' };
    }

    const teacherRoom = `session_${data.sessionId}_teacher`;
    if (client.rooms.has(teacherRoom)) {
      return { error: 'Creators cannot submit answers' };
    }

    // 1. Instantly push answer to BullMQ queue for async processing
    await this.answerIngestionQueue.add(
      'submit-answer',
      {
        sessionId: data.sessionId,
        questionId: data.questionId,
        userId: actualUserId,
        response: data.response,
        timeTakenSecs: data.timeTakenSecs,
      },
      {
        jobId: `answer-${data.sessionId}-${data.questionId}-${actualUserId}`,
      },
    );



    // 3. Return immediate acknowledgement to client
    return { success: true, message: 'Answer received' };
  }

  broadcastToSession(sessionId: string, event: string, data: any) {
    const roomName = `session_${sessionId}`;
    this.server.to(roomName).emit(event, data);
    console.log(`[Socket] Broadcasted event ${event} to room ${roomName}`);
  }

  private async broadcastParticipantCount(sessionId: string) {
    const roomName = `session_${sessionId}`;
    const sockets = await this.server.in(roomName).fetchSockets();
    this.broadcastToSession(sessionId, 'participant_count_updated', {
      count: sockets.length,
    });
  }

  async handleDisconnect(client: Socket) {
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      this.clientSessions.delete(client.id);
      this.broadcastParticipantCount(sessionId);
    }
  }
}
