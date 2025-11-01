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
exports.RegisterDTO = void 0;
const class_validator_1 = require("class-validator");
const user_entity_1 = require("../entity/user.entity");
class RegisterDTO {
    email;
    name;
    password;
    role;
}
exports.RegisterDTO = RegisterDTO;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Please Provide Email' }),
    __metadata("design:type", String)
], RegisterDTO.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Please Provide name' }),
    (0, class_validator_1.IsString)({ message: 'name must be string' }),
    __metadata("design:type", String)
], RegisterDTO.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Please provide password' }),
    (0, class_validator_1.IsStrongPassword)({}, { message: 'Please provide strong password' }),
    __metadata("design:type", String)
], RegisterDTO.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(user_entity_1.UserRole, { message: "Role must be either 'teacher' or 'student'" }),
    __metadata("design:type", String)
], RegisterDTO.prototype, "role", void 0);
//# sourceMappingURL=register.dto.js.map