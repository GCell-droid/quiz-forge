import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HttpException, HttpStatus, Injectable, UseGuards } from '@nestjs/common';
import { createApiError } from '../../../common/api-error';
import { OnGatewayDisconnect } from '@nestjs/websockets';
import { WsJwtGuard } from '../../../auth/guards/ws-jwt/ws-jwt.guard';
import { SessionsService } from '../../sessions.service';
import { AnswerSubmissionService } from '../../answer-submission.service';
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
export class SessionGateway implements OnGatewayDisconnect, SessionEvents {
  @WebSocketServer()
  server!: Server;

  private clientSessions = new Map<string, string>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly answerSubmissionService: AnswerSubmissionService,
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
        const message = result.error || 'Session not found';
        return this.socketError(
          message === 'Session not found' ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
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
      return this.socketError(HttpStatus.INTERNAL_SERVER_ERROR, 'An unexpected error occurred', 'joinSession');
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
    const result = await this.submitAnswer(client, data);
    return result.error
      ? this.socketError(result.statusCode ?? HttpStatus.BAD_REQUEST, result.error, 'submitAnswer')
      : { success: true, message: 'Answer queued' };
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
    const result = await this.submitAnswer(client, data);
    return result.error
      ? this.socketError(result.statusCode ?? HttpStatus.BAD_REQUEST, result.error, 'submitAnswerAndGetNext')
      : {
          success: true,
          message: 'Answer queued',
          nextQuestion: result.nextQuestion,
        };
  }

  private async submitAnswer(
    client: Socket & { user?: { userId: string } },
    data: {
      sessionId: string;
      questionId: string;
      response: string;
      timeTakenSecs: number;
    },
  ): Promise<{ error?: string; statusCode?: number; nextQuestion?: unknown | null }> {
    if (!client.user?.userId) return { error: 'Unauthorized', statusCode: HttpStatus.UNAUTHORIZED };
    if (!data?.sessionId || !client.rooms.has(`session_${data.sessionId}`)) {
      return { error: 'Join the session before submitting an answer', statusCode: HttpStatus.BAD_REQUEST };
    }
    try {
      return await this.answerSubmissionService.submit({
        ...data,
        userId: client.user.userId,
      });
    } catch (error) {
      return {
        error:
          error instanceof HttpException
            ? error.message
            : 'Unable to submit answer',
        statusCode: error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('requestNextQuestion')
  async handleRequestNextQuestion(
    @ConnectedSocket() client: Socket & { user?: any },
    @MessageBody() data: { sessionId: string },
  ) {
    const actualUserId = client.user?.userId;
    if (!actualUserId) return this.socketError(HttpStatus.UNAUTHORIZED, 'Unauthorized', 'requestNextQuestion');
    if (!data?.sessionId || !client.rooms.has(`session_${data.sessionId}`)) {
      return this.socketError(HttpStatus.BAD_REQUEST, 'Join the session before requesting a question', 'requestNextQuestion');
    }

    const nextQuestion = await this.sessionsService.getNextQuestionForUser(
      data.sessionId,
      actualUserId,
    );

    return { success: true, nextQuestion };
  }

  private socketError(statusCode: number, message: string, event: string) {
    const safeMessage = statusCode >= 500 ? 'An unexpected error occurred' : message;
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
