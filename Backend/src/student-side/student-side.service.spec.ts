import { Test, TestingModule } from '@nestjs/testing';
import { StudentSideService } from './student-side.service';

describe('StudentSideService', () => {
  let service: StudentSideService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentSideService],
    }).compile();

    service = module.get<StudentSideService>(StudentSideService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
