import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AnswerSubmissionService } from './answer-submission.service';
import { SessionStatus } from './entities/quiz-session.entity/quiz-session.entity';

describe('AnswerSubmissionService', () => {
  const command = {
    sessionId: 'session-1',
    questionId: 'question-1',
    userId: 'student-1',
    response: 'A',
    timeTakenSecs: 3,
  };

  const sessionRepo = {
    findByIdWithCreator: jest.fn(),
  };
  const sessionsService = {
    getNextQuestionForUser: jest.fn(),
  };
  const redisService = {
    sadd: jest.fn(),
  };
  const answerQueue = {
    enqueue: jest.fn(),
  };

  const service = new AnswerSubmissionService(
    sessionRepo as never,
    sessionsService as never,
    redisService as never,
    answerQueue,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    sessionRepo.findByIdWithCreator.mockResolvedValue({
      status: SessionStatus.ACTIVE,
      createdBy: { uid: 'teacher-1' },
    });
    sessionsService.getNextQuestionForUser
      .mockResolvedValueOnce({ questionId: 'question-1' })
      .mockResolvedValueOnce({ questionId: 'question-2' });
  });

  it('queues a valid answer and returns the next question', async () => {
    await expect(service.submit(command)).resolves.toEqual({
      nextQuestion: { questionId: 'question-2' },
    });
    expect(answerQueue.enqueue).toHaveBeenCalledWith(command);
    expect(redisService.sadd).toHaveBeenCalledWith(
      'quiz:session:session-1:answered:student-1',
      'question-1',
    );
  });

  it('rejects answers after the session ends before queuing', async () => {
    sessionRepo.findByIdWithCreator.mockResolvedValue({
      status: SessionStatus.COMPLETED,
      createdBy: { uid: 'teacher-1' },
    });
    await expect(service.submit(command)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(answerQueue.enqueue).not.toHaveBeenCalled();
  });

  it('rejects the creator and out-of-order questions', async () => {
    await expect(
      service.submit({ ...command, userId: 'teacher-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(answerQueue.enqueue).not.toHaveBeenCalled();

    sessionsService.getNextQuestionForUser.mockReset().mockResolvedValue({
      questionId: 'question-2',
    });
    await expect(service.submit(command)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(answerQueue.enqueue).not.toHaveBeenCalled();
  });

  it('does not mark a question answered when queueing fails', async () => {
    answerQueue.enqueue.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(service.submit(command)).rejects.toThrow('queue unavailable');
    expect(redisService.sadd).not.toHaveBeenCalled();
  });
});
