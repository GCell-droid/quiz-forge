import { DataSource, SelectQueryBuilder } from 'typeorm';
import User from '../../common/entity/user.entity';
import { BundleQuestion } from '../../quizzes/entities/bundle-question.entity/bundle-question.entity';
import { QuestionBundle } from '../../quizzes/entities/question-bundle.entity/question-bundle.entity';
import { Question } from '../../quizzes/entities/question.entity/question.entity';
import { QuizQuestion } from '../../quizzes/entities/quiz-question.entity/quiz-question.entity';
import { Quiz } from '../../quizzes/entities/quiz.entity/quiz.entity';
import { QuestionResponse } from '../entities/question-response.entity/question-response.entity';
import { QuizSession } from '../entities/quiz-session.entity/quiz-session.entity';
import { ResponseRepository } from './response.repository';

describe('ResponseRepository query shape', () => {
  let source: DataSource;
  let repository: ResponseRepository;
  let querySql: string;

  beforeAll(async () => {
    source = new DataSource({
      type: 'postgres',
      entities: [
        User,
        Quiz,
        QuizQuestion,
        Question,
        QuestionBundle,
        BundleQuestion,
        QuizSession,
        QuestionResponse,
      ],
    });
    await (
      source as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
    repository = new ResponseRepository(source.getRepository(QuestionResponse));
  });

  beforeEach(() => {
    jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawOne')
      .mockResolvedValue({ total: '0' });
    jest
      .spyOn(SelectQueryBuilder.prototype, 'getRawMany')
      .mockImplementation(function (this: SelectQueryBuilder<any>) {
        querySql = this.getSql();
        return Promise.resolve([]);
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads answered IDs using response foreign keys without joining questions or users', async () => {
    await repository.findQuestionIdsForUser('session-1', 'student-1');
    expect(querySql).toContain('"qr"."questionId"');
    expect(querySql).toContain('"qr"."sessionId"');
    expect(querySql).toContain('"qr"."userId"');
    expect(querySql).not.toContain('JOIN');
  });

  it('groups history without joining the user table', async () => {
    await repository.findHistory('student-1', { page: 2, pageSize: 12 });
    expect(querySql).toContain('SUM(');
    expect(querySql).toContain('"qr"."userId"');
    expect(querySql).not.toContain('"UserEntity"');
    expect(querySql).toContain('LIMIT 12');
    expect(querySql).toContain('OFFSET 12');
  });
});
