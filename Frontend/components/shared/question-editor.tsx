"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { QuestionType } from "@/lib/enums";
import { CreateQuestionDto } from "@/lib/types";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionEditorProps {
  questions: CreateQuestionDto[];
  onChange: (questions: CreateQuestionDto[]) => void;
}

const emptyQuestion: CreateQuestionDto = {
  title: "",
  type: QuestionType.MULTIPLE_CHOICE,
  options: ["", "", "", ""],
  correctAnswer: "",
  points: 1,
  displayOrder: 1,
};

export function QuestionEditor({ questions, onChange }: QuestionEditorProps) {
  const addQuestion = () => {
    onChange([
      ...questions,
      { ...emptyQuestion, displayOrder: questions.length + 1 },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<CreateQuestionDto>) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, ...updates } : q));
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(
      questions
        .filter((_, i) => i !== index)
        .map((q, i) => ({ ...q, displayOrder: i + 1 })),
    );
  };

  const handleTypeChange = (index: number, type: QuestionType) => {
    let options: string[] | null = null;
    let correctAnswer = "";

    if (type === QuestionType.MULTIPLE_CHOICE) {
      options = ["", "", "", ""];
    } else if (type === QuestionType.TRUE_FALSE) {
      options = ["True", "False"];
      correctAnswer = "True";
    }

    updateQuestion(index, { type, options, correctAnswer });
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const q = questions[qIndex];
    const opts = [...(q.options || [])];
    const oldOpt = opts[optIndex];
    opts[optIndex] = value;
    
    const updates: Partial<CreateQuestionDto> = { options: opts };
    
    // Keep the correct answer synced if this option was the selected one
    if (
      q.correctAnswer === oldOpt || 
      q.correctAnswer === `Option ${optIndex + 1}`
    ) {
      updates.correctAnswer = value || `Option ${optIndex + 1}`;
    }
    
    updateQuestion(qIndex, updates);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <Card key={qi} className="relative group">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <CardTitle className="text-base">
                  Question {qi + 1}
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(qi)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <FieldGroup>
              {/* Question text */}
              <Field>
                <FieldLabel>Question Text</FieldLabel>
                <Input
                  value={q.title}
                  onChange={(e) => updateQuestion(qi, { title: e.target.value })}
                  placeholder="Enter the question..."
                />
              </Field>

              {/* Type + Points row */}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <select
                    value={q.type}
                    onChange={(e) =>
                      handleTypeChange(qi, e.target.value as QuestionType)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={QuestionType.MULTIPLE_CHOICE}>
                      Multiple Choice
                    </option>
                    <option value={QuestionType.TRUE_FALSE}>
                      True / False
                    </option>
                    <option value={QuestionType.SHORT_ANSWER}>
                      Short Answer
                    </option>
                  </select>
                </Field>

                <Field>
                  <FieldLabel>Points</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(qi, { points: parseInt(e.target.value) || 1 })
                    }
                  />
                </Field>
              </div>

              {/* Options (MCQ / T-F) */}
              {q.type !== QuestionType.SHORT_ANSWER && q.options && (
                <Field>
                  <FieldLabel>Options</FieldLabel>
                  <div className="space-y-2">
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
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-all",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50",
                            )}
                          >
                            {String.fromCharCode(65 + oi)}
                          </button>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          className="h-9"
                          disabled={q.type === QuestionType.TRUE_FALSE}
                        />
                      </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click a letter to mark it as the correct answer
                  </p>
                </Field>
              )}

              {/* Correct answer for short answer */}
              {q.type === QuestionType.SHORT_ANSWER && (
                <Field>
                  <FieldLabel>Correct Answer</FieldLabel>
                  <Input
                    value={q.correctAnswer || ""}
                    onChange={(e) =>
                      updateQuestion(qi, { correctAnswer: e.target.value })
                    }
                    placeholder="Enter the correct answer..."
                  />
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addQuestion}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  );
}
