"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const quiz_entity_1 = require("./entites/quiz.entity");
const question_entity_1 = require("./entites/question.entity");
const option_entity_1 = require("./entites/option.entity");
const user_entity_1 = require("../auth/entity/user.entity");
let QuizService = class QuizService {
    quizRepo;
    questionRepo;
    optionRepo;
    userRepo;
    dataSource;
    constructor(quizRepo, questionRepo, optionRepo, userRepo, dataSource) {
        this.quizRepo = quizRepo;
        this.questionRepo = questionRepo;
        this.optionRepo = optionRepo;
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async createQuiz(userId, dto) {
        try {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (!user)
                throw new common_1.NotFoundException('Creator user not found');
            if (!Array.isArray(dto.questions) || dto.questions.length === 0) {
                throw new common_1.BadRequestException('At least one question is required');
            }
            const scheduledAt = dto.scheduledAt
                ? new Date(dto.scheduledAt)
                : undefined;
            const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
            if (scheduledAt && isNaN(scheduledAt.getTime()))
                throw new common_1.BadRequestException('scheduledAt is not a valid date');
            if (endAt && isNaN(endAt.getTime()))
                throw new common_1.BadRequestException('endAt is not a valid date');
            if (scheduledAt && endAt && scheduledAt >= endAt)
                throw new common_1.BadRequestException('scheduledAt must be before endAt');
            const questionDtos = dto.questions;
            const savedQuiz = await this.dataSource.transaction(async (manager) => {
                const quizRepository = manager.getRepository(quiz_entity_1.QuizEntity);
                const questionRepository = manager.getRepository(question_entity_1.QuestionEntity);
                const optionRepository = manager.getRepository(option_entity_1.OptionEntity);
                const quizPayload = {
                    title: dto.title,
                    description: dto.description ?? undefined,
                    scheduledAt: scheduledAt ?? undefined,
                    endAt: endAt ?? undefined,
                    timeLimit: typeof dto.durationInMinutes === 'number'
                        ? dto.durationInMinutes
                        : dto.durationInMinutes
                            ? Number(dto.durationInMinutes)
                            : undefined,
                    createdById: user.id,
                };
                const quiz = quizRepository.create(quizPayload);
                const persistedQuiz = await quizRepository.save(quiz);
                const createdQuestions = [];
                for (const [qIndex, qDto] of questionDtos.entries()) {
                    if (!Array.isArray(qDto.options) || qDto.options.length < 2) {
                        throw new common_1.BadRequestException(`Question ${qIndex}: options must be an array with at least 2 items`);
                    }
                    const correctIdx = qDto.correctOptionIndex;
                    if (correctIdx == null ||
                        typeof correctIdx !== 'number' ||
                        correctIdx < 0 ||
                        correctIdx >= qDto.options.length) {
                        throw new common_1.BadRequestException(`Question ${qIndex}: correctOptionIndex is invalid`);
                    }
                    const questionPayload = {
                        text: qDto.questionText,
                        marks: qDto.points ?? 1,
                        type: qDto.type ?? undefined,
                        quiz: persistedQuiz,
                    };
                    const question = questionRepository.create(questionPayload);
                    const persistedQuestion = await questionRepository.save(question);
                    const optionPayloads = qDto.options.map((optText, idx) => ({
                        text: optText,
                        isCorrect: idx === correctIdx,
                        question: persistedQuestion,
                    }));
                    const optionEntities = optionRepository.create(optionPayloads);
                    const savedOptions = await optionRepository.save(optionEntities);
                    persistedQuestion.options = savedOptions;
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
                if (!quizWithRelations)
                    throw new Error('Failed to load created quiz');
                return quizWithRelations;
            });
            return savedQuiz;
        }
        catch (e) {
            throw new common_1.PreconditionFailedException(e.message);
        }
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quiz_entity_1.QuizEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(question_entity_1.QuestionEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(option_entity_1.OptionEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], QuizService);
//# sourceMappingURL=quiz.service.js.map