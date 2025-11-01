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
exports.QuizController = void 0;
const common_1 = require("@nestjs/common");
const quiz_service_1 = require("./quiz.service");
const jwt_auth_guard_1 = require("../auth/guards/jwtguard/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles-guard/roles.guard");
const combined_auth_guard_1 = require("../auth/guards/combinedGuard/combined-auth.guard");
const create_quiz_dto_1 = require("./dto/create-quiz-dto");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../auth/entity/user.entity");
let QuizController = class QuizController {
    quizService;
    constructor(quizService) {
        this.quizService = quizService;
    }
    async CreateQuizDto(req, quizz) {
        return await this.quizService.createQuiz(req.user.id, quizz);
    }
};
exports.QuizController = QuizController;
__decorate([
    (0, common_1.Post)('/create-quiz'),
    (0, common_1.UseGuards)(combined_auth_guard_1.GoogleOrJwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.TEACHER),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_quiz_dto_1.CreateQuizDto]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "CreateQuizDto", null);
exports.QuizController = QuizController = __decorate([
    (0, common_1.Controller)('quiz'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.jwtAuthGuard, roles_guard_1.RoleGuard),
    __metadata("design:paramtypes", [quiz_service_1.QuizService])
], QuizController);
//# sourceMappingURL=quiz.controller.js.map