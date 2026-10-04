"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AxiosProgressEvent } from "axios";
import {
  UploadCloud,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Database,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorMessage } from "@/components/shared/error-message";

export interface TeacherNote {
  fileId: string;
  fileName: string;
  size: number;
  chunkCount?: number;
  status: "processing" | "ready" | "failed" | "deleting";
  createdAt: string;
}

interface NotesListing {
  notes: TeacherNote[];
  usedBytes: number;
  limitBytes: number;
}

interface NotesLibraryProps {
  selected: TeacherNote | null;
  onSelect: (note: TeacherNote | null) => void;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}

type UploadStage = "idle" | "uploading" | "processing" | "confirmed" | "error";

interface UploadProgressInfo {
  stage: UploadStage;
  fileName: string;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  chunkCount?: number;
  error?: string;
}

const statusLabels: Record<
  TeacherNote["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ready: { label: "Ready", variant: "default" },
  processing: { label: "Preparing...", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  deleting: { label: "Deleting...", variant: "destructive" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NotesLibrary({
  selected,
  onSelect,
  disabled,
  onBusy,
}: NotesLibraryProps) {
  const [listing, setListing] = useState<NotesListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<UploadProgressInfo | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const { data } = await api.get<NotesListing>("/teacher-notes");
    setListing(data);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get<NotesListing>("/teacher-notes")
      .then(({ data }) => {
        if (active) setListing(data);
      })
      .catch((err: unknown) => {
        if (active)
          setError(getApiErrorMessage(err, "Your notes could not be loaded."));
      });
    return () => {
      active = false;
    };
  }, []);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Your notes could not be updated. Please try again."
        )
      );
    } finally {
      try {
        await refresh();
      } catch (err) {
        setError(
          getApiErrorMessage(
            err,
            "Your storage details could not be refreshed."
          )
        );
      }
      setBusy(false);
      onBusy(false);
    }
  }

  async function upload(file: File) {
    if (
      !/\.(pdf|txt|md|csv)$/i.test(file.name) ||
      !file.size ||
      file.size > 25 * 1024 * 1024
    ) {
      setError(
        "Choose a PDF, TXT, MD, or CSV document between 1 byte and 25 MB."
      );
      return;
    }

    setBusy(true);
    onBusy(true);
    setError(null);
    setUploadInfo({
      stage: "uploading",
      fileName: file.name,
      progress: 0,
      loadedBytes: 0,
      totalBytes: file.size,
    });

    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post<TeacherNote>("/teacher-notes", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percent = Math.min(
              100,
              Math.round((progressEvent.loaded * 100) / progressEvent.total)
            );
            setUploadInfo((prev) =>
              prev
                ? {
                    ...prev,
                    progress: percent,
                    loadedBytes: progressEvent.loaded,
                    totalBytes: progressEvent.total || prev.totalBytes,
                    stage: percent >= 100 ? "processing" : "uploading",
                  }
                : null
            );
          }
        },
      });

      setUploadInfo({
        stage: "confirmed",
        fileName: file.name,
        progress: 100,
        loadedBytes: file.size,
        totalBytes: file.size,
        chunkCount: data.chunkCount,
      });

      onSelect(data);
      await refresh();
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        "Your note could not be uploaded. Please try again."
      );
      setError(msg);
      setUploadInfo({
        stage: "error",
        fileName: file.name,
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        error: msg,
      });
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  const isUploading =
    uploadInfo?.stage === "uploading" || uploadInfo?.stage === "processing";
  const locked = disabled || busy || isUploading;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg">Your study materials</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Refresh study materials"
          disabled={locked}
          onClick={() => void perform(async () => {})}
        >
          <RefreshCw className={`h-4 w-4 ${busy && !isUploading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <ErrorMessage message={error} />}

        {listing ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Storage used</span>
              <span>
                {formatBytes(listing.usedBytes)} / {formatBytes(listing.limitBytes)}
              </span>
            </div>
            <progress
              aria-label="Storage used"
              value={listing.usedBytes}
              max={listing.limitBytes}
              className="h-2 w-full accent-primary"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {error ? "Storage details unavailable" : "Loading your notes..."}
          </p>
        )}

        {/* Live Upload Progress Box */}
        {uploadInfo && uploadInfo.stage !== "idle" && (
          <div
            className={`rounded-lg border p-3 space-y-2.5 text-xs transition-all ${
              uploadInfo.stage === "confirmed"
                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                : uploadInfo.stage === "error"
                ? "border-destructive/30 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate max-w-[200px] text-foreground">
                {uploadInfo.fileName}
              </span>
              {uploadInfo.stage === "uploading" && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin text-primary" />
                  {uploadInfo.progress}%
                </Badge>
              )}
              {uploadInfo.stage === "processing" && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                >
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Storing & Vectorizing...
                </Badge>
              )}
              {uploadInfo.stage === "confirmed" && (
                <Badge className="text-[10px] bg-emerald-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Confirmed
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  uploadInfo.stage === "confirmed"
                    ? "bg-emerald-500 w-full"
                    : uploadInfo.stage === "processing"
                    ? "bg-gradient-to-r from-primary via-amber-500 to-primary animate-pulse w-full"
                    : "bg-primary"
                }`}
                style={{
                  width:
                    uploadInfo.stage === "processing" || uploadInfo.stage === "confirmed"
                      ? "100%"
                      : `${uploadInfo.progress}%`,
                }}
              />
            </div>

            {/* Stage description */}
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              {uploadInfo.stage === "uploading" && (
                <span>
                  Uploading: {formatBytes(uploadInfo.loadedBytes)} / {formatBytes(uploadInfo.totalBytes)} ({uploadInfo.progress}%)
                </span>
              )}
              {uploadInfo.stage === "processing" && (
                <span className="text-amber-600 dark:text-amber-400">
                  Transferred • Storing in cloud blob storage & indexing vector chunks...
                </span>
              )}
              {uploadInfo.stage === "confirmed" && (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Stored in Backblaze B2 & indexed {uploadInfo.chunkCount ? `(${uploadInfo.chunkCount} chunks)` : ""}
                </span>
              )}
              {uploadInfo.stage === "error" && (
                <span className="text-destructive">{uploadInfo.error}</span>
              )}

              {uploadInfo.stage === "confirmed" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={() => setUploadInfo(null)}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept=".pdf,.txt,.md,.csv"
          className="hidden"
          aria-label="Upload study material"
          disabled={locked}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={locked || !listing}
          onClick={() => input.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {uploadInfo?.stage === "uploading"
            ? `Uploading (${uploadInfo.progress}%)... `
            : uploadInfo?.stage === "processing"
            ? "Storing & Vectorizing..."
            : "Upload notes"}
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF, TXT, MD, or CSV, up to 25 MB each. Stored in encrypted cloud blob storage and indexed in AI vector DB.
        </p>

        <button
          type="button"
          disabled={locked}
          aria-pressed={!selected}
          onClick={() => onSelect(null)}
          className={`w-full rounded-lg border p-3 text-left text-sm ${
            !selected ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          Use all saved notes
        </button>

        {listing?.notes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No notes yet. Upload your first study material or generate a quiz from a topic.
          </p>
        )}

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {listing?.notes.map((note) => {
            const isSelected = selected?.fileId === note.fileId;
            const status = statusLabels[note.status] || {
              label: note.status,
              variant: "secondary" as const,
            };

            return (
              <li
                key={note.fileId}
                className={`flex items-center gap-2 rounded-lg border p-3 ${
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left disabled:opacity-60"
                  disabled={locked || note.status !== "ready"}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(note)}
                >
                  <span className="block truncate text-sm font-medium">
                    {note.fileName}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(note.size)}</span>
                    {note.chunkCount !== undefined && (
                      <>
                        <span>•</span>
                        <span>{note.chunkCount} vector chunks</span>
                      </>
                    )}
                    <span>•</span>
                    <Badge variant={status.variant} className="text-[10px] px-1 py-0 h-4">
                      {status.label}
                    </Badge>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={locked || note.status !== "ready"}
                  aria-label={`Download ${note.fileName}`}
                  onClick={() =>
                    void perform(async () => {
                      const { data } = await api.get<{ url: string }>(
                        `/teacher-notes/${note.fileId}/download`
                      );
                      const link = document.createElement("a");
                      link.href = data.url;
                      link.rel = "noreferrer";
                      link.referrerPolicy = "no-referrer";
                      link.click();
                    })
                  }
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={locked}
                  title="Remove note from blob storage and vector database"
                  aria-label={`Delete ${note.fileName}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Permanently delete "${note.fileName}"?\n\nThis will remove the file from cloud blob storage and purge all of its vectors from the vector database.`
                      )
                    ) {
                      void perform(async () => {
                        await api.delete(`/teacher-notes/${note.fileId}`);
                        if (selected?.fileId === note.fileId) onSelect(null);
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
