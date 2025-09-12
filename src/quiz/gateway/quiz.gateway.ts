// src/quiz/quiz.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Logger,
  ForbiddenException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSessionEntity } from '../entites/quizsession.entity';
import { QuizEntity } from '../entites/quiz.entity';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt.auth.guard';

@WebSocketGateway({
  cors: { origin: '*' }, // tighten in prod
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(QuizGateway.name);

  constructor(
    @InjectRepository(QuizSessionEntity)
    private readonly sessionRepo: Repository<QuizSessionEntity>,

    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Socket connected: ${client.id}`);
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // Student or teacher joins by passing the joinCode and the JWT token in handshake.auth.token (or Authorization header).
  // Guard will run and attach user info on the socket via Passport strategy (client['user'])
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinByCode')
  async handleJoinByCode(
    @MessageBody() payload: { joinCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user) throw new UnauthorizedException();

    const joinCode = payload.joinCode;
    if (!joinCode) throw new ForbiddenException('joinCode required');

    const session = await this.sessionRepo.findOne({
      where: { joinCode },
      relations: ['allowedStudents', 'teacher', 'quiz', 'quiz.questions'],
    });

    if (!session) throw new ForbiddenException('Session not found');

    // Student role: check allowedStudents if list exists
    if (user.role === 'student') {
      if (session.allowedStudents && session.allowedStudents.length > 0) {
        const allowed = session.allowedStudents.some((s) => s.id === user.id);
        if (!allowed)
          throw new ForbiddenException('You are not allowed to join this quiz');
      }
      // join student room
      const studentRoom = `session-${session.id}-students`;
      client.join(studentRoom);

      // send quiz payload but hide correctAnswerIndex
      const quiz = session.quiz;
      const questionsSafe = (quiz.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      }));

      client.emit('joined', {
        role: 'student',
        sessionId: session.id,
        joinCode: session.joinCode,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          timerSeconds: quiz.timerSeconds,
          questions: questionsSafe,
        },
      });

      this.logger.log(`Student ${user.id} joined session ${session.id}`);
      return;
    }

    // Teacher role: only the owner can join teacher room
    if (user.role === 'teacher') {
      if (session.teacher?.id !== user.id) {
        throw new ForbiddenException(
          'You are not the owner of this quiz session',
        );
      }
      const teacherRoom = `session-${session.id}-teacher`;
      client.join(teacherRoom);

      // prepare teacher view: include correct answers and maybe aggregated stats (optionally)
      const quiz = session.quiz;
      const questionsTeacherView = (quiz.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
      }));

      client.emit('joined', {
        role: 'teacher',
        sessionId: session.id,
        joinCode: session.joinCode,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          timerSeconds: quiz.timerSeconds,
          questions: questionsTeacherView,
        },
      });

      this.logger.log(`Teacher ${user.id} joined session ${session.id}`);
      return;
    }

    throw new ForbiddenException('Unsupported role');
  }

  // Emit only to teacher room (students don't receive this)
  emitAnswerToTeacher(sessionId: number, payload: any) {
    const room = `session-${sessionId}-teacher`;
    this.server.to(room).emit('answerSubmitted', payload);
  }

  // Optionally emit session state change to students and teacher
  emitSessionStarted(sessionId: number) {
    this.server
      .to(`session-${sessionId}-students`)
      .emit('sessionStarted', { sessionId });
    this.server
      .to(`session-${sessionId}-teacher`)
      .emit('sessionStarted', { sessionId });
  }

  emitSessionEnded(sessionId: number) {
    this.server
      .to(`session-${sessionId}-students`)
      .emit('sessionEnded', { sessionId });
    this.server
      .to(`session-${sessionId}-teacher`)
      .emit('sessionEnded', { sessionId });
  }
}
