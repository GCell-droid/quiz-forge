"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FolderPlus,
  FilePlus,
  Sparkles,
  CalendarClock,
  LogIn,
  LayoutDashboard,
  BookOpen,
  Trophy,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [teacherBundles, setTeacherBundles] = useState<any[]>([]);
  const [teacherQuizzes, setTeacherQuizzes] = useState<any[]>([]);
  const [teacherSessions, setTeacherSessions] = useState<any[]>([]);
  const [loadingTeacherStats, setLoadingTeacherStats] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === "teacher") {
        setLoadingTeacherStats(true);
        Promise.all([
          api.get("/quizzes/bundles"),
          api.get("/quizzes"),
          api.get("/sessions/hosted")
        ])
        .then(([bundlesRes, quizzesRes, sessionsRes]) => {
          setTeacherBundles(bundlesRes.data);
          setTeacherQuizzes(quizzesRes.data);
          setTeacherSessions(sessionsRes.data);
        })
        .catch((err) => console.error("Failed to load teacher stats:", err))
        .finally(() => setLoadingTeacherStats(false));
      } else {
        setLoadingHistory(true);
        api.get("/sessions/history")
          .then((res) => setHistory(res.data))
          .catch((err) => console.error("Failed to load history:", err))
          .finally(() => setLoadingHistory(false));
      }
    }
  }, [user]);

  if (!user) return null;

  const isTeacher = user.role === "teacher";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Welcome back, {user.name} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isTeacher
            ? "Manage your quizzes, bundles, and sessions"
            : "Join quiz sessions and track your performance"}
        </p>
      </div>

      {isTeacher ? (
        /* Teacher Dashboard */
        <div className="space-y-8">
          {/* Quick Actions */}
          <div>
            <h2 className="mb-4 text-lg font-semibold font-heading">
              Quick Actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {[
                {
                  href: "/bundles/create",
                  icon: FolderPlus,
                  title: "Create Bundle",
                  desc: "Build a reusable question bank",
                  color: "text-chart-1",
                  bg: "bg-chart-1/10",
                },
                {
                  href: "/quiz/create",
                  icon: FilePlus,
                  title: "Create Quiz",
                  desc: "Make a quiz from bundles or scratch",
                  color: "text-chart-2",
                  bg: "bg-chart-2/10",
                },
                {
                  href: "/quiz/generate",
                  icon: Sparkles,
                  title: "AI Generate",
                  desc: "Generate questions with Gemini AI",
                  color: "text-chart-3",
                  bg: "bg-chart-3/10",
                },
                {
                  href: "/sessions/schedule",
                  icon: CalendarClock,
                  title: "Schedule Session",
                  desc: "Schedule a live quiz session",
                  color: "text-chart-4",
                  bg: "bg-chart-4/10",
                },
                {
                  href: "/quiz/join",
                  icon: LogIn,
                  title: "Join Session",
                  desc: "Join a quiz as a participant",
                  color: "text-chart-5",
                  bg: "bg-chart-5/10",
                },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="group h-full cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 border-border/50">
                    <CardContent className="pt-6">
                      <div
                        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}
                      >
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <h3 className="font-semibold font-heading group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {action.desc}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="border-border/50 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  My Bundles
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="text-2xl font-bold mb-4">{loadingTeacherStats ? "—" : teacherBundles.length}</div>
                {teacherBundles.length > 0 ? (
                  <div className="space-y-2 mb-4 flex-grow">
                    {teacherBundles.slice(0, 5).map((bundle: any) => (
                      <Link href={`/bundles/${bundle.bundleId}`} key={bundle.bundleId} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md transition-colors group">
                        <span className="truncate pr-2 font-medium group-hover:text-primary">{bundle.title}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground flex-grow mb-4">
                    Create your first bundle to get started
                  </p>
                )}
                <Link
                  href="/bundles"
                  className="text-xs text-primary hover:underline mt-auto"
                >
                  View all bundles →
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quizzes Created
                </CardTitle>
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="text-2xl font-bold mb-4">{loadingTeacherStats ? "—" : teacherQuizzes.length}</div>
                {teacherQuizzes.length > 0 ? (
                  <div className="space-y-2 mb-4 flex-grow">
                    {teacherQuizzes.slice(0, 5).map((quiz: any) => (
                      <Link href={`/quiz/${quiz.quizId}`} key={quiz.quizId} className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md transition-colors group">
                        <span className="truncate pr-2 font-medium group-hover:text-primary">{quiz.title}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground flex-grow mb-4">
                    Create your first quiz to get started
                  </p>
                )}
                <Link
                  href="/quizzes"
                  className="text-xs text-primary hover:underline mt-auto"
                >
                  View all quizzes →
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/50 flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sessions Hosted
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="text-2xl font-bold mb-4">{loadingTeacherStats ? "—" : teacherSessions.length}</div>
                {teacherSessions.length > 0 ? (
                  <div className="space-y-2 mb-4 flex-grow">
                    {teacherSessions.slice(0, 5).map((session: any) => (
                      <Link 
                        href={session.status === 'COMPLETED' ? `/sessions/${session.sessionId}` : `/quiz/live/${session.sessionId}`} 
                        key={session.sessionId} 
                        className="flex justify-between items-center text-sm p-2 hover:bg-muted/50 rounded-md transition-colors group"
                      >
                        <span className="truncate pr-2 font-medium group-hover:text-primary">{session.quiz?.title || 'Session'}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(session.scheduledStart).toLocaleDateString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground flex-grow mb-4">
                    Schedule a session to get started
                  </p>
                )}
                <Link
                  href="/sessions"
                  className="text-xs text-primary hover:underline mt-auto"
                >
                  View all sessions →
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Student Dashboard */
        <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto items-stretch">
          {/* Join Quiz Card */}
          <Card className="border-border/50 shadow-lg flex flex-col justify-center h-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <LogIn className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl font-heading">
                Join a Quiz Session
              </CardTitle>
              <CardDescription>
                Enter the 6-character code shared by your teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="A1B2C3"
                  maxLength={6}
                  className="text-center text-lg font-mono font-semibold tracking-[0.3em] uppercase"
                />
                <Button
                  onClick={() => {
                    if (joinCode.length === 6) {
                      router.push(`/quiz/join?code=${joinCode}`);
                    }
                  }}
                  disabled={joinCode.length !== 6}
                >
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Overview Cards */}
          <Card className="border-border/50 flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-lg font-heading">
                Recent Results
              </CardTitle>
              <CardDescription>
                Your quiz history will appear here
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {loadingHistory ? (
                <div className="flex justify-center py-8 flex-1">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : history.length > 0 ? (
                <>
                  <div className="space-y-4 pt-2 mb-4 flex-1">
                    {history.slice(0, 5).map((item) => (
                      <Link 
                        key={item.sessionId} 
                        href={`/sessions/${item.sessionId}/results`}
                        className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="font-medium font-heading group-hover:text-primary transition-colors">
                            {item.quizTitle}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(item.date).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.score} pts</span>
                          <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                            <Trophy className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/sessions"
                    className="text-sm text-primary hover:underline mt-auto pt-4 block text-center"
                  >
                    View all results →
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground flex-1">
                  <Trophy className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm">No quiz results yet</p>
                  <p className="text-xs">Join a session to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
