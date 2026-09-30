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

  it('handleJoinSession returns quizPayload in ack response and joins session room', async () => {
    const mockSessionsService = {
      processJoinSession: jest.fn().mockResolvedValue({
        data: {
          sessionId: 'session-uuid-1',
          status: 'ACTIVE',
          scheduledStart: new Date(),
          isCreator: false,
          initialStats: [],
          answeredQuestionIds: [],
          quizPayload: {
            sessionId: 'session-uuid-1',
            quizTitle: 'Live Quiz',
            questions: [{ questionId: 'q1', title: 'Q1' }],
            totalQuestions: 1,
            timeLimit: 300,
          },
        },
      }),
    };

    const gateway = new SessionGateway(
      mockSessionsService as never,
      {} as never,
    );

    const clientJoin = jest.fn();
    const clientEmit = jest.fn();
    const mockClient = {
      id: 'client-1',
      join: clientJoin,
      emit: clientEmit,
      user: { userId: 'user-1' },
    };

    const fetchSockets = jest.fn().mockResolvedValue([]);
    gateway.server = {
      in: jest.fn().mockReturnValue({ fetchSockets }),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as never;

    const result = await gateway.handleJoinSession(
      mockClient as never,
      { sessionId: '3LQ4SV' },
    );

    expect(result.success).toBe(true);
    expect(result.data.quizPayload).toBeDefined();
    expect(result.data.quizPayload.quizTitle).toBe('Live Quiz');
    expect(clientJoin).toHaveBeenCalledWith('session_session-uuid-1');
    expect(clientJoin).toHaveBeenCalledWith('session_3LQ4SV');
    expect(clientEmit).toHaveBeenCalledWith(
      'quiz_started',
      result.data.quizPayload,
    );
  });
});

