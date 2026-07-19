"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { Quiz } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import {
  FilePlus,
  FileText,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/quizzes");
      setQuizzes(res.data);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to load quizzes");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.quizId !== quizId));
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to delete quiz");
      }
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            My Quizzes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your created quizzes
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quiz/create">
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {loading ? (
        <Loading fullPage message="Loading your quizzes..." />
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold font-heading">
              No quizzes yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first quiz to get started
            </p>
            <Link href="/quiz/create" className="mt-4">
              <Button>
                <FilePlus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.quizId}
              className="group transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/50 flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate font-heading">
                      {quiz.title}
                    </CardTitle>
                    {quiz.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {quiz.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant={
                      quiz.visibility === "PUBLIC" ? "default" : "secondary"
                    }
                    className="ml-2 shrink-0"
                  >
                    {quiz.visibility === "PUBLIC" ? (
                      <Eye className="mr-1 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1 h-3 w-3" />
                    )}
                    {quiz.visibility}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                {quiz.tags && quiz.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {quiz.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>
                    {quiz.quizQuestions?.length || 0} question
                    {(quiz.quizQuestions?.length || 0) !== 1 ? "s" : ""}
                  </span>
                  <span>
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link href={`/quiz/${quiz.quizId}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View / Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuiz(quiz.quizId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
