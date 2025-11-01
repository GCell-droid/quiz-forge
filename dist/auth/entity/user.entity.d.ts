import { QuizEntity } from '../../quiz/entites/quiz.entity';
import { ResponseEntity } from '../../quiz/entites/response.entity';
import { ResultEntity } from '../../quiz/entites/result.entity';
export declare enum UserRole {
    STUDENT = "student",
    TEACHER = "teacher",
    ADMIN = "admin"
}
export declare class UserEntity {
    id: number;
    email: string;
    name: string;
    password: string;
    role: UserRole;
    createdAt: Date;
    quizzes: QuizEntity[];
    responses: ResponseEntity[];
    results: ResultEntity[];
}
