"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { QuizStatus, QuizVisibility, QuestionType } from "@/lib/enums";
import { CreateQuestionDto, QuestionBundle } from "@/lib/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagInput } from "@/components/shared/tag-input";
import { QuestionEditor } from "@/components/shared/question-editor";
import { ErrorMessage } from "@/components/shared/error-message";
import { Loading } from "@/components/shared/loading";
import { ArrowLeft, Save, FolderOpen } from "lucide-react";

export default function CreateQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledBundleId = searchParams.get("bundleId");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<QuizStatus>(QuizStatus.DRAFT);
  const [visibility, setVisibility] = useState<QuizVisibility>(
    QuizVisibility.PRIVATE,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"bundle" | "manual">(
    prefilledBundleId ? "bundle" : "manual",
  );

  // Bundle mode
  const [bundleIds, setBundleIds] = useState<string[]>(
    prefilledBundleId ? [prefilledBundleId] : [],
  );
  const [bundles, setBundles] = useState<QuestionBundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);

  // Manual mode
  const [questions, setQuestions] = useState<CreateQuestionDto[]>([
    {
      title: "",
      type: QuestionType.MULTIPLE_CHOICE,
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 1,
      displayOrder: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = async () => {
    try {
      setBundlesLoading(true);
      const res = await api.get("/quizzes/bundles");
      setBundles(res.data);
    } catch {
      // Silently fail
    } finally {
      setBundlesLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const payload: Record<string, unknown> = {
        title,
        description: description || undefined,
        status,
        visibility,
        tags: tags.length > 0 ? tags : undefined,
      };

      if (mode === "bundle") {
        if (bundleIds.length === 0) {
          setError("Please select at least one bundle");
          setLoading(false);
          return;
        }
        payload.bundleIds = bundleIds;
      } else {
        const filtered = questions.filter((q) => q.title.trim() !== "");
        if (filtered.length === 0) {
          setError("Please add at least one question");
          setLoading(false);
          return;
        }
        payload.questions = filtered;
      }

      const res = await api.post("/quizzes", payload);
      router.push(`/quiz/${res.data.quizId}`);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to create quiz");
      }
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Create Quiz
        </h1>
        <p className="mt-1 text-muted-foreground">
          Create a quiz from a bundle or add questions manually
        </p>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quiz Details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Quiz Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Midterm Exam"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as QuizStatus)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={QuizStatus.DRAFT}>Draft</option>
                    <option value={QuizStatus.PUBLISHED}>Published</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel>Visibility</FieldLabel>
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as QuizVisibility)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={QuizVisibility.PRIVATE}>Private</option>
                    <option value={QuizVisibility.PUBLIC}>Public</option>
                  </select>
                </Field>
              </div>
              <Field>
                <FieldLabel>Tags</FieldLabel>
                <TagInput tags={tags} onChange={setTags} maxTags={5} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Questions Source */}
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "bundle" | "manual")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="bundle" className="flex-1">
              <FolderOpen className="mr-2 h-4 w-4" />
              From Bundle
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Manual Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bundle" className="mt-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-heading">
                  Select a Bundle
                </CardTitle>
                <CardDescription>
                  Questions will be copied from the selected bundle
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bundlesLoading ? (
                  <Loading message="Loading bundles..." />
                ) : bundles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bundles found.{" "}
                    <Link href="/bundles/create" className="text-primary underline">
                      Create one first.
                    </Link>
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                    {bundles.map((b) => {
                      const isSelected = bundleIds.includes(b.bundleId);
                      return (
                        <div
                          key={b.bundleId}
                          onClick={() => {
                            if (isSelected) {
                              setBundleIds(bundleIds.filter((id) => id !== b.bundleId));
                            } else {
                              setBundleIds([...bundleIds, b.bundleId]);
                            }
                          }}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/50"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 15 15"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                              >
                                <path
                                  d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                                  fill="currentColor"
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{b.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {b.questions?.length || 0} questions
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <QuestionEditor questions={questions} onChange={setQuestions} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Quiz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
