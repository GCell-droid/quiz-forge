"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { Quiz, CreateQuestionDto } from "@/lib/types";
import { QuestionType } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/field";
import { TagInput } from "@/components/shared/tag-input";
import { Loading } from "@/components/shared/loading";
import { ErrorMessage } from "@/components/shared/error-message";
import {
  ArrowLeft,
  Save,
  Trash2,
  CalendarClock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Edit state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateQuestionDto | null>(null);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/quizzes/${quizId}`);
      setQuiz(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || "");
      setTags(res.data.tags || []);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to load quiz");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveMetadata = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.patch(`/quizzes/${quizId}`, {
        title,
        description: description || undefined,
        tags,
      });
      await fetchQuiz();
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to update quiz");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async () => {
    if (!confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      router.push("/dashboard");
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to delete quiz");
      }
    }
  };

  const deleteQuestion = async (bridgeId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await api.delete(`/quizzes/questions/${bridgeId}`);
      await fetchQuiz();
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to delete question");
      }
    }
  };

  const saveEditQuestion = async (bridgeId: string) => {
    if (!editForm) return;
    try {
      setSaving(true);
      setError(null);
      await api.patch(`/quizzes/questions/${bridgeId}`, editForm);
      setEditingQuestionId(null);
      setEditForm(null);
      await fetchQuiz();
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to update question");
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  if (loading) return <Loading fullPage message="Loading quiz..." />;
  if (!quiz) return <ErrorMessage message={error || "Quiz not found"} />;

  const statusColors: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PUBLISHED: "bg-chart-1/10 text-chart-1",
    ARCHIVED: "bg-muted text-muted-foreground",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight font-heading">
              {quiz.title}
            </h1>
            <Badge className={statusColors[quiz.status] || ""}>
              {quiz.status}
            </Badge>
            <Badge variant="outline">
              {quiz.visibility === "PUBLIC" ? (
                <Eye className="mr-1 h-3 w-3" />
              ) : (
                <EyeOff className="mr-1 h-3 w-3" />
              )}
              {quiz.visibility}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Link href={`/sessions/schedule?quizId=${quizId}`}>
              <Button size="sm">
                <CalendarClock className="mr-2 h-4 w-4" />
                Schedule Session
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteQuiz}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      {/* Metadata Editor */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="font-heading">Quiz Details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Title</FieldLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Field>
            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagInput tags={tags} onChange={setTags} maxTags={5} />
            </Field>
            <Button onClick={saveMetadata} disabled={saving} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Questions */}
      <h2 className="mb-4 text-lg font-semibold font-heading">
        Questions ({quiz.quizQuestions?.length || 0})
      </h2>

      <div className="space-y-3">
        {quiz.quizQuestions?.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-muted-foreground">
              <p className="text-sm">No questions in this quiz</p>
            </CardContent>
          </Card>
        )}
        {quiz.quizQuestions?.map((qq, i) => {
          if (editingQuestionId === qq.id && editForm) {
            return (
              <Card key={qq.id} className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Question</FieldLabel>
                      <Input
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        placeholder="Enter your question..."
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel>Type</FieldLabel>
                        <select
                          value={editForm.type}
                          onChange={(e) => {
                            const type = e.target.value as QuestionType;
                            const options =
                              type === QuestionType.MULTIPLE_CHOICE
                                ? ["", "", "", ""]
                                : type === QuestionType.TRUE_FALSE
                                  ? ["True", "False"]
                                  : null;
                            setEditForm({ ...editForm, type, options });
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value={QuestionType.MULTIPLE_CHOICE}>MCQ</option>
                          <option value={QuestionType.TRUE_FALSE}>True/False</option>
                          <option value={QuestionType.SHORT_ANSWER}>Short Answer</option>
                        </select>
                      </Field>
                      <Field>
                        <FieldLabel>Points</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          value={editForm.points}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              points: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </Field>
                    </div>
                    {editForm.options && (
                      <Field>
                        <FieldLabel>Options</FieldLabel>
                        <div className="space-y-2">
                          {editForm.options.map((opt: string, oi: number) => (
                            <Input
                              key={oi}
                              value={opt}
                              onChange={(e) => {
                                const opts = [...(editForm.options || [])];
                                opts[oi] = e.target.value;
                                setEditForm({ ...editForm, options: opts });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              disabled={editForm.type === QuestionType.TRUE_FALSE}
                            />
                          ))}
                        </div>
                      </Field>
                    )}
                    <Field>
                      <FieldLabel>Correct Answer</FieldLabel>
                      <Input
                        value={editForm.correctAnswer || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            correctAnswer: e.target.value,
                          })
                        }
                        placeholder="Enter the correct answer..."
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEditQuestion(qq.id)} disabled={saving} size="sm">
                        {saving ? "Saving..." : "Save Question"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingQuestionId(null);
                          setEditForm(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={qq.id} className="group border-border/50">
              <CardContent className="flex items-start gap-4 pt-4 pb-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{qq.question.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {qq.question.type.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {qq.question.points} pt{qq.question.points !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {qq.question.options && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(qq.question.options as string[]).map((opt, oi) => (
                        <span
                          key={oi}
                          className={`rounded-md px-2 py-0.5 text-xs ${
                            opt === qq.question.correctAnswer
                              ? "bg-primary/10 text-primary font-medium"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingQuestionId(qq.id);
                      setEditForm({
                        title: qq.question.title,
                        type: qq.question.type as QuestionType,
                        options: qq.question.options,
                        correctAnswer: qq.question.correctAnswer,
                        points: qq.question.points,
                        displayOrder: qq.displayOrder,
                      });
                    }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteQuestion(qq.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
