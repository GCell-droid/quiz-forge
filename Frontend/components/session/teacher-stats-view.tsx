import { useState } from "react";
import { QuizStartedPayload, LiveAnswerPayload } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TeacherStatsViewProps {
  quizData: QuizStartedPayload;
  answers: LiveAnswerPayload[];
  participantCount: number;
  isLive?: boolean;
}

export function TeacherStatsView({ quizData, answers, participantCount, isLive = true }: TeacherStatsViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const currentQuestion = quizData.questions[currentQuestionIndex];
  
  // Calculate chart data based on answers for current question
  const currentAnswers = answers.filter(a => a.questionId === currentQuestion.questionId);
  const totalAnswers = currentAnswers.length;

  const chartData = currentQuestion.options?.map(opt => {
    const count = currentAnswers.filter(a => a.response === opt).length;
    return {
      name: opt,
      count,
    };
  }) || [];

  const handleNext = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Compute Leaderboard
  const userScores = new Map<string, { name: string, score: number }>();
  answers.forEach(a => {
    const current = userScores.get(a.userId) || { name: a.userName || 'Unknown', score: 0 };
    if (a.isCorrect) {
      current.score += (a.pointsScored || 0);
    }
    userScores.set(a.userId, current);
  });
  const leaderboard = Array.from(userScores.values()).sort((a, b) => b.score - a.score);

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">
            {isLive ? 'Live Stats' : 'Session Stats'}: {quizData.quizTitle}
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {isLive ? (
                <>{participantCount} {participantCount === 1 ? 'participant' : 'participants'} online</>
              ) : (
                <>{leaderboard.length} {leaderboard.length === 1 ? 'participant' : 'participants'}</>
              )}
            </p>
            <span className="text-muted-foreground/30">•</span>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {totalAnswers} responses for this question
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm py-1 px-3">
          Question {currentQuestionIndex + 1} of {quizData.questions.length}
        </Badge>
      </div>

      <Card className="border-border/50 shadow-md mb-6">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline">{currentQuestion.type.replace("_", " ")}</Badge>
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-md mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-chart-2" />
            <CardTitle className="text-xl leading-relaxed">Global Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          ) : (
            <div className="space-y-4 mt-2">
              {leaderboard.map((user, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border border-border/50 p-4 shadow-sm bg-card/50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <span className="font-medium text-lg">{user.name}</span>
                  </div>
                  <Badge variant="secondary" className="px-3 py-1 text-base">
                    {user.score} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous Question
        </Button>
        <Button variant="outline" onClick={handleNext} disabled={currentQuestionIndex === quizData.questions.length - 1}>
          Next Question <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
