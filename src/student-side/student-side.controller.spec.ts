import { Test, TestingModule } from '@nestjs/testing';
import { StudentSideController } from './student-side.controller';

describe('StudentSideController', () => {
  let controller: StudentSideController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentSideController],
    }).compile();

    controller = module.get<StudentSideController>(StudentSideController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
