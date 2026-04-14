import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';

import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { OptionEntity } from './entites/option.entity';
import { ResponseEntity } from './entites/response.entity';
import { ResultEntity } from './entites/result.entity';
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

    @InjectRepository(ResponseEntity)
    private readonly responseRepo: Repository<ResponseEntity>,

    @InjectRepository(ResultEntity)
    private readonly resultRepo: Repository<ResultEntity>,

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

          const correctAnswer = qDto.correctAnswer;
          if (correctAnswer == null || typeof correctAnswer !== 'string') {
            throw new BadRequestException(
              `Question ${qIndex}: correctAnswer is invalid`,
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
              isCorrect: optText === correctAnswer,
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
  /**
   * Save or update a user's response to a question, recalc user's result (score),
   * and return aggregated stats for the question.
   */
  async getQuizForStudent(quizId: number, userId: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        endAt: true,
        timeLimit: true,
        questions: {
          id: true,
          text: true,
          type: true,
          marks: true,
          options: {
            id: true,
            text: true,
            // Don't send isCorrect to students
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if quiz is available
    const now = new Date();
    if (quiz.scheduledAt && quiz.scheduledAt > now) {
      throw new BadRequestException('Quiz has not started yet');
    }

    if (quiz.endAt && quiz.endAt < now) {
      throw new BadRequestException('Quiz has ended');
    }

    // Check if student already submitted
    const existingResult = await this.resultRepo.findOne({
      where: {
        quiz: { id: quizId },
        user: { id: userId },
      },
    });

    if (existingResult) {
      throw new BadRequestException('You have already submitted this quiz');
    }

    // Remove isCorrect from response (security measure)
    const sanitizedQuiz = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options.map(({ id, text }) => ({ id, text })),
      })),
    };

    return sanitizedQuiz;
  }

  /**
   * Submit a single answer
   */
  async submitResponse(
    userId: number,
    quizId: number,
    questionId: number,
    optionselected: number,
  ) {
    // Verify quiz exists and is active
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const now = new Date();
    if (quiz.endAt && quiz.endAt < now) {
      throw new BadRequestException('Quiz has ended');
    }

    // Check if already submitted quiz
    const existingResult = await this.resultRepo.findOne({
      where: {
        quiz: { id: quizId },
        user: { id: userId },
      },
    });

    if (existingResult) {
      throw new BadRequestException('Quiz already submitted');
    }

    // Get question and option
    const question = await this.questionRepo.findOne({
      where: { id: questionId, quiz: { id: quizId } },
      relations: ['options'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }
    const selectedOption = await this.optionRepo.findOne({
      where: {
        id: question.options[optionselected].id,
        question: { id: questionId },
      },
    });

    if (!selectedOption) {
      throw new BadRequestException('Invalid option selected');
    }

    // Check if already answered this question
    const existingResponse = await this.responseRepo.findOne({
      where: {
        user: { id: userId },
        question: { id: questionId },
        quiz: { id: quizId },
      },
    });

    if (existingResponse) {
      // Update existing response
      existingResponse.selectedOption = selectedOption;
      existingResponse.isCorrect = selectedOption.isCorrect;
      existingResponse.answeredAt = new Date();
      return await this.responseRepo.save(existingResponse);
    }

    // Create new response
    const response = this.responseRepo.create({
      user: { id: userId },
      quiz: { id: quizId },
      question: { id: questionId },
      selectedOption,
      isCorrect: selectedOption.isCorrect,
    });

    return await this.responseRepo.save(response);
  }

  /**
   * Submit entire quiz and calculate result
   */
  async submitQuiz(userId: number, quizId: number) {
    // Check if already submitted
    const existingResult = await this.resultRepo.findOne({
      where: {
        quiz: { id: quizId },
        user: { id: userId },
      },
    });

    if (existingResult) {
      throw new BadRequestException('Quiz already submitted');
    }

    // Get all responses for this user and quiz
    const responses = await this.responseRepo.find({
      where: {
        user: { id: userId },
        quiz: { id: quizId },
      },
      relations: ['question'],
    });

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;

    const questions = await this.questionRepo.find({
      where: { quiz: { id: quizId } },
    });

    for (const question of questions) {
      maxScore += question.marks;
      const response = responses.find((r) => r.question.id === question.id);
      if (response && response.isCorrect) {
        totalScore += question.marks;
      }
    }

    // Calculate percentage
    const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Create result
    const result = this.resultRepo.create({
      user: { id: userId },
      quiz: { id: quizId },
      score: percentageScore,
    });

    return await this.resultRepo.save(result);
  }

  /**
   * Get statistics for a specific question (for real-time display)
   */
  async getQuestionStats(quizId: number, questionId: number) {
    const question = await this.questionRepo.findOne({
      where: { id: questionId, quiz: { id: quizId } },
      relations: ['options'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Get response counts per option
    const responses = await this.responseRepo
      .createQueryBuilder('response')
      .leftJoin('response.selectedOption', 'option')
      .leftJoin('response.question', 'question')
      .where('question.id = :questionId', { questionId })
      .select('option.id', 'optionId')
      .addSelect('COUNT(response.id)', 'count')
      .groupBy('option.id')
      .getRawMany();

    const optionStats = question.options.map((option) => {
      const stat = responses.find((r) => r.optionId === option.id);
      return {
        optionId: option.id,
        optionText: option.text,
        isCorrect: option.isCorrect,
        responseCount: parseInt(stat?.count || '0'),
      };
    });

    const totalResponses = optionStats.reduce(
      (sum, opt) => sum + opt.responseCount,
      0,
    );

    return {
      questionId,
      questionText: question.text,
      totalResponses,
      optionStats,
    };
  }

  /**
   * Get overall quiz statistics
   */
  async getQuizStats(quizId: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['questions'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Count total participants (unique users who answered)
    const participantCount = await this.responseRepo
      .createQueryBuilder('response')
      .leftJoin('response.user', 'user')
      .where('response.quiz.id = :quizId', { quizId })
      .select('COUNT(DISTINCT user.id)', 'count')
      .getRawOne();

    // Count submitted quizzes
    const submissionCount = await this.resultRepo.count({
      where: { quiz: { id: quizId } },
    });

    // Get question-wise stats
    const questionStats = await Promise.all(
      quiz.questions.map((q) => this.getQuestionStats(quizId, q.id)),
    );

    // Average score
    const avgScore = await this.resultRepo
      .createQueryBuilder('result')
      .where('result.quiz.id = :quizId', { quizId })
      .select('AVG(result.score)', 'average')
      .getRawOne();

    return {
      quizId,
      title: quiz.title,
      totalQuestions: quiz.questions.length,
      participantCount: parseInt(participantCount?.count || '0'),
      submissionCount,
      averageScore: parseFloat(avgScore?.average || '0'),
      questionStats,
    };
  }

  /**
   * Get live responses for teacher dashboard
   */
  async getLiveResponses(quizId: number) {
    const responses = await this.responseRepo.find({
      where: { quiz: { id: quizId } },
      relations: ['user', 'question', 'selectedOption'],
      order: { answeredAt: 'DESC' },
      take: 50, // Last 50 responses
    });

    return responses.map((r) => ({
      userId: r.user.id,
      userName: r.user.name,
      questionId: r.question.id,
      optionId: r.selectedOption?.id,
      isCorrect: r.isCorrect,
      answeredAt: r.answeredAt,
    }));
  }

  /**
   * Verify quiz ownership for teacher
   */
  async verifyQuizOwnership(quizId: number, teacherId: number) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['createdBy'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.createdById !== teacherId) {
      throw new ForbiddenException('You do not own this quiz');
    }

    return quiz;
  }

  /**
   * Get student's responses for a quiz
   */
  async getStudentResponses(userId: number, quizId: number) {
    const responses = await this.responseRepo.find({
      where: {
        user: { id: userId },
        quiz: { id: quizId },
      },
      relations: ['question', 'selectedOption', 'question.options'],
    });

    return responses.map((r) => ({
      questionId: r.question.id,
      questionText: r.question.text,
      selectedOptionId: r.selectedOption?.id,
      isCorrect: r.isCorrect,
      answeredAt: r.answeredAt,
    }));
  }

  /**
   * Get leaderboard for a quiz
   */
  async getLeaderboard(quizId: number) {
    const results = await this.resultRepo.find({
      where: { quiz: { id: quizId } },
      relations: ['user'],
      order: { score: 'DESC' },
    });

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.user.id,
      userName: r.user.name,
      score: r.score,
      submittedAt: r.submittedAt,
    }));
  }
  async getAllquiz() {
    return await this.quizRepo.find({
      relations: ['questions', 'responses', 'results'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
  async getAllOption() {
    return await this.optionRepo.find();
  }

  async getAllResponse() {
    const res = await this.responseRepo.find();
    return res;
  }

  async getAllQuestion() {
    const res = await this.questionRepo.find();
    return res;
  }
}
