import {
  Injectable,
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';

import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { OptionEntity } from './entites/option.entity';
import { UserEntity } from '../auth/entity/user.entity';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { CreateQuestionDto } from './dto/create-question-dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepo: Repository<QuizEntity>,

    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,

    @InjectRepository(OptionEntity)
    private readonly optionRepo: Repository<OptionEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async createQuiz(userId: number, dto: CreateQuizDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('Creator user not found');

      if (!Array.isArray(dto.questions) || dto.questions.length === 0) {
        throw new BadRequestException('At least one question is required');
      }

      const scheduledAt = dto.scheduledAt
        ? new Date(dto.scheduledAt)
        : undefined;
      const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
      if (scheduledAt && isNaN(scheduledAt.getTime()))
        throw new BadRequestException('scheduledAt is not a valid date');
      if (endAt && isNaN(endAt.getTime()))
        throw new BadRequestException('endAt is not a valid date');
      if (scheduledAt && endAt && scheduledAt >= endAt)
        throw new BadRequestException('scheduledAt must be before endAt');

      const questionDtos = dto.questions as CreateQuestionDto[];
      const savedQuiz = await this.dataSource.transaction(async (manager) => {
        const quizRepository = manager.getRepository(QuizEntity);
        const questionRepository = manager.getRepository(QuestionEntity);
        const optionRepository = manager.getRepository(OptionEntity);
        // Use undefined (not null) for optional fields so DeepPartial<T> typing is satisfied
        const quizPayload: DeepPartial<QuizEntity> = {
          title: dto.title,
          description: dto.description ?? undefined,
          scheduledAt: scheduledAt ?? undefined,
          endAt: endAt ?? undefined,
          timeLimit:
            typeof dto.durationInMinutes === 'number'
              ? dto.durationInMinutes
              : dto.durationInMinutes
                ? Number(dto.durationInMinutes)
                : undefined,
          createdById: user.id,
        };

        const quiz = quizRepository.create(quizPayload);
        const persistedQuiz = await quizRepository.save(quiz);

        const createdQuestions: QuestionEntity[] = [];

        for (const [qIndex, qDto] of questionDtos.entries()) {
          if (!Array.isArray(qDto.options) || qDto.options.length < 2) {
            throw new BadRequestException(
              `Question ${qIndex}: options must be an array with at least 2 items`,
            );
          }

          const correctIdx = qDto.correctOptionIndex;
          if (
            correctIdx == null ||
            typeof correctIdx !== 'number' ||
            correctIdx < 0 ||
            correctIdx >= qDto.options.length
          ) {
            throw new BadRequestException(
              `Question ${qIndex}: correctOptionIndex is invalid`,
            );
          }

          const questionPayload: DeepPartial<QuestionEntity> = {
            text: qDto.questionText,
            marks: qDto.points ?? 1,
            type: qDto.type ?? undefined,
            quiz: persistedQuiz,
          };

          const question = questionRepository.create(questionPayload);
          const persistedQuestion = await questionRepository.save(question);

          const optionPayloads: DeepPartial<OptionEntity>[] = qDto.options.map(
            (optText: string, idx: number) => ({
              text: optText,
              isCorrect: idx === correctIdx,
              question: persistedQuestion,
            }),
          );

          const optionEntities = optionRepository.create(optionPayloads);
          const savedOptions = await optionRepository.save(optionEntities);

          (persistedQuestion as any).options = savedOptions;
          createdQuestions.push(persistedQuestion);
        }

        const quizWithRelations = await quizRepository.findOne({
          where: { id: persistedQuiz.id },
          relations: ['questions', 'questions.options', 'createdBy'],
          select: {
            id: true,
            title: true,
            description: true,
            scheduledAt: true,
            endAt: true,
            timeLimit: true,
            createdAt: true,
            createdBy: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        });

        if (!quizWithRelations) throw new Error('Failed to load created quiz');

        return quizWithRelations;
      });
      return savedQuiz;
    } catch (e) {
      throw new PreconditionFailedException(e.message);
    }
  }
}
