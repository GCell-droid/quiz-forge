import { z } from 'zod';

const cleanText = (maxLength: number) =>
  z
    .string()
    .transform((value) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim())
    .pipe(z.string().min(1).max(maxLength));

export const quizRequestSchema = z
  .object({
    topic: z
      .string()
      .min(1)
      .max(2000)
      .refine(
        (value) =>
          [...value].every((character) => {
            const code = character.charCodeAt(0);
            return code > 31 && (code < 127 || code > 159);
          }),
        'Topic contains control characters',
      )
      .transform((value) => value.normalize('NFKC').trim())
      .pipe(z.string().min(3).max(2000)),
    numQuestions: z.number().int().min(1).max(50),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })
  .strict();

// A small provider-facing schema keeps structured output reliable across models.
export const modelQuizSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(
    z.object({
      title: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.string(),
    }),
  ),
});

const safeQuestionSchema = z
  .object({
    title: cleanText(500),
    options: z.array(cleanText(300)).length(4),
    correctAnswer: cleanText(300),
  })
  .strict()
  .refine(
    (question) =>
      new Set(question.options.map((option) => option.toLocaleLowerCase()))
        .size === 4,
    'Options must be distinct',
  )
  .refine(
    (question) =>
      question.options.some(
        (option) =>
          option.toLocaleLowerCase() ===
          question.correctAnswer.toLocaleLowerCase(),
      ),
    'Correct answer must match an option',
  );

export const safeQuizSchema = z
  .object({
    title: cleanText(100),
    description: cleanText(200),
    questions: z.array(safeQuestionSchema).min(1).max(50),
  })
  .strict();
