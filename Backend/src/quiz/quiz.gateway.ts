// quiz.gateway.ts
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

import { QuizService } from './quiz.service';

// Simple guard to extract user from socket handshake
// You'll need to adapt this to your auth system
@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/quiz',
})
export class QuizGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track active participants per quiz
  private quizParticipants: Map<number, Set<number>> = new Map();

  // Track socket to user mapping
  private socketToUser: Map<string, number> = new Map();

  // Track user to socket mapping
  private userToSocket: Map<number, string> = new Map();

  constructor(private readonly quizService: QuizService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Extract user info from handshake auth
    const userId = client.handshake.auth?.userId;
    if (userId) {
      this.socketToUser.set(client.id, userId);
      this.userToSocket.set(userId, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    const userId = this.socketToUser.get(client.id);
    if (userId) {
      // Remove from all quiz rooms
      this.quizParticipants.forEach((participants, quizId) => {
        if (participants.has(userId)) {
          participants.delete(userId);
          // Notify room about participant leaving
          this.server.to(`quiz-${quizId}`).emit('participantLeft', {
            userId,
            activeCount: participants.size,
          });
        }
      });

      this.socketToUser.delete(client.id);
      this.userToSocket.delete(userId);
    }
  }

  @SubscribeMessage('joinQuiz')
  async handleJoinQuiz(
    @MessageBody() data: { quizId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { quizId, userId } = data;

    try {
      // Verify quiz exists and user can join
      const quiz = await this.quizService.getQuizForStudent(quizId, userId);

      // Join socket room
      client.join(`quiz-${quizId}`);

      // Track participant
      if (!this.quizParticipants.has(quizId)) {
        this.quizParticipants.set(quizId, new Set());
      }
      this.quizParticipants.get(quizId)?.add(userId);

      // Get current stats for this quiz
      const stats = await this.quizService.getQuizStats(quizId);

      // Notify others in the room
      this.server.to(`quiz-${quizId}`).emit('participantJoined', {
        userId,
        activeCount: this.quizParticipants.get(quizId)?.size,
      });

      // Send quiz data and current stats to the joining student
      return {
        success: true,
        quiz,
        stats,
        activeCount: this.quizParticipants?.get(quizId)?.size ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('leaveQuiz')
  handleLeaveQuiz(
    @MessageBody() data: { quizId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { quizId, userId } = data;

    client.leave(`quiz-${quizId}`);

    const participants = this.quizParticipants.get(quizId);
    if (participants) {
      participants.delete(userId);

      this.server.to(`quiz-${quizId}`).emit('participantLeft', {
        userId,
        activeCount: participants.size,
      });
    }

    return { success: true };
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @MessageBody()
    data: {
      quizId: number;
      questionId: number;
      optionId: number;
      userId: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { quizId, questionId, optionId, userId } = data;

    try {
      // Save the response
      const response = await this.quizService.submitResponse(
        userId,
        quizId,
        questionId,
        optionId,
      );

      // Get updated stats for this question
      const questionStats = await this.quizService.getQuestionStats(
        quizId,
        questionId,
      );

      // Emit real-time update to teacher and monitors
      this.server.to(`quiz-${quizId}`).emit('answerSubmitted', {
        userId,
        questionId,
        optionId,
        isCorrect: response.isCorrect,
        stats: questionStats,
        timestamp: response.answeredAt,
      });

      return {
        success: true,
        isCorrect: response.isCorrect,
        stats: questionStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('submitQuiz')
  async handleSubmitQuiz(
    @MessageBody() data: { quizId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Calculate final result
      const result = await this.quizService.submitQuiz(
        data.userId,
        data.quizId,
      );

      // Get updated overall stats
      const stats = await this.quizService.getQuizStats(data.quizId);

      // Notify room about quiz completion
      this.server.to(`quiz-${data.quizId}`).emit('quizSubmitted', {
        userId: data.userId,
        score: result.score,
        stats,
      });

      return {
        success: true,
        result,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Teacher-specific events
  @SubscribeMessage('startQuizMonitoring')
  async handleStartMonitoring(
    @MessageBody() data: { quizId: number; teacherId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { quizId, teacherId } = data;

    try {
      // Verify teacher owns this quiz
      await this.quizService.verifyQuizOwnership(quizId, teacherId);

      // Join monitoring room
      client.join(`quiz-${quizId}`);
      client.join(`quiz-${quizId}-teacher`);

      // Get current stats
      const stats = await this.quizService.getQuizStats(quizId);
      const liveResponses = await this.quizService.getLiveResponses(quizId);

      return {
        success: true,
        stats,
        liveResponses,
        activeCount: this.quizParticipants.get(quizId)?.size || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Method to notify about quiz state changes (e.g., quiz started by teacher)
  notifyQuizStateChange(quizId: number, state: string, data?: any) {
    this.server.to(`quiz-${quizId}`).emit('quizStateChanged', {
      state,
      data,
      timestamp: new Date(),
    });
  }
}
