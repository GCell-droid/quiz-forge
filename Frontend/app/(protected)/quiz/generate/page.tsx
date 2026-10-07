"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Sparkles, HardDrive, FileText } from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { QuizDifficulty, QuestionType } from "@/lib/enums";
import type { GeneratedQuiz, CreateQuestionDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { ErrorMessage } from "@/components/shared/error-message";
import { TagInput } from "@/components/shared/tag-input";
import {
  QuestionEditor,
  type EditableQuestion,
} from "@/components/shared/question-editor";
import { type TeacherNote } from "@/components/study-materials/notes-library";
import { NotesStorageModal } from "@/components/study-materials/notes-storage-modal";
import { Badge } from "@/components/ui/badge";
import { GenerationProgress } from "@/components/study-materials/generation-progress";

export default function AIGeneratePage() {
  const router = useRouter();
  const [selectedNotes, setSelectedNotes] = useState<TeacherNote[]>([]);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState(QuizDifficulty.MEDIUM);
  const [gradeLevel, setGradeLevel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const defaultTopic = selectedNotes.length > 0 
        ? `Key concepts from ${selectedNotes.map(n => n.fileName).join(', ')}` 
        : "";
      const finalTopic = topic.trim() || (defaultTopic.length > 250 ? defaultTopic.substring(0, 247) + "..." : defaultTopic);

      const { data } = await api.post<GeneratedQuiz>("/quiz-generations", {
        topic: finalTopic,
        questionCount: numQuestions,
        difficulty,
        ...(gradeLevel.trim() ? { gradeLevel: gradeLevel.trim() } : {}),
        ...(selectedNotes.length > 0 ? { fileIds: selectedNotes.map(n => n.fileId) } : {}),
      });
      setQuestions(
        data.questions.map((question) => ({
          title: question.question,
          options: [
            question.options.A,
            question.options.B,
            question.options.C,
            question.options.D,
          ],
          correctAnswer: question.options[question.correctAnswer],
          type: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          displayOrder: question.id,
          source: question.source,
          explanation: question.explanation,
        })),
      );
      setTitle(data.title);
      setDescription(data.description);
      setGenerated(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Your quiz could not be generated. Please try again.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateQuestionDto[] = questions.map((question, i) => ({
        title: question.title,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
        displayOrder: i + 1,
      }));
      const { data } = await api.post<{ quizId: string }>("/quizzes", {
        title,
        description,
        tags,
        questions: payload,
      });
      router.push(`/quiz/${data.quizId}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Your quiz could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {generated ? "Review your quiz" : "Create a quiz"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {generated
            ? "Review the answers and explanations before sharing with your students."
            : "Turn your study materials and teaching topics into thoughtful questions."}
        </p>
      </div>
      {error && <ErrorMessage message={error} />}
      {!generated ? (
        <>
          {/* Study Materials & Storage Management Card */}
          <Card>
            <CardHeader className="flex flex-col items-start gap-4 pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Study Materials & Grounding</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ground quiz questions in study notes from cloud storage, or generate from general topics.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStorageModal(true)}
                disabled={generating}
                className="w-full"
              >
                <HardDrive className="mr-1.5 h-4 w-4 text-primary" />
                Manage Storage
              </Button>
            </CardHeader>
            <CardContent>
              {selectedNotes.length > 0 ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {selectedNotes.length} {selectedNotes.length === 1 ? "note" : "notes"} selected
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedNotes.reduce((acc, note) => acc + note.size, 0) / (1024 * 1024)).toFixed(1)} MB • Questions will be grounded strictly in these documents
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedNotes([])}
                    >
                      Clear selection
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowStorageModal(true)}
                    >
                      Change notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px] font-normal shrink-0">
                      All Saved Notes
                    </Badge>
                    <span>Searching across all ready notes in your storage for relevant concepts.</span>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-xs p-0 h-auto self-start sm:self-auto text-primary"
                    onClick={() => setShowStorageModal(true)}
                  >
                    Select specific note or manage storage →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <NotesStorageModal
            isOpen={showStorageModal}
            onClose={() => setShowStorageModal(false)}
            selectedNotes={selectedNotes}
            onSelectNotes={setSelectedNotes}
          />
          <Card>
            <CardHeader>
              <CardTitle>Quiz details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void generate();
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="quiz-topic">
                      {selectedNotes.length > 0 ? "Focus topic (optional)" : "Topic"}
                    </FieldLabel>
                    <Input
                      id="quiz-topic"
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      disabled={generating}
                      maxLength={2000}
                      placeholder="e.g., Photosynthesis and plant growth"
                    />
                    <p className="text-xs text-muted-foreground">
                      Relevant saved notes will guide your quiz questions.
                    </p>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="quiz-grade">
                      Grade level (optional)
                    </FieldLabel>
                    <Input
                      id="quiz-grade"
                      value={gradeLevel}
                      onChange={(event) => setGradeLevel(event.target.value)}
                      disabled={generating}
                      maxLength={100}
                      placeholder="e.g., Grade 8"
                    />
                  </Field>
                  <Field>
                    <FieldLabel id="question-count-label">
                      Number of questions: {numQuestions}
                    </FieldLabel>
                    <Slider
                      aria-labelledby="question-count-label"
                      value={[numQuestions]}
                      onValueChange={([value]) => setNumQuestions(value)}
                      min={1}
                      max={50}
                      step={1}
                      disabled={generating}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="quiz-difficulty">
                      Difficulty
                    </FieldLabel>
                    <select
                      id="quiz-difficulty"
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={difficulty}
                      onChange={(event) =>
                        setDifficulty(event.target.value as QuizDifficulty)
                      }
                      disabled={generating}
                    >
                      <option value={QuizDifficulty.EASY}>Easy</option>
                      <option value={QuizDifficulty.MEDIUM}>Medium</option>
                      <option value={QuizDifficulty.HARD}>Hard</option>
                    </select>
                  </Field>
                  <Button
                    type="submit"
                    disabled={
                      generating ||
                      notesBusy ||
                      (selectedNotes.length === 0 && topic.trim().length < 3)
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {generating ? "Preparing your quiz..." : "Generate quiz"}
                  </Button>
                  {generating && <GenerationProgress />}
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardContent className="pt-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="quiz-title">Quiz title</FieldLabel>
                  <Input
                    id="quiz-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="quiz-description">
                    Description
                  </FieldLabel>
                  <Input
                    id="quiz-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Tags</FieldLabel>
                  <TagInput tags={tags} onChange={setTags} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <QuestionEditor questions={questions} onChange={setQuestions} />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setGenerated(false);
                setError(null);
              }}
            >
              Start again
            </Button>
            <Button
              disabled={saving || !title.trim() || !questions.length}
              onClick={() => void save()}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save as quiz"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
