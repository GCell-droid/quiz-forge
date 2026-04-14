import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  points: number;
  type: string;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly model: GenerativeModel;
  private readonly maxRetries = 2;
  private readonly generationConfig = {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  };

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_KEY');

    if (!apiKey) {
      this.logger.error(
        'GEMINI_KEY is not configured in environment variables',
      );
      throw new InternalServerErrorException(
        'Gemini API key is not configured',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model:
        this.configService.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash',
      generationConfig: this.generationConfig,
    });

    this.logger.log('GeminiService initialized successfully');
  }

  /**
   * Generate a quiz from a given topic using Gemini AI
   * @param topic - The subject or theory to generate quiz questions about
   * @param numQuestions - Number of questions to generate (default: 5)
   * @param difficulty - Difficulty level: easy, medium, or hard (default: medium)
   * @returns Generated quiz with title, description, and questions
   */
  async generateQuizFromTopic(
    topic: string,
    numQuestions = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): Promise<GeneratedQuiz> {
    // Input validation
    this.validateQuizInputs(topic, numQuestions, difficulty);

    let lastError: Error | null = null;

    // Retry logic for API resilience
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(
            `Retrying quiz generation (attempt ${attempt + 1}/${this.maxRetries + 1})`,
          );
          // Wait before retry (exponential backoff)
          await this.delay(Math.pow(2, attempt) * 1000);
        }

        const prompt = this.buildQuizPrompt(topic, numQuestions, difficulty);
        const quizData = await this.callGeminiAPI(prompt);
        const validatedQuiz = this.validateAndSanitizeQuiz(
          quizData,
          numQuestions,
        );

        this.logger.log(
          `Successfully generated quiz with ${validatedQuiz.questions.length} questions`,
        );

        return validatedQuiz;
      } catch (error) {
        lastError = error as Error;
        this.logger.error(
          `Quiz generation failed (attempt ${attempt + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (attempt === this.maxRetries) {
          break;
        }
      }
    }

    // If all retries failed
    throw new InternalServerErrorException(
      `Failed to generate quiz after ${this.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Validate quiz generation inputs
   */
  private validateQuizInputs(
    topic: string,
    numQuestions: number,
    difficulty: string,
  ): void {
    if (!topic || topic.trim().length === 0) {
      throw new BadRequestException('Topic cannot be empty');
    }

    if (topic.length > 2000) {
      throw new BadRequestException('Topic is too long (max 2000 characters)');
    }

    if (numQuestions < 1 || numQuestions > 50) {
      throw new BadRequestException(
        'Number of questions must be between 1 and 50',
      );
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new BadRequestException(
        'Difficulty must be one of: easy, medium, hard',
      );
    }
  }

  /**
   * Build the optimized prompt for Gemini
   */
  private buildQuizPrompt(
    topic: string,
    numQuestions: number,
    difficulty: string,
  ): string {
    return `You are an expert educational content creator. Generate a multiple-choice quiz in VALID JSON format.

CRITICAL: Return ONLY the JSON object with no additional text, markdown, or code blocks.

Topic: "${topic}"
Number of Questions: ${numQuestions}
Difficulty: ${difficulty}

Requirements:
1. Create ${numQuestions} high-quality multiple-choice questions
2. Each question MUST have exactly 4 options
3. Questions should be ${difficulty} difficulty level
4. Mix conceptual understanding and practical application
5. Ensure questions are clear, unambiguous, and factually correct
6. Options should be plausible distractors (not obviously wrong)

JSON Schema (return EXACTLY this structure):
{
  "title": "Engaging quiz title (max 100 chars)",
  "description": "Brief description of what the quiz covers (max 200 chars)",
  "questions": [
    {
      "questionText": "Clear question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOptionIndex": 0,
      "points": 1,
      "type": "MCQ"
    }
  ]
}

Rules:
- correctOptionIndex is 0-based (0, 1, 2, or 3)
- All questions get 1 point by default
- type is always "MCQ"
- Ensure JSON is valid and parseable
- NO explanations, NO markdown, NO code fences
- Return ONLY the raw JSON object

Generate the quiz now:`;
  }

  /**
   * Call Gemini API with error handling
   */
  private async callGeminiAPI(prompt: string): Promise<unknown> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Gemini returned empty response');
      }

      return this.parseJsonFromResponse(text);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Gemini API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse JSON from Gemini response (handles markdown code blocks)
   */
  private parseJsonFromResponse(text: string): unknown {
    let cleanText = text.trim();

    // Remove markdown code blocks if present
    cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Try to find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON object found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(
        `JSON parsing failed: ${jsonMatch[0].substring(0, 200)}...`,
      );
      throw new Error('Failed to parse JSON from Gemini response');
    }
  }

  /**
   * Validate and sanitize the quiz data
   */
  private validateAndSanitizeQuiz(
    data: unknown,
    expectedQuestions: number,
  ): GeneratedQuiz {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid quiz data structure');
    }

    const quizData = data as Record<string, unknown>;

    // Validate required fields
    if (!quizData.title || typeof quizData.title !== 'string') {
      throw new BadRequestException('Quiz must have a valid title');
    }

    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new BadRequestException('Quiz must have at least one question');
    }

    // Sanitize questions
    const sanitizedQuestions: QuizQuestion[] = quizData.questions
      .slice(0, expectedQuestions)
      .map((q: unknown, idx: number) => this.sanitizeQuestion(q, idx));

    if (sanitizedQuestions.length < Math.min(3, expectedQuestions)) {
      throw new BadRequestException(
        `Generated quiz has insufficient valid questions (got ${sanitizedQuestions.length})`,
      );
    }

    return {
      title: String(quizData.title).trim().substring(0, 100),
      description:
        String(quizData.description || '')
          .trim()
          .substring(0, 200) || `A quiz about ${quizData.title}`,
      questions: sanitizedQuestions,
    };
  }

  /**
   * Sanitize a single question
   */
  private sanitizeQuestion(q: unknown, idx: number): QuizQuestion {
    if (!q || typeof q !== 'object') {
      throw new BadRequestException(
        `Question ${idx + 1} has invalid structure`,
      );
    }

    const question = q as Record<string, unknown>;

    // Validate question text
    if (!question.questionText || typeof question.questionText !== 'string') {
      throw new BadRequestException(
        `Question ${idx + 1} missing valid questionText`,
      );
    }

    // Validate options
    if (!Array.isArray(question.options) || question.options.length < 4) {
      throw new BadRequestException(
        `Question ${idx + 1} must have at least 4 options`,
      );
    }

    const options = question.options
      .slice(0, 4)
      .map((opt) => String(opt).trim())
      .filter((opt) => opt.length > 0);

    if (options.length < 4) {
      throw new BadRequestException(
        `Question ${idx + 1} has invalid or empty options`,
      );
    }

    // Validate correct option index
    const correctIndex = Number(question.correctOptionIndex);
    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      throw new BadRequestException(
        `Question ${idx + 1} has invalid correctOptionIndex (must be 0-3)`,
      );
    }

    return {
      questionText: String(question.questionText).trim(),
      options,
      correctOptionIndex: correctIndex,
      points: Number(question.points) || 1,
      type: String(question.type || 'MCQ'),
    };
  }

  /**
   * Utility: delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
