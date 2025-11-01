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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizEntity = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../auth/entity/user.entity");
const question_entity_1 = require("./question.entity");
const response_entity_1 = require("./response.entity");
const result_entity_1 = require("./result.entity");
let QuizEntity = class QuizEntity {
    id;
    title;
    description;
    createdById;
    createdBy;
    scheduledAt;
    endAt;
    timeLimit;
    questions;
    responses;
    results;
    createdAt;
};
exports.QuizEntity = QuizEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], QuizEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QuizEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QuizEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], QuizEntity.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, (user) => user.quizzes, {
        onDelete: 'CASCADE',
        eager: false,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'createdById' }),
    __metadata("design:type", user_entity_1.UserEntity)
], QuizEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], QuizEntity.prototype, "scheduledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], QuizEntity.prototype, "endAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], QuizEntity.prototype, "timeLimit", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => question_entity_1.QuestionEntity, (question) => question.quiz),
    __metadata("design:type", Array)
], QuizEntity.prototype, "questions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => response_entity_1.ResponseEntity, (response) => response.quiz),
    __metadata("design:type", Array)
], QuizEntity.prototype, "responses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => result_entity_1.ResultEntity, (result) => result.quiz),
    __metadata("design:type", Array)
], QuizEntity.prototype, "results", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QuizEntity.prototype, "createdAt", void 0);
exports.QuizEntity = QuizEntity = __decorate([
    (0, typeorm_1.Entity)('quiz')
], QuizEntity);
//# sourceMappingURL=quiz.entity.js.map