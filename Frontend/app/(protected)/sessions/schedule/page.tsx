"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { Quiz, QuizSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { ArrowLeft, CalendarClock, Copy, Check } from "lucide-react";

export default function ScheduleSessionPage() {
  const searchParams = useSearchParams();
  const prefilledQuizId = searchParams.get("quizId");

  const [quizId, setQuizId] = useState(prefilledQuizId || "");
  const [scheduledStart, setScheduledStart] = useState("");
  const [timeLimit, setTimeLimit] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state
  const [session, setSession] = useState<QuizSession | null>(null);
  const [copied, setCopied] = useState(false);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  useEffect(() => {
    api
      .get("/quizzes")
      .then((res) => {
        setQuizzes(res.data);
        if (res.data.length > 0 && !prefilledQuizId) {
          setQuizId(res.data[0].quizId);
        }
      })
      .catch((err) => console.error("Failed to load quizzes:", err))
      .finally(() => setLoadingQuizzes(false));
  }, [prefilledQuizId]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quizId) {
      setError("Please enter a Quiz ID");
      return;
    }
    if (!scheduledStart) {
      setError("Please select a start time");
      return;
    }

    if (new Date(scheduledStart).getTime() < Date.now()) {
      setError("Scheduled start time must be in the future");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.post("/sessions/schedule", {
        quizId,
        scheduledStart: new Date(scheduledStart).toISOString(),
        timeLimit,
      });

      setSession(res.data);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(
          err.response?.data?.message || "Failed to schedule session",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (session?.joinCode) {
      navigator.clipboard.writeText(session.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success screen
  if (session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-border/50 shadow-xl text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-1/10">
              <CalendarClock className="h-8 w-8 text-chart-1" />
            </div>
            <CardTitle className="text-2xl font-heading">
              Session Scheduled! 🎉
            </CardTitle>
            <CardDescription>
              Share this code with your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Join Code */}
            <div className="relative mx-auto max-w-xs">
              <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-8 py-6">
                <p className="text-4xl font-bold font-mono tracking-[0.4em] text-primary">
                  {session.joinCode}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="pt-2">
              <Link href={`/quiz/join?code=${session.joinCode}`}>
                <Button className="w-full shadow-md font-semibold">
                  Join Session
                </Button>
              </Link>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground bg-muted/20 p-4 rounded-xl text-left border border-border/50">
              <p className="flex justify-between">
                <strong className="text-foreground">Starts at:</strong>{" "}
                <span>
                  {new Date(session.scheduledStart).toLocaleString()}
                </span>
              </p>
              <p className="flex justify-between">
                <strong className="text-foreground">
                  Time limit:
                </strong>{" "}
                <span>
                  {Math.floor(session.timeLimit / 60)} minutes
                </span>
              </p>
              <p className="flex justify-between">
                <strong className="text-foreground">Status:</strong>{" "}
                <span className="capitalize">{session.status}</span>
              </p>
            </div>

            <Link href="/dashboard" className="block mt-2">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Schedule Session
        </h1>
        <p className="mt-1 text-muted-foreground">
          Set a time for your students to take the quiz
        </p>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      <Card className="border-border/50">
        <CardContent className="pt-6">
          <form onSubmit={handleSchedule}>
            <FieldGroup>
              <Field>
                <FieldLabel>Select Quiz</FieldLabel>
                <FieldDescription>
                  Choose the quiz you want to schedule a session for
                </FieldDescription>
                {loadingQuizzes ? (
                  <div className="flex h-10 items-center text-sm text-muted-foreground">
                    Loading your quizzes...
                  </div>
                ) : quizzes.length > 0 ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select a quiz...
                    </option>
                    {quizzes.map((q: any) => (
                      <option key={q.quizId} value={q.quizId}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      You haven't created any quizzes yet.
                    </p>
                    <Link href="/quiz/create">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                      >
                        Create a Quiz
                      </Button>
                    </Link>
                  </div>
                )}
              </Field>

              <Field>
                <FieldLabel>Start Time</FieldLabel>
                <FieldDescription>
                  When should the quiz go live?
                </FieldDescription>
                <Input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel>
                  Time Limit: {Math.floor(timeLimit / 60)} min{" "}
                  {timeLimit % 60 > 0 ? `${timeLimit % 60}s` : ""}
                </FieldLabel>
                <FieldDescription>
                  Total time students have to complete the quiz
                </FieldDescription>
                <div className="flex gap-3">
                  {[300, 600, 900, 1200, 1800].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeLimit(t)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        timeLimit === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t / 60}m
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(parseInt(e.target.value) || 600)
                  }
                  min={60}
                  className="mt-2"
                  placeholder="Custom (in seconds)"
                />
              </Field>

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                {loading ? "Scheduling..." : "Schedule Session"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
