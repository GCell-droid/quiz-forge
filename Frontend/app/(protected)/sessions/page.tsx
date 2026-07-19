"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { QuizSession } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-context";
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
  CalendarClock,
  Calendar,
  Trophy,
  Trash2,
  Play
} from "lucide-react";

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const endpoint = user.role === "teacher" ? "/sessions/hosted" : "/sessions/history";
      const res = await api.get(endpoint);
      setSessions(res.data);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to load sessions");
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await api.delete(`/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to delete session");
      }
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  if (!user) return null;

  const isTeacher = user.role === "teacher";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            {isTeacher ? "My Sessions" : "Quiz History"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isTeacher
              ? "Manage your hosted quiz sessions"
              : "View your past quiz results"}
          </p>
        </div>
        {isTeacher && (
          <Link href="/sessions/schedule">
            <Button>
              <CalendarClock className="mr-2 h-4 w-4" />
              Schedule Session
            </Button>
          </Link>
        )}
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {loading ? (
        <Loading fullPage message="Loading sessions..." />
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold font-heading">
              {isTeacher ? "No sessions hosted" : "No quiz history"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTeacher
                ? "Schedule your first quiz session to get started"
                : "Join a session to see your results here"}
            </p>
            {isTeacher && (
              <Link href="/sessions/schedule" className="mt-4">
                <Button>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Schedule Session
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card
              key={session.sessionId}
              className="group transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/50 flex flex-col"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate font-heading">
                      {isTeacher ? session.quiz?.title : session.quizTitle}
                    </CardTitle>
                    {isTeacher && (
                      <CardDescription className="mt-1 truncate font-mono text-xs">
                        Join Code: {session.joinCode}
                      </CardDescription>
                    )}
                  </div>
                  {isTeacher && (
                    <Badge
                      variant={
                        session.status === "COMPLETED"
                          ? "secondary"
                          : session.status === "ACTIVE"
                          ? "default"
                          : "outline"
                      }
                      className="ml-2 shrink-0"
                    >
                      {session.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  {isTeacher ? (
                    <>
                      <span>
                        {new Date(session.scheduledStart).toLocaleDateString()}
                      </span>
                      <span>
                        {new Date(session.scheduledStart).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <Trophy className="h-4 w-4 text-primary" />
                        {session.score} pts
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {isTeacher ? (
                    <>
                      <Link 
                        href={session.status === 'COMPLETED' ? `/sessions/${session.sessionId}` : `/quiz/live/${session.sessionId}`} 
                        className="flex-1"
                      >
                        <Button variant={session.status === 'ACTIVE' ? "default" : "outline"} size="sm" className="w-full">
                          {session.status === 'ACTIVE' ? (
                            <><Play className="mr-2 h-4 w-4" /> Go Live</>
                          ) : (
                            "View Details"
                          )}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSession(session.sessionId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Link href={`/sessions/${session.sessionId}/results`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Results
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
