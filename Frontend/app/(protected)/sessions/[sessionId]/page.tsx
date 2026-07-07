"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeacherStatsView } from "@/components/session/teacher-stats-view";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

export default function SessionDetailsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const router = useRouter();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await api.get(`/sessions/${sessionId}`);
        if (response.data?.success) {
          setSessionData(response.data.data);
        } else {
          setError("Failed to load session data");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load session details");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  if (loading) return <Loading message="Loading session stats..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!sessionData || !sessionData.quizPayload) return <ErrorMessage message="No quiz data available for this session." />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      
      <TeacherStatsView 
        quizData={sessionData.quizPayload}
        answers={sessionData.initialStats}
        participantCount={0}
        isLive={false}
      />
    </div>
  );
}
