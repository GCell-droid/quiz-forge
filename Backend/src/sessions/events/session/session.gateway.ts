import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  UseGuards,
} from '@nestjs/common';
import { createApiError } from '../../../common/api-error';
import { WsJwtGuard } from '../../../auth/guards/ws-jwt/ws-jwt.guard';
import { SessionsService } from '../../sessions.service';
import { AnswerSubmissionService } from '../../answer-submission.service';
import { MetricsService } from '../../../metrics/metrics.service';
import {
  AnswerSubmittedEvent,
  QuizStartedEvent,
  SessionEvents,
} from '../../ports/session-events.port';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
@Injectable()
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect, SessionEvents
{
  @WebSocketServer()
  server!: Server;

  private clientSessions = new Map<string, string>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly answerSubmissionService: AnswerSubmissionService,
    @Optional() private readonly wsJwtGuard?: WsJwtGuard,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  handleConnection(client: Socket) {
    this.metrics?.websocketActiveConnections.inc();
    client.on('error', () => {
      this.metrics?.websocketErrorsTotal
        .labels('socket', 'connection_error')
        .inc();
    });

    // Authenticate at HTTP handshake connection time to avoid per-message crypto overhead
    if (this.wsJwtGuard) {
      this.wsJwtGuard.authenticateClient(client);
    }
  }

  private async recordWsMetric<T>(
    event: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.metrics?.websocketMessagesTotal.labels(event).inc();
    const start = process.hrtime();
    try {
      const result = await fn();
      return result;
    } catch (err: any) {
      const errorType =
        err instanceof HttpException
          ? `http_${err.getStatus()}`
          : err?.name || 'internal_error';
      this.metrics?.websocketErrorsTotal.labels(event, errorType).inc();
      throw err;
    } finally {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      this.metrics?.websocketMessageDuration.labels(event).observe(duration);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(@MessageBody() data?: { timestamp?: number }) {
    return this.recordWsMetric('ping', async () => {
      return {
        success: true,
        clientTimestamp: data?.timestamp,
        serverTimestamp: Date.now(),
      };
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody() data: { sessionId: string },
  ) {
    return this.recordWsMetric('joinSession', async () => {
      try {
        const result = await this.sessionsService.processJoinSession(
          data?.sessionId,
          client.user?.userId,
        );

        if (result.error || !result.data) {
          const message = result.error || 'Session not found';
          return this.socketError(
            message === 'Session not found'
              ? HttpStatus.NOT_FOUND
              : HttpStatus.BAD_REQUEST,
            message,
            'joinSession',
          );
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
        if (data?.sessionId && data.sessionId !== sessionId) {
          client.join(`session_${data.sessionId}`);
        }
        console.log(`[Socket] Client ${client.id} joined room: ${roomName}`);
        this.clientSessions.set(client.id, sessionId);
        this.broadcastParticipantCount(sessionId);

        if (isCreator) {
          const teacherRoom = `session_${sessionId}_teacher`;
          client.join(teacherRoom);
          if (data?.sessionId && data.sessionId !== sessionId) {
            client.join(`session_${data.sessionId}_teacher`);
          }
          console.log(
            `[Socket] Teacher ${client.id} joined room: ${teacherRoom}`,
          );

          if (initialStats && initialStats.length > 0) {
            client.emit('initial_stats', { stats: initialStats });
          }
        }

        if (quizPayload) {
          client.emit('quiz_started', quizPayload);
          if (!isCreator && quizPayload.questions?.[0]?.questionId) {
            (client as any).expectedQuestionId =
              quizPayload.questions[0].questionId;
          }
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
            quizPayload,
          },
        };
      } catch (error) {
        console.error(
          `[Socket] Error checking active session state for ${data?.sessionId}:`,
          error,
        );
        return this.socketError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'An unexpected error occurred',
          'joinSession',
        );
      }
    });
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
    return this.recordWsMetric('submitAnswer', async () => {
      const result = await this.submitAnswer(client, data, {
        returnNextQuestion: false,
      });
      return result.error
        ? this.socketError(
            result.statusCode ?? HttpStatus.BAD_REQUEST,
            result.error,
            'submitAnswer',
          )
        : { success: true, message: 'Answer queued' };
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('submitAnswerAndGetNext')
  async handleSubmitAnswerAndGetNext(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody()
    data: {
      sessionId: string;
      questionId: string;
      response: string;
      timeTakenSecs: number;
    },
  ) {
    return this.recordWsMetric('submitAnswerAndGetNext', async () => {
      const result = await this.submitAnswer(client, data, {
        returnNextQuestion: true,
      });
      return result.error
        ? this.socketError(
            result.statusCode ?? HttpStatus.BAD_REQUEST,
            result.error,
            'submitAnswerAndGetNext',
          )
        : {
            success: true,
            message: 'Answer queued',
            nextQuestion: result.nextQuestion,
          };
    });
  }

  private async submitAnswer(
    client: Socket & {
      user?: { userId: string; name?: string; email?: string };
    },
    data: {
      sessionId: string;
      questionId: string;
      response: string;
      timeTakenSecs: number;
    },
    options?: { returnNextQuestion?: boolean },
  ): Promise<{
    error?: string;
    statusCode?: number;
    nextQuestion?: unknown | null;
  }> {
    if (!client.user?.userId)
      return { error: 'Unauthorized', statusCode: HttpStatus.UNAUTHORIZED };
    if (!data?.sessionId || !client.rooms.has(`session_${data.sessionId}`)) {
      return {
        error: 'Join the session before submitting an answer',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
    try {
      const userName =
        client.user.name ||
        (client.user.email ? client.user.email.split('@')[0] : undefined);
      const result = await this.answerSubmissionService.submit(
        {
          ...data,
          userId: client.user.userId,
          userName,
        },
        {
          ...options,
          expectedQuestionId: (client as any).expectedQuestionId,
        },
      );

      if (result.nextQuestion && (result.nextQuestion as any).questionId) {
        (client as any).expectedQuestionId = (
          result.nextQuestion as any
        ).questionId;
      } else {
        (client as any).expectedQuestionId = undefined;
      }

      return result;
    } catch (error) {
      return {
        error:
          error instanceof HttpException
            ? error.message
            : 'Unable to submit answer',
        statusCode:
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('requestNextQuestion')
  async handleRequestNextQuestion(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody() data: { sessionId: string },
  ) {
    return this.recordWsMetric('requestNextQuestion', async () => {
      const actualUserId = client.user?.userId;
      if (!actualUserId)
        return this.socketError(
          HttpStatus.UNAUTHORIZED,
          'Unauthorized',
          'requestNextQuestion',
        );
      if (!data?.sessionId || !client.rooms.has(`session_${data.sessionId}`)) {
        return this.socketError(
          HttpStatus.BAD_REQUEST,
          'Join the session before requesting a question',
          'requestNextQuestion',
        );
      }

      const nextQuestion = await this.sessionsService.getNextQuestionForUser(
        data.sessionId,
        actualUserId,
      );

      if (nextQuestion && (nextQuestion as any).questionId) {
        (client as any).expectedQuestionId = (nextQuestion as any).questionId;
      } else {
        (client as any).expectedQuestionId = undefined;
      }

      return { success: true, nextQuestion };
    });
  }

  private socketError(statusCode: number, message: string, event: string) {
    const errorType =
      statusCode >= 500
        ? 'internal_error'
        : statusCode === HttpStatus.UNAUTHORIZED
          ? 'unauthorized'
          : statusCode === HttpStatus.NOT_FOUND
            ? 'not_found'
            : statusCode === HttpStatus.BAD_REQUEST
              ? 'bad_request'
              : `http_${statusCode}`;
    this.metrics?.websocketErrorsTotal.labels(event, errorType).inc();

    const safeMessage =
      statusCode >= 500 ? 'An unexpected error occurred' : message;
    return {
      success: false,
      ...createApiError(statusCode, safeMessage, `/socket.io/${event}`),
    };
  }

  broadcastToSession(sessionId: string, event: string, data: any) {
    const roomName = `session_${sessionId}`;
    this.server.to(roomName).emit(event, data);
    console.log(`[Socket] Broadcasted event ${event} to room ${roomName}`);
  }

  quizStarted(event: QuizStartedEvent): void {
    const room = `session_${event.sessionId}`;
    const teacherRoom = `${room}_teacher`;
    this.server
      .to(room)
      .except(teacherRoom)
      .emit('quiz_started', {
        ...event,
        questions: event.questions.slice(0, 1),
      });
    this.server.to(teacherRoom).emit('quiz_started', event);

    const firstQuestionId = event.questions?.[0]?.questionId;
    if (firstQuestionId) {
      const roomSockets = (this.server as any)?.sockets?.adapter?.rooms?.get?.(
        room,
      );
      if (roomSockets) {
        for (const socketId of roomSockets) {
          const s = (this.server as any)?.sockets?.sockets?.get?.(socketId);
          if (s) {
            s.expectedQuestionId = firstQuestionId;
          }
        }
      }
    }
  }

  answerSubmitted(sessionId: string, event: AnswerSubmittedEvent): void {
    this.server
      .to(`session_${sessionId}_teacher`)
      .emit('live_answer_submitted', event);
  }

  sessionEnded(sessionId: string): void {
    this.broadcastToSession(sessionId, 'session_ended', {
      message: 'Time is up! The session has concluded.',
    });
  }

  disconnectSession(sessionId: string): void {
    this.server.in(`session_${sessionId}`).disconnectSockets(true);
  }

  private async broadcastParticipantCount(sessionId: string) {
    const roomName = `session_${sessionId}`;
    const adapterRoom = (this.server as any)?.sockets?.adapter?.rooms?.get(
      roomName,
    );
    const count =
      typeof adapterRoom?.size === 'number'
        ? adapterRoom.size
        : (await this.server.in(roomName).fetchSockets()).length;

    this.broadcastToSession(sessionId, 'participant_count_updated', {
      count,
    });
  }

  async handleDisconnect(client: Socket) {
    this.metrics?.websocketActiveConnections.dec();
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      this.clientSessions.delete(client.id);
      this.broadcastParticipantCount(sessionId);
    }
  }
}
