import { z } from 'zod';

const cleanText = (max: number) => z.string().trim().min(1).max(max);
export const quizRequestSchema = z
  .object({
    topic: cleanText(2000)
      .min(3)
      .refine(
        (value) =>
          [...value].every((character) => {
            const code = character.charCodeAt(0);
            return code > 31 && (code < 127 || code > 159);
          }),
        'Topic contains control characters',
      ),
    numQuestions: z.number().int().min(1).max(50),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    gradeLevel: cleanText(100).optional(),
    context: z.string().max(100000).optional(),
    validChunkCount: z.number().int().min(0).max(50).optional(),
  })
  .strict()
  .refine(
    (input) => !(input.validChunkCount ?? 0) || Boolean(input.context?.trim()),
  );

export const createModelQuizSchema = (
  expectedSource?: 'teacher_notes' | 'general_knowledge',
) =>
  z.object({
    title: z.string().describe('Title of the generated quiz'),
    description: z.string().describe('Brief description of the generated quiz'),
    questions: z.array(
      z.object({
        id: z
          .number()
          .int()
          .describe('Sequential question number starting at 1'),
        question: z.string().describe('The multiple-choice question text'),
        options: z.object({
          A: z.string().describe('Option A'),
          B: z.string().describe('Option B'),
          C: z.string().describe('Option C'),
          D: z.string().describe('Option D'),
        }),
        correctAnswer: z.enum(['A', 'B', 'C', 'D']),
        explanation: z
          .string()
          .describe('Clear explanation of why the correct answer is right'),
        source: expectedSource
          ? z
              .enum([expectedSource])
              .describe(`Must be exactly "${expectedSource}"`)
          : z.enum(['teacher_notes', 'general_knowledge']),
      }),
    ),
  });

export const modelQuizSchema = createModelQuizSchema();

export const safeQuizSchema = z
  .object({
    title: cleanText(250),
    description: cleanText(1000),
    questions: z
      .array(
        z
          .object({
            id: z.number().int().positive(),
            question: cleanText(1000),
            options: z
              .object({
                A: cleanText(1000),
                B: cleanText(1000),
                C: cleanText(1000),
                D: cleanText(1000),
              })
              .strict()
              .refine(
                (options) =>
                  new Set(
                    Object.values(options).map((value) =>
                      value.normalize('NFKC').toLowerCase(),
                    ),
                  ).size === 4,
                'Options must be distinct',
              ),
            correctAnswer: z.enum(['A', 'B', 'C', 'D']),
            explanation: cleanText(3000),
            source: z.enum(['teacher_notes', 'general_knowledge']),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
