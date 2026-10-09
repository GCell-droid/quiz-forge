import { AnswerIngestionProcessor } from './answer-ingestion.processor';
import { Job } from 'bullmq';
import { AnswerJob } from '../ports/answer-queue.port';

describe('AnswerIngestionProcessor', () => {
  let processor: AnswerIngestionProcessor;
  let responseRepo: { create: jest.Mock; save: jest.Mock };
  let sessionRepo: { findByIdWithQuiz: jest.Mock };
  let userRepo: { findById: jest.Mock };
  let redisService: { get: jest.Mock; hset: jest.Mock };
  let quizzesService: { getQuiz: jest.Mock };
  let answerScorer: { score: jest.Mock };
  let sessionEvents: { answerSubmitted: jest.Mock };

  beforeEach(() => {
    responseRepo = {
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockResolvedValue({}),
    };
    sessionRepo = { findByIdWithQuiz: jest.fn() };
    userRepo = { findById: jest.fn() };
    redisService = {
      get: jest.fn().mockResolvedValue(
        JSON.stringify({
          quizQuestions: [
            {
              question: {
                questionId: 'q-1',
                title: 'Question 1',
                correctAnswer: 'A',
                points: 10,
              },
            },
          ],
        }),
      ),
      hset: jest.fn().mockResolvedValue(1),
    };
    quizzesService = { getQuiz: jest.fn() };
    answerScorer = {
      score: jest.fn().mockReturnValue({ isCorrect: true, pointsScored: 10 }),
    };
    sessionEvents = { answerSubmitted: jest.fn() };

    processor = new AnswerIngestionProcessor(
      responseRepo as never,
      sessionRepo as never,
      userRepo as never,
      redisService as never,
      quizzesService as never,
      answerScorer as never,
      sessionEvents as never,
    );
  });

  it('uses job.data.userName and avoids querying the user repository', async () => {
    const job = {
      data: {
        sessionId: 'session-1',
        questionId: 'q-1',
        userId: 'user-1',
        userName: 'Alice',
        response: 'A',
        timeTakenSecs: 5,
      },
    } as Job<AnswerJob>;

    await processor.process(job);

    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(sessionEvents.answerSubmitted).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        userName: 'Alice',
        isCorrect: true,
      }),
    );
  });

  it('uses in-memory cache for quiz metadata on repeated calls', async () => {
    const job1 = {
      data: {
        sessionId: 'session-1',
        questionId: 'q-1',
        userId: 'user-1',
        userName: 'Alice',
        response: 'A',
        timeTakenSecs: 5,
      },
    } as Job<AnswerJob>;

    const job2 = {
      data: {
        sessionId: 'session-1',
        questionId: 'q-1',
        userId: 'user-2',
        userName: 'Bob',
        response: 'A',
        timeTakenSecs: 4,
      },
    } as Job<AnswerJob>;

    await processor.process(job1);
    expect(redisService.get).toHaveBeenCalledTimes(1);

    await processor.process(job2);
    // Should hit in-memory cache, so redisService.get is not called again!
    expect(redisService.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to userRepo.findById if userName is not provided in job data', async () => {
    userRepo.findById.mockResolvedValue({
      name: 'Charlie',
      email: 'c@test.com',
    });

    const job = {
      data: {
        sessionId: 'session-1',
        questionId: 'q-1',
        userId: 'user-3',
        response: 'A',
        timeTakenSecs: 5,
      },
    } as Job<AnswerJob>;

    await processor.process(job);

    expect(userRepo.findById).toHaveBeenCalledWith('user-3');
    expect(sessionEvents.answerSubmitted).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        userName: 'Charlie',
      }),
    );
  });
});
