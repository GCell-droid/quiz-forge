import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AnswerJob, AnswerQueue } from '../ports/answer-queue.port';

@Injectable()
export class BullAnswerQueue implements AnswerQueue {
  constructor(@InjectQueue('answer-ingestion') private readonly queue: Queue) {}

  async enqueue(answer: AnswerJob): Promise<void> {
    await this.queue.add('submit-answer', answer, {
      jobId: `answer-${answer.sessionId}-${answer.questionId}-${answer.userId}`,
    });
  }
}
