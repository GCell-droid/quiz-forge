import { SessionGateway } from './session.gateway';

describe('SessionGateway event publishing', () => {
  it('sends one question to students and the full quiz to the teacher', () => {
    const gateway = new SessionGateway({} as never, {} as never);
    const studentEmit = jest.fn();
    const teacherEmit = jest.fn();
    const except = jest.fn().mockReturnValue({ emit: studentEmit });
    const to = jest.fn((room: string) =>
      room.endsWith('_teacher') ? { emit: teacherEmit } : { except },
    );
    gateway.server = { to } as never;

    const event = {
      sessionId: 'session-1',
      quizTitle: 'Quiz',
      questions: [
        {
          questionId: 'q1',
          title: 'First',
          type: 'MULTIPLE_CHOICE',
          options: ['A'],
          points: 1,
        },
        {
          questionId: 'q2',
          title: 'Second',
          type: 'MULTIPLE_CHOICE',
          options: ['B'],
          points: 1,
        },
      ],
      totalQuestions: 2,
      timeLimit: 60,
    };

    gateway.quizStarted(event);

    expect(to).toHaveBeenCalledWith('session_session-1');
    expect(except).toHaveBeenCalledWith('session_session-1_teacher');
    expect(studentEmit).toHaveBeenCalledWith('quiz_started', {
      ...event,
      questions: [event.questions[0]],
    });
    expect(teacherEmit).toHaveBeenCalledWith('quiz_started', event);
  });
});
