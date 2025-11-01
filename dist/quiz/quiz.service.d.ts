import { Repository, DataSource } from 'typeorm';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { OptionEntity } from './entites/option.entity';
import { UserEntity } from '../auth/entity/user.entity';
import { CreateQuizDto } from './dto/create-quiz-dto';
export declare class QuizService {
    private readonly quizRepo;
    private readonly questionRepo;
    private readonly optionRepo;
    private readonly userRepo;
    private readonly dataSource;
    constructor(quizRepo: Repository<QuizEntity>, questionRepo: Repository<QuestionEntity>, optionRepo: Repository<OptionEntity>, userRepo: Repository<UserEntity>, dataSource: DataSource);
    createQuiz(userId: number, dto: CreateQuizDto): Promise<QuizEntity>;
}
