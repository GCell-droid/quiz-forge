import { UserEntity } from '../../auth/entity/user.entity';
import { QuestionEntity } from './question.entity';
import { ResponseEntity } from './response.entity';
import { ResultEntity } from './result.entity';
export declare class QuizEntity {
    id: number;
    title: string;
    description: string;
    createdById: number;
    createdBy: UserEntity;
    scheduledAt: Date;
    endAt: Date;
    timeLimit: number;
    questions: QuestionEntity[];
    responses: ResponseEntity[];
    results: ResultEntity[];
    createdAt: Date;
}
