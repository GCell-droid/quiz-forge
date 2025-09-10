import { UserEntity } from 'src/auth/entity/user.entity';
import { QuestionEntity } from './question.entity';
export declare class QuizEntity {
    id: number;
    title: string;
    description: string;
    isAIgenerated: boolean;
    author: UserEntity;
    questions: QuestionEntity[];
    isActive: boolean;
    timerSeconds: number;
    createdAt: Date;
}
