import { useState } from "react";
import { QuizStartedPayload, LiveAnswerPayload } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, Trophy, BarChart3 } from "lucide-react";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

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

  const hasAnswers = chartData.some(data => data.count > 0);

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
    '#3b82f6', // Vibrant Blue
    '#ec4899', // Vibrant Pink
    '#10b981', // Vibrant Emerald
    '#f59e0b', // Vibrant Amber
    '#8b5cf6', // Vibrant Violet
    '#ef4444', // Vibrant Red
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent === 0) return null; // Don't show label if 0%
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const truncateText = (text: string, maxLength: number = 25) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {isLive ? 'Live Stats' : 'Session Stats'}: {quizData.quizTitle}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              {isLive ? (
                <>{participantCount} {participantCount === 1 ? 'participant' : 'participants'} online</>
              ) : (
                <>{leaderboard.length} {leaderboard.length === 1 ? 'participant' : 'participants'}</>
              )}
            </Badge>
            <span className="text-muted-foreground/30">•</span>
            <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 bg-background/50 backdrop-blur-sm">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              {totalAnswers} responses for this question
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-sm py-1.5 px-4 shadow-sm">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <Card className="lg:col-span-7 border-border/50 shadow-lg bg-card/40 backdrop-blur-md flex flex-col overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative z-10 border-b border-border/10 pb-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="uppercase tracking-wider text-[10px] font-semibold bg-background/50">
                {currentQuestion.type.replace("_", " ")}
              </Badge>
            </div>
            <CardTitle className="text-2xl leading-relaxed font-semibold">
              {currentQuestion.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 flex-grow flex flex-col p-6">
            {hasAnswers ? (
              <div className="min-h-[420px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height={420}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={130}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      stroke="transparent"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))', 
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                      formatter={(value: any, name: any) => [`${value} ${value === 1 ? 'response' : 'responses'}`, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '10px', paddingBottom: '10px' }}
                      formatter={(value) => <span title={value} className="text-foreground text-sm font-medium">{truncateText(value, 25)}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground min-h-[420px]">
                <BarChart3 className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">No responses yet</p>
                <p className="text-sm opacity-70">Waiting for participants to answer...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-border/50 shadow-lg bg-card/40 backdrop-blur-md flex flex-col lg:h-[550px]">
          <CardHeader className="border-b border-border/10 pb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-chart-2/10">
                <Trophy className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <CardTitle className="text-xl">Global Leaderboard</CardTitle>
                <CardDescription>Top performers across all questions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto p-0">
            {leaderboard.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 min-h-[300px]">
                <Users className="h-12 w-12 mb-3 opacity-20" />
                <p>No participants on the board yet.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {leaderboard.map((user, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-sm ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-500' :
                        index === 1 ? 'bg-slate-300/30 text-slate-600 dark:text-slate-300' :
                        index === 2 ? 'bg-amber-700/20 text-amber-700 dark:text-amber-500' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-base truncate max-w-[150px]">{user.name}</span>
                    </div>
                    <Badge variant={index < 3 ? "default" : "secondary"} className={`px-3 py-1 text-sm font-semibold ${
                      index === 0 ? 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent' : ''
                    }`}>
                      {user.score} pts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center bg-card border border-border/50 p-4 rounded-xl shadow-sm">
        <Button 
          variant="outline" 
          onClick={handlePrev} 
          disabled={currentQuestionIndex === 0}
          className="gap-2 px-6"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        
        <div className="flex gap-1.5 hidden sm:flex">
          {quizData.questions.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 rounded-full transition-all ${
                idx === currentQuestionIndex ? 'w-6 bg-primary' : 'w-2 bg-primary/20'
              }`} 
            />
          ))}
        </div>

        <Button 
          onClick={handleNext} 
          disabled={currentQuestionIndex === quizData.questions.length - 1}
          className="gap-2 px-6 shadow-md hover:shadow-lg transition-all"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
