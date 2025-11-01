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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const register_dto_1 = require("./dto/register.dto");
const jwt_auth_guard_1 = require("./guards/jwtguard/jwt-auth.guard");
const config_1 = require("@nestjs/config");
const combined_auth_guard_1 = require("./guards/combinedGuard/combined-auth.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
const user_entity_1 = require("./entity/user.entity");
const roles_guard_1 = require("./guards/roles-guard/roles.guard");
let AuthController = class AuthController {
    authService;
    configService;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    serverTest() {
        return 'Server Running ';
    }
    googleSignIn() { }
    googleCallback(req, res) {
        const { user, tokens, needsRole, email } = req.user;
        if (needsRole) {
            return { needsRole: true, email };
        }
        res.cookie('jwt', tokens?.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            signed: true,
            maxAge: 15 * 60 * 1000,
        });
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: false,
            signed: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return { message: 'Login successful', user };
    }
    login(logindto, request, response) {
        return this.authService.login(logindto, request, response);
    }
    register(registerdto) {
        return this.authService.register(registerdto);
    }
    logout(res) {
        res.clearCookie('jwt');
        res.clearCookie('refresh_token');
        return res.send({ message: 'Logged out' });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.STUDENT),
    (0, common_1.UseGuards)(jwt_auth_guard_1.jwtAuthGuard, roles_guard_1.RoleGuard),
    (0, common_1.Get)('/test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "serverTest", null);
__decorate([
    (0, common_1.UseGuards)(combined_auth_guard_1.GoogleOrJwtAuthGuard),
    (0, common_1.Get)('/google'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleSignIn", null);
__decorate([
    (0, common_1.UseGuards)(combined_auth_guard_1.GoogleOrJwtAuthGuard),
    (0, common_1.Get)('/google/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDTO]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.jwtAuthGuard),
    (0, common_1.Get)('logout'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map