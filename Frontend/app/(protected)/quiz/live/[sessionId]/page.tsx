"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "@/components/auth/auth-context";
import { QuizStartedPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle, Clock, Users } from "lucide-react";
import { Loading } from "@/components/shared/loading";
import { TeacherLiveStats } from "@/components/session/teacher-live-stats";

export default function LiveQuizPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [quizData, setQuizData] = useState<QuizStartedPayload | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [initialAnswers, setInitialAnswers] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    const socket = getSocket();
    
    // We expect the user to be in the session already, but in case they refreshed:
    if (!socket.connected) {
      socket.connect();
    }
    
    // Always emit joinSession to ensure we get the quiz_started payload
    // if the quiz is already active (the backend will instantly emit it back).
    socket.emit("joinSession", { sessionId }, (response: any) => {
      if (response && response.error) {
        if (response.error === 'Session has ended') {
          setCompleted(true);
        } else {
          setJoinError(response.error);
        }
      } else if (response && response.success) {
        if (response.data?.isCreator) {
          setIsCreator(true);
          if (response.data.initialStats) {
            setInitialAnswers(response.data.initialStats);
          }
        }
        
        if (response.data?.answeredQuestionIds) {
          setAnsweredQuestionIds(response.data.answeredQuestionIds);
        }
      }
    });

    // Usually, the quiz_started event is what gives us the quiz structure.
    // If we land here, the quiz is already active.
    // However, we don't have a GET /sessions/live endpoint, so we rely on catching the quiz_started event.
    socket.on("quiz_started", (data: QuizStartedPayload) => {
      // Set quiz data unconditionally since rooms handle isolation
      setQuizData(data);
      setTimeLeft(data.timeLimit);
      setQuestionStartTime(Date.now());
    });

    socket.on("participant_count_updated", (data: { count: number }) => {
      setParticipantCount(data.count);
    });

    socket.on("session_ended", () => {
      setCompleted(true);
      disconnectSocket();
    });

    return () => {
      socket.off("quiz_started");
      socket.off("participant_count_updated");
      socket.off("session_ended");
      disconnectSocket();
    };
  }, [sessionId]);

  // Handle resuming from answered questions
  useEffect(() => {
    if (quizData && answeredQuestionIds.length > 0) {
      let nextIndex = 0;
      for (let i = 0; i < quizData.questions.length; i++) {
        if (!answeredQuestionIds.includes(quizData.questions[i].questionId)) {
          nextIndex = i;
          break;
        }
      }
      
      // If all questions are answered
      if (nextIndex === 0 && answeredQuestionIds.length === quizData.questions.length) {
        setCompleted(true);
      } else {
        setCurrentQuestionIndex(nextIndex);
      }
    }
  }, [quizData, answeredQuestionIds]);

  // Global timer
  useEffect(() => {
    if (!quizData || completed || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizData, completed, timeLeft]);

  useEffect(() => {
    if (completed && isCreator) {
      router.push(`/sessions/${sessionId}`);
    }
  }, [completed, isCreator, router, sessionId]);

  const handleAnswer = (selectedOption: string) => {
    if (!quizData || !user) return;
    
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    
    setSubmitting(true);
    
    const socket = getSocket();
    socket.emit("submitAnswer", {
      sessionId: quizData.sessionId, // Use actual UUID, not potentially the join code from URL
      questionId: currentQuestion.questionId,
      userId: user.uid,
      response: selectedOption,
      timeTakenSecs: timeTaken,
    }, (ack: any) => {
      setSubmitting(false);
      moveToNextQuestion();
    });
    
    // Fallback if no ack
    setTimeout(() => {
      if (submitting) {
        setSubmitting(false);
        moveToNextQuestion();
      }
    }, 1500);
  };

  const moveToNextQuestion = () => {
    if (!quizData) return;
    
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      setCompleted(true);
    }
  };

  if (joinError) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-6 p-4">
        <Card className="border-border/50 text-center shadow-lg max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive font-heading">
              Failed to Join
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{joinError}</p>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizData) {
    return <Loading fullPage message="Waiting for quiz data..." />;
  }

  if (completed && isCreator) {
    return <Loading fullPage message="Quiz concluded. Redirecting to results..." />;
  }

  if (isCreator) {
    return <TeacherLiveStats quizData={quizData} initialAnswers={initialAnswers} />;
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-border/50 text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-chart-2/10">
              <Trophy className="h-8 w-8 text-chart-2" />
            </div>
            <CardTitle className="text-3xl font-heading">
              Quiz Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              You've answered all questions or the time has run out.
            </p>
            <Button onClick={() => router.push(`/sessions/${sessionId}/results`)} className="w-full">
              View Results
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / quizData.questions.length) * 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Info */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            {quizData.quizTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-mono text-xl font-bold">{participantCount}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-mono text-xl font-bold">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question Card */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">{currentQuestion.type.replace("_", " ")}</Badge>
            <Badge variant="secondary">{currentQuestion.points} Points</Badge>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {currentQuestion.options?.map((opt, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto w-full justify-start whitespace-normal px-6 py-4 text-left text-base"
                onClick={() => handleAnswer(opt)}
                disabled={submitting}
              >
                <span className="mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
