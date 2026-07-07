import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { QuizStartedPayload, LiveAnswerPayload } from "@/lib/types";
import { TeacherStatsView } from "./teacher-stats-view";

interface TeacherLiveStatsProps {
  quizData: QuizStartedPayload;
  initialAnswers: LiveAnswerPayload[];
}

export function TeacherLiveStats({ quizData, initialAnswers }: TeacherLiveStatsProps) {
  const [answers, setAnswers] = useState<LiveAnswerPayload[]>(initialAnswers || []);
  const [participantCount, setParticipantCount] = useState<number>(1);

  useEffect(() => {
    setAnswers(initialAnswers || []);
  }, [initialAnswers]);

  useEffect(() => {
    const socket = getSocket();

    const handleLiveAnswer = (data: LiveAnswerPayload) => {
      setAnswers((prev) => {
        // Replace existing answer from same user for same question if any, or append
        const filtered = prev.filter(a => !(a.userId === data.userId && a.questionId === data.questionId));
        return [...filtered, data];
      });
    };

    const handleParticipantCount = (data: { count: number }) => {
      setParticipantCount(data.count);
    };

    socket.on("live_answer_submitted", handleLiveAnswer);
    socket.on("participant_count_updated", handleParticipantCount);

    return () => {
      socket.off("live_answer_submitted", handleLiveAnswer);
      socket.off("participant_count_updated", handleParticipantCount);
    };
  }, []);

  return (
    <TeacherStatsView 
      quizData={quizData} 
      answers={answers} 
      participantCount={participantCount} 
      isLive={true} 
    />
  );
}
