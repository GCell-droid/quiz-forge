"use client";
import { BookOpen, Lightbulb, Sparkles } from "lucide-react";

const steps = [
  { label: "Reviewing your study materials...", Icon: BookOpen },
  { label: "Extracting core concepts...", Icon: Lightbulb },
  { label: "Drafting quiz questions...", Icon: Sparkles },
];

export function GenerationProgress() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-primary/20 bg-primary/5 p-5"
    >
      <p className="mb-4 text-sm font-medium">
        Preparing your quiz. This may take a moment.
      </p>
      <ul className="space-y-3">
        {steps.map(({ label, Icon }, index) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span
              className="rounded-lg bg-primary/10 p-2 text-primary motion-safe:animate-pulse"
              style={{ animationDelay: `${index * 400}ms` }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
