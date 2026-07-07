"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import api from "@/lib/api";
import {
  ArrowLeft,
  Target,
  Trophy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface QuestionResult {
  questionId: string;
  title: string;
  type: string;
  options: any;
  correctAnswer: any;
  pointsPossible: number;
  userResponse: any;
  isCorrect: boolean;
  pointsScored: number;
  timeTakenSecs: number;
}

interface ResultsPayload {
  sessionId: string;
  quizTitle: string;
  totalScore: number;
  totalPossible: number;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
  responses: QuestionResult[];
}

export default function SessionResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [results, setResults] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get(
          `/sessions/${sessionId}/my-results`,
        );
        setResults(response.data);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to load results",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  if (loading)
    return <Loading message="Calculating your results..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!results) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold tracking-tight font-heading text-primary">
          {results.quizTitle}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your Personal Results
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Score
            </CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {results.totalScore}{" "}
              <span className="text-lg text-muted-foreground font-normal">
                / {results.totalPossible}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accuracy
            </CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {results.accuracy}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Correct Answers
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {results.correctCount}{" "}
              <span className="text-lg text-muted-foreground font-normal">
                / {results.totalQuestions}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <h2 className="text-2xl font-bold mb-6 font-heading">
        Question Breakdown
      </h2>
      <div className="space-y-6">
        {results.responses.map((q, index) => (
          <Card
            key={q.questionId}
            className={`overflow-hidden border-l-4 ${q.isCorrect ? "border-l-green-500" : "border-l-red-500"}`}
          >
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-bold border">
                    {index + 1}
                  </span>
                  <div>
                    <CardTitle className="text-lg leading-tight">
                      {q.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {q.pointsPossible} points • {q.timeTakenSecs}s
                      taken
                    </CardDescription>
                  </div>
                </div>
                {q.isCorrect ? (
                  <div className="flex items-center gap-1.5 text-green-600 bg-green-500/10 px-3 py-1 rounded-full text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />+
                    {q.pointsScored} pts
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-600 bg-red-500/10 px-3 py-1 rounded-full text-sm font-medium">
                    <XCircle className="h-4 w-4" />0 pts
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Your Answer
                  </div>
                  <div
                    className={`p-3 rounded-md border ${q.isCorrect ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"}`}
                  >
                    {q.userResponse === null ? (
                      <span className="italic opacity-70">
                        No answer submitted
                      </span>
                    ) : (
                      <span className="font-medium">
                        {q.userResponse}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Correct Answer
                  </div>
                  <div className="p-3 rounded-md border bg-muted/50 font-medium">
                    {q.correctAnswer}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {results.responses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            No responses recorded for this quiz.
          </div>
        )}
      </div>
    </div>
  );
}
