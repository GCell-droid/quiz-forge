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
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const user_entity_1 = require("../auth/entity/user.entity");
const quiz_entity_1 = require("./entites/quiz.entity");
const question_entity_1 = require("./entites/question.entity");
const quizsession_entity_1 = require("./entites/quizsession.entity");
const crypto_1 = require("crypto");
const answer_entity_1 = require("./entites/answer.entity");
const quiz_gateway_1 = require("./gateway/quiz.gateway");
let QuizService = class QuizService {
    quizRepo;
    questionRepo;
    sessionRepo;
    userRepo;
    schedulerRegistry;
    answerRepo;
    quizGateway;
    constructor(quizRepo, questionRepo, sessionRepo, userRepo, schedulerRegistry, answerRepo, quizGateway) {
        this.quizRepo = quizRepo;
        this.questionRepo = questionRepo;
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
        this.schedulerRegistry = schedulerRegistry;
        this.answerRepo = answerRepo;
        this.quizGateway = quizGateway;
    }
    async createQuiz(dto, teacherId) {
        const teacher = await this.userRepo.findOneBy({ id: teacherId });
        if (!teacher)
            throw new common_1.NotFoundException('Teacher not found');
        const questions = dto.questions.map((q) => this.questionRepo.create({
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            marks: q.marks,
        }));
        const quiz = this.quizRepo.create({
            title: dto.title,
            description: dto.description,
            isAIgenerated: dto.isAIgenerated || false,
            author: teacher,
            timerSeconds: dto.timerSeconds,
            questions,
        });
        return this.quizRepo.save(quiz);
    }
    async scheduleQuiz(dto, teacherId) {
        try {
            const teacher = await this.userRepo.findOneBy({ id: teacherId });
            if (!teacher)
                throw new common_1.NotFoundException('Teacher not found');
            const quiz = await this.quizRepo.findOne({
                where: { id: dto.quizId },
                relations: ['questions'],
            });
            if (!quiz)
                throw new common_1.NotFoundException('Quiz not found');
            const conflict = await this.sessionRepo.findOne({
                where: {
                    quiz: { id: dto.quizId },
                    scheduledStartTime: (0, typeorm_2.LessThanOrEqual)(new Date(dto.scheduledEndTime)),
                    scheduledEndTime: (0, typeorm_2.MoreThanOrEqual)(new Date(dto.scheduledStartTime)),
                },
            });
            if (conflict) {
                throw new common_1.BadRequestException(`This quiz already has a session scheduled between ${conflict.scheduledStartTime.toISOString()} and ${conflict.scheduledEndTime.toISOString()}`);
            }
            const joinCode = (0, crypto_1.randomBytes)(3).toString('hex').toUpperCase();
            const session = this.sessionRepo.create({
                quiz,
                teacher,
                joinCode,
                scheduledStartTime: new Date(dto.scheduledStartTime),
                scheduledEndTime: new Date(dto.scheduledEndTime),
                isActive: false,
            });
            if (dto.allowedStudents?.length) {
                session.allowedStudents = await this.userRepo.findBy({
                    id: (0, typeorm_2.In)(dto.allowedStudents),
                });
            }
            const savedSession = await this.sessionRepo.save(session);
            this.addCronJob(`start-${savedSession.id}`, new Date(dto.scheduledStartTime), async () => {
                this.quizGateway.server
                    .to(savedSession.joinCode)
                    .emit('quizStarted', {
                    sessionId: savedSession.id,
                    quizId: savedSession.quiz.id,
                    startTime: savedSession.scheduledStartTime,
                });
            });
            this.addCronJob(`end-${savedSession.id}`, new Date(dto.scheduledEndTime), async () => {
                this.quizGateway.server.to(savedSession.joinCode).emit('quizEnded', {
                    sessionId: savedSession.id,
                    quizId: savedSession.quiz.id,
                    endTime: savedSession.scheduledEndTime,
                });
            });
            return savedSession;
        }
        catch (error) {
            throw new common_1.InternalServerErrorException(error.message);
        }
    }
    async getQuiz(quizId) {
        const quiz = await this.quizRepo.findOne({
            where: { id: quizId },
            relations: ['questions'],
        });
        if (!quiz)
            throw new common_1.NotFoundException('Quiz not found');
        return quiz;
    }
    addCronJob(name, date, callback) {
        if (this.schedulerRegistry.doesExist('cron', name)) {
            this.schedulerRegistry.deleteCronJob(name);
        }
        const job = new cron_1.CronJob(date, async () => {
            await callback();
        });
        this.schedulerRegistry.addCronJob(name, job);
        job.start();
    }
    async submitAnswer(studentId, dto) {
        return await this.answerRepo.manager.transaction(async (manager) => {
            const session = await manager.findOne(quizsession_entity_1.QuizSessionEntity, {
                where: { id: dto.sessionId },
                relations: ['quiz', 'allowedStudents'],
            });
            if (!session)
                throw new common_1.NotFoundException('Session not found');
            if (!session.isActive) {
                throw new common_1.BadRequestException('Session is not active');
            }
            if (session.allowedStudents?.length) {
                const allowed = session.allowedStudents.some((s) => s.id === studentId);
                if (!allowed) {
                    throw new common_1.ForbiddenException('You are not allowed in this session');
                }
            }
            const existing = await manager.findOne(answer_entity_1.AnswerEntity, {
                where: {
                    student: { id: studentId },
                    question: { id: dto.questionId },
                    session: { id: dto.sessionId },
                },
            });
            if (existing) {
                throw new common_1.BadRequestException('You have already submitted this answer');
            }
            const question = await manager.findOne(question_entity_1.QuestionEntity, {
                where: { id: dto.questionId },
                relations: ['quiz'],
            });
            if (!question)
                throw new common_1.NotFoundException('Question not found');
            if (question.quiz.id !== session.quiz.id) {
                throw new common_1.BadRequestException('Question does not belong to session quiz');
            }
            const isCorrect = question.correctAnswerIndex === dto.selectedOptionIndex;
            const score = isCorrect ? question.marks : 0;
            const student = await manager.findOne(user_entity_1.UserEntity, {
                where: { id: studentId },
            });
            if (!student)
                throw new common_1.NotFoundException('Student not found');
            const answer = manager.create(answer_entity_1.AnswerEntity, {
                student,
                question,
                session,
                selectedOptionIndex: dto.selectedOptionIndex,
                score,
            });
            const saved = await manager.save(answer);
            this.quizGateway.emitAnswerToTeacher(session.id, {
                answerId: saved.id,
                questionId: question.id,
                studentId,
                selectedOptionIndex: dto.selectedOptionIndex,
                score,
                createdAt: saved.createdAt,
            });
            return { ok: true, answerId: saved.id };
        });
    }
    async joinQuiz(studentId, joinCode) {
        const session = await this.sessionRepo.findOne({
            where: { joinCode },
            relations: ['quiz', 'allowedStudents', 'quiz.questions'],
        });
        if (!session)
            throw new common_1.NotFoundException('Invalid join code');
        const now = new Date();
        if (now < session.scheduledStartTime || now > session.scheduledEndTime) {
            throw new common_1.BadRequestException('Quiz is not live');
        }
        if (session.allowedStudents?.length) {
            const allowed = session.allowedStudents.some((s) => s.id === studentId);
            if (!allowed)
                throw new common_1.ForbiddenException('Not allowed in this quiz');
        }
        this.quizGateway.server.socketsJoin(joinCode);
        return {
            sessionId: session.id,
            quizId: session.quiz.id,
            title: session.quiz.title,
            description: session.quiz.description,
            timerSeconds: session.quiz.timerSeconds,
            questions: session.quiz.questions.map((q) => ({
                id: q.id,
                text: q.text,
                options: q.options,
                marks: q.marks,
            })),
        };
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quiz_entity_1.QuizEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(question_entity_1.QuestionEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(quizsession_entity_1.QuizSessionEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __param(5, (0, typeorm_1.InjectRepository)(answer_entity_1.AnswerEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        schedule_1.SchedulerRegistry,
        typeorm_2.Repository,
        quiz_gateway_1.QuizGateway])
], QuizService);
//# sourceMappingURL=quiz.service.js.map