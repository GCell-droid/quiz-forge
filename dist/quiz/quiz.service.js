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
let QuizService = class QuizService {
    quizRepo;
    questionRepo;
    sessionRepo;
    userRepo;
    schedulerRegistry;
    constructor(quizRepo, questionRepo, sessionRepo, userRepo, schedulerRegistry) {
        this.quizRepo = quizRepo;
        this.questionRepo = questionRepo;
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
        this.schedulerRegistry = schedulerRegistry;
    }
    async createQuiz(dto, teacherId) {
        const teacher = await this.userRepo.findOneBy({ id: teacherId });
        if (!teacher)
            throw new common_1.NotFoundException('Teacher not found');
        const questions = dto.questions.map((q) => this.questionRepo.create({
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
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
        const teacher = await this.userRepo.findOneBy({ id: teacherId });
        if (!teacher)
            throw new common_1.NotFoundException('Teacher not found');
        const quiz = await this.quizRepo.findOne({
            where: { id: dto.quizId },
            relations: ['questions'],
        });
        if (!quiz)
            throw new common_1.NotFoundException('Quiz not found');
        const session = this.sessionRepo.create({
            quiz,
            teacher,
            isActive: false,
            startedAt: new Date(dto.scheduledStartTime),
            endedAt: new Date(dto.scheduledEndTime),
        });
        if (dto.allowedStudents?.length) {
            session.allowedStudents = await this.userRepo.findBy({
                id: (0, typeorm_2.In)(dto.allowedStudents),
            });
        }
        const savedSession = await this.sessionRepo.save(session);
        this.addCronJob(`start-${savedSession.id}`, new Date(dto.scheduledStartTime), async () => {
            savedSession.isActive = true;
            await this.sessionRepo.save(savedSession);
            console.log(`Quiz Session ${savedSession.id} started`);
        });
        this.addCronJob(`end-${savedSession.id}`, new Date(dto.scheduledEndTime), async () => {
            savedSession.isActive = false;
            await this.sessionRepo.save(savedSession);
            console.log(`Quiz Session ${savedSession.id} ended`);
        });
        return savedSession;
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
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(quiz_entity_1.QuizEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(question_entity_1.QuestionEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(quizsession_entity_1.QuizSessionEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        schedule_1.SchedulerRegistry])
], QuizService);
//# sourceMappingURL=quiz.service.js.map