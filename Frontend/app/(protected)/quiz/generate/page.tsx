"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { QuizDifficulty, QuestionType } from "@/lib/enums";
import { AiQuizQuestion, GeneratedQuiz } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import { TagInput } from "@/components/shared/tag-input";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";

export default function AIGeneratePage() {
  const router = useRouter();

  // Step 1: Generate
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(
    QuizDifficulty.MEDIUM,
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 2: Review
  const [generated, setGenerated] = useState<GeneratedQuiz | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<AiQuizQuestion[]>([]);

  // Step 3: Save
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizTags, setQuizTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGenError(null);
      const res = await api.post("/gemini/generate-quiz", {
        topic,
        numQuestions,
        difficulty,
      });
      const data: GeneratedQuiz = res.data;
      setGenerated(data);
      setEditedQuestions([...data.questions]);
      setQuizTitle(data.title);
      setQuizDescription(data.description);
    } catch (err) {
      if (isAxiosError(err)) {
        setGenError(
          err.response?.data?.message || "Failed to generate quiz",
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const removeQuestion = (index: number) => {
    setEditedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<AiQuizQuestion>) => {
    setEditedQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    );
  };

  const handleSave = async () => {
    if (editedQuestions.length === 0) {
      setSaveError("Add at least one question");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      // Transform AI format to Quiz DTO format
      const transformedQuestions = editedQuestions.map((q, i) => ({
        ...q,
        type: q.type as QuestionType,
        displayOrder: i + 1,
      }));

      const res = await api.post("/quizzes", {
        title: quizTitle,
        description: quizDescription || undefined,
        tags: quizTags.length > 0 ? quizTags : undefined,
        questions: transformedQuestions,
      });

      router.push(`/quiz/${res.data.quizId}`);
    } catch (err) {
      if (isAxiosError(err)) {
        setSaveError(err.response?.data?.message || "Failed to save quiz");
      }
    } finally {
      setSaving(false);
    }
  };

  // Step 1: Generate Form
  if (!generated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            AI Quiz Generator
          </h1>
          <p className="mt-1 text-muted-foreground">
            Describe a topic and let Gemini AI create quiz questions for you
          </p>
        </div>

        {genError && <ErrorMessage message={genError} className="mb-6" />}

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/10">
              <Sparkles className="h-6 w-6 text-chart-3" />
            </div>
            <CardTitle className="font-heading">Generate Questions</CardTitle>
            <CardDescription>
              Enter your topic details and AI will generate quiz questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Topic</FieldLabel>
                <FieldDescription>
                  Describe the topic in detail for better results (max 2000 chars)
                </FieldDescription>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="e.g., React Hooks and State Management — including useState, useEffect, useContext, custom hooks, and common patterns"
                  required
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {topic.length}/2000
                </p>
              </Field>

              <Field>
                <FieldLabel>Number of Questions: {numQuestions}</FieldLabel>
                <Slider
                  value={[numQuestions]}
                  onValueChange={([v]) => setNumQuestions(v)}
                  min={1}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>50</span>
                </div>
              </Field>

              <Field>
                <FieldLabel>Difficulty</FieldLabel>
                <div className="flex gap-2">
                  {[
                    { value: QuizDifficulty.EASY, label: "Easy", color: "bg-chart-1/10 text-chart-1" },
                    { value: QuizDifficulty.MEDIUM, label: "Medium", color: "bg-chart-4/10 text-chart-4" },
                    { value: QuizDifficulty.HARD, label: "Hard", color: "bg-destructive/10 text-destructive" },
                  ].map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficulty(d.value)}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                        difficulty === d.value
                          ? `border-transparent ${d.color} ring-2 ring-ring`
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loading className="mr-2" />
                    Generating... (this may take 5-15 seconds)
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Questions
                  </>
                )}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2 & 3: Review + Save
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => {
            setGenerated(null);
            setEditedQuestions([]);
          }}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Generate Again
        </button>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Review Generated Questions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Edit, remove, or reorder questions before saving as a quiz
        </p>
      </div>

      {saveError && <ErrorMessage message={saveError} className="mb-6" />}

      {/* Quiz metadata */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="font-heading">Quiz Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagInput tags={quizTags} onChange={setQuizTags} maxTags={5} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading">
          Questions ({editedQuestions.length})
        </h2>
      </div>

      <div className="space-y-4">
        {editedQuestions.map((q, qi) => (
          <Card key={qi} className="group border-border/50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                  {qi + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <Input
                    value={q.title}
                    onChange={(e) =>
                      updateQuestion(qi, { title: e.target.value })
                    }
                    className="font-medium"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = 
                        (q.correctAnswer === opt && opt !== "") || 
                        (opt === "" && q.correctAnswer === `Option ${oi + 1}`);

                      return (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(qi, { correctAnswer: opt || `Option ${oi + 1}` })
                            }
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              String.fromCharCode(65 + oi)
                            )}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...q.options];
                              const oldOpt = newOpts[oi];
                              newOpts[oi] = e.target.value;
                              
                              const updates: Partial<AiQuizQuestion> = { options: newOpts };
                              if (q.correctAnswer === oldOpt || q.correctAnswer === `Option ${oi + 1}`) {
                                updates.correctAnswer = e.target.value || `Option ${oi + 1}`;
                              }
                              updateQuestion(qi, updates);
                            }}
                            className="h-8 text-sm"
                          />
                      </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {q.points} pt{q.points !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(qi)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setGenerated(null);
            setEditedQuestions([]);
          }}
        >
          Discard & Regenerate
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save as Quiz"}
        </Button>
      </div>
    </div>
  );
}
