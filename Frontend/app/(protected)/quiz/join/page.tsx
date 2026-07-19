"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSocket, disconnectSocket } from "@/lib/socket";
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
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { LogIn, Clock } from "lucide-react";
import { QuizStartedPayload } from "@/lib/types";

export default function JoinQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const { user } = useAuth();

  const [joinInput, setJoinInput] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [scheduledStart, setScheduledStart] = useState<string | null>(
    null,
  );
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!scheduledStart || !waiting) return;

    const targetTime = new Date(scheduledStart).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdown("Starting...");
        // If the timer hits zero, redirect to the live page immediately.
        // The live page will wait for the quiz_started event if it hasn't fired yet.
        router.push(`/quiz/live/${joinInput}`);
      } else {
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [scheduledStart, waiting]);

  useEffect(() => {
    // If we land here and socket connects, wait for quiz_started
    const socket = getSocket();

    const onQuizStarted = (data: QuizStartedPayload) => {
      console.log("[Join Page] Received quiz_started event!", data);
      router.push(`/quiz/live/${data.sessionId}`);
    };

    socket.on("quiz_started", onQuizStarted);

    return () => {
      socket.off("quiz_started", onQuizStarted);
    };
  }, [router]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput) return;

    setLoading(true);
    setError(null);

    // Note: the backend requires sessionId to join, but users enter a joinCode.
    // For now, as per spec, we assume the user enters the sessionId for testing purposes,
    // or the backend needs to add a lookup endpoint.
    const sessionId = joinInput;

    const socket = getSocket();
    socket.connect();

    socket.emit("joinSession", { sessionId }, (response: any) => {
      setLoading(false);
      // Wait for response format (assuming it might send success)
      if (response && response.error) {
        setError(response.error);
        socket.disconnect();
      } else {
        if (response?.success && response?.data) {
          const { status, scheduledStart: start } = response.data;
          if (status === "SCHEDULED" && start) {
            setScheduledStart(start);
          }
        }
        setWaiting(true);
      }
    });

    // Fallback if no ack is received immediately
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        setWaiting(true); // Proceed to waiting anyway
      }
    }, 2000);
  };

  if (waiting) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-border/50 text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Clock className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-heading">
              Waiting Room
            </CardTitle>
            <CardDescription>
              {countdown
                ? "Quiz begins soon... Waiting for teacher."
                : "You're in! Waiting for the teacher to start the quiz..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {countdown ? (
              <div className="text-5xl font-mono font-bold text-primary mb-6 my-4 tracking-tight">
                {countdown}
              </div>
            ) : (
              <Loading message="Connecting..." />
            )}
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                disconnectSocket();
                setWaiting(false);
                setScheduledStart(null);
                setCountdown(null);
              }}
            >
              Leave Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 lg:px-8">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-heading">
            Join Quiz Session
          </CardTitle>
          <CardDescription>
            Enter the Quiz Code to join the waiting room
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <ErrorMessage message={error} className="mb-4" />}

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              placeholder="Enter Quiz Code..."
              className="text-center text-lg uppercase"
              required
            />
            <Button
              type="submit"
              disabled={loading || !joinInput}
              className="w-full"
            >
              {loading ? "Joining..." : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
