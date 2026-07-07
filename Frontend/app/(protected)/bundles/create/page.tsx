"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { isAxiosError } from "axios";
import { BundleVisibility, QuestionType } from "@/lib/enums";
import { CreateQuestionDto } from "@/lib/types";
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
import { TagInput } from "@/components/shared/tag-input";
import { QuestionEditor } from "@/components/shared/question-editor";
import { ErrorMessage } from "@/components/shared/error-message";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function CreateBundlePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<BundleVisibility>(
    BundleVisibility.PRIVATE,
  );
  const [tags, setTags] = useState<string[]>([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tags.length === 0) {
      setError("Please add at least one tag");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filteredQuestions = questions.filter((q) => q.title.trim() !== "");

      await api.post("/quizzes/bundles", {
        title,
        description: description || undefined,
        visibility,
        tags,
        questions: filteredQuestions.length > 0 ? filteredQuestions : undefined,
      });

      router.push("/bundles");
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to create bundle");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/bundles"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bundles
        </Link>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Create Bundle
        </h1>
        <p className="mt-1 text-muted-foreground">
          Build a reusable question bank
        </p>
      </div>

      {error && <ErrorMessage message={error} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Bundle Details</CardTitle>
            <CardDescription>
              Basic information about this question bundle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., JavaScript Fundamentals"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of this bundle..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </Field>

              <Field>
                <FieldLabel>Visibility</FieldLabel>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as BundleVisibility)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={BundleVisibility.PRIVATE}>
                    Private — Only you can see
                  </option>
                  <option value={BundleVisibility.PUBLIC}>
                    Public — Anyone can see
                  </option>
                </select>
              </Field>

              <Field>
                <FieldLabel>Tags</FieldLabel>
                <FieldDescription>
                  Add 1–5 tags to categorize your bundle
                </FieldDescription>
                <TagInput tags={tags} onChange={setTags} maxTags={5} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Questions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold font-heading">
            Questions
          </h2>
          <QuestionEditor questions={questions} onChange={setQuestions} />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/bundles">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Bundle"}
          </Button>
        </div>
      </form>
    </div>
  );
}
