import { AnswerEntity } from 'src/quiz/entites/answer.entity';
import { QuizEntity } from 'src/quiz/entites/quiz.entity';
import { QuizSessionEntity } from 'src/quiz/entites/quizsession.entity';
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
    quizzes: QuizEntity[];
    answers: AnswerEntity[];
    sessions: QuizSessionEntity[];
    createdAt: Date;
}
