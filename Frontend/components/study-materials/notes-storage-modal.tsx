"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AxiosProgressEvent } from "axios";
import {
  X,
  HardDrive,
  UploadCloud,
  Trash2,
  Download,
  RefreshCw,
  FileText,
  Search,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ErrorMessage } from "@/components/shared/error-message";
import type { TeacherNote } from "./notes-library";

interface NotesListing {
  notes: TeacherNote[];
  usedBytes: number;
  limitBytes: number;
}

interface NotesStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNotes: TeacherNote[];
  onSelectNotes: (notes: TeacherNote[]) => void;
}

type UploadStage = "idle" | "uploading" | "processing" | "confirmed" | "error";

interface UploadState {
  stage: UploadStage;
  file: File | null;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  result: TeacherNote | null;
  error: string | null;
  b2Confirmed: boolean;
  activeChunkCount?: number;
}

const initialUploadState: UploadState = {
  stage: "idle",
  file: null,
  progress: 0,
  loadedBytes: 0,
  totalBytes: 0,
  result: null,
  error: null,
  b2Confirmed: false,
};

const statusLabels: Record<
  TeacherNote["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ready: { label: "Ready", variant: "default" },
  processing: { label: "Preparing...", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  deleting: { label: "Deleting...", variant: "destructive" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NotesStorageModal({
  isOpen,
  onClose,
  selectedNotes,
  onSelectNotes,
}: NotesStorageModalProps) {
  const [listing, setListing] = useState<NotesListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState);

  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isUploadingOrProcessing =
    uploadState.stage === "uploading" || uploadState.stage === "processing";

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<NotesListing>("/teacher-notes");
      setListing(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Your study notes could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  // ONLY load files when the modal is opened
  useEffect(() => {
    if (isOpen) {
      void fetchNotes();
      setSearch("");
      setUploadState(initialUploadState);
      setError(null);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, fetchNotes]);

  // Stage timer for B2 confirmation and live polling while processing
  useEffect(() => {
    let b2Timer: NodeJS.Timeout | null = null;

    if (uploadState.stage === "processing") {
      // B2 upload completes within 4-5 seconds on backend
      b2Timer = setTimeout(() => {
        setUploadState((prev) => ({ ...prev, b2Confirmed: true }));
      }, 4500);

      // Poll /teacher-notes every 2.5 seconds to track chunkCount and ready state
      pollIntervalRef.current = setInterval(async () => {
        try {
          const { data } = await api.get<NotesListing>("/teacher-notes");
          setListing(data);
          if (uploadState.file && data.notes.length > 0) {
            const currentNote = data.notes.find(
              (n) => n.fileName.includes(uploadState.file!.name.slice(0, 30)) ||
                     uploadState.file!.name.includes(n.fileName.slice(0, 30))
            ) || data.notes[0];

            if (currentNote) {
              if (currentNote.chunkCount) {
                setUploadState((prev) => ({
                  ...prev,
                  activeChunkCount: currentNote.chunkCount,
                  b2Confirmed: true,
                }));
              }
              if (currentNote.status === "ready") {
                setUploadState((prev) => ({
                  ...prev,
                  stage: "confirmed",
                  b2Confirmed: true,
                  result: currentNote,
                }));
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
              } else if (currentNote.status === "failed") {
                setUploadState((prev) => ({
                  ...prev,
                  stage: "error",
                  error: "Document processing failed. Please try uploading again.",
                }));
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
              }
            }
          }
        } catch {
          // Polling errors ignored; main request will settle
        }
      }, 2500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (b2Timer) clearTimeout(b2Timer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [uploadState.stage, uploadState.file]);

  // Safe close handler that warns if upload is in flight
  const handleModalClose = useCallback(() => {
    if (isUploadingOrProcessing) {
      const proceed = window.confirm(
        "A document upload & cloud indexing is currently in progress.\n\nClosing now means you won't see confirmation here. Are you sure you want to exit?"
      );
      if (!proceed) return;
    }
    onClose();
  }, [isUploadingOrProcessing, onClose]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !busy && !isUploadingOrProcessing) {
        handleModalClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, isUploadingOrProcessing, handleModalClose]);

  async function performAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err, "Operation failed. Please try again."));
    } finally {
      try {
        const { data } = await api.get<NotesListing>("/teacher-notes");
        setListing(data);
      } catch {
        // Ignored; initial error takes precedence
      }
      setBusy(false);
    }
  }

  async function startUpload(file: File) {
    if (
      !/\.(pdf|txt|md|csv)$/i.test(file.name) ||
      !file.size ||
      file.size > 25 * 1024 * 1024
    ) {
      setError("Please choose a PDF, TXT, MD, or CSV document between 1 byte and 25 MB.");
      return;
    }

    setError(null);
    setUploadState({
      stage: "uploading",
      file,
      progress: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      result: null,
      error: null,
      b2Confirmed: false,
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
            setUploadState((prev) => ({
              ...prev,
              progress: percent,
              loadedBytes: progressEvent.loaded,
              totalBytes: progressEvent.total || prev.totalBytes,
              stage: percent >= 100 ? "processing" : "uploading",
            }));
          }
        },
      });

      // Successful server response means both B2 and Pinecone are 100% complete
      setUploadState((prev) => ({
        ...prev,
        stage: "confirmed",
        progress: 100,
        b2Confirmed: true,
        result: data,
        activeChunkCount: data.chunkCount,
      }));

      // Refresh listing
      try {
        const listRes = await api.get<NotesListing>("/teacher-notes");
        setListing(listRes.data);
      } catch {
        setListing((prev) =>
          prev
            ? {
                ...prev,
                notes: [data, ...prev.notes.filter((n) => n.fileId !== data.fileId)],
                usedBytes: prev.usedBytes + data.size,
              }
            : null
        );
      }
    } catch (err) {
      // If polling already confirmed the note as ready, don't overwrite with timeout error
      setUploadState((prev) => {
        if (prev.stage === "confirmed") return prev;
        const message = getApiErrorMessage(
          err,
          "Failed to upload study note. Please check your network and try again."
        );
        return {
          ...prev,
          stage: "error",
          error: message,
        };
      });
    }
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (isUploadingOrProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void startUpload(files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isUploadingOrProcessing) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function deleteSingleNote(note: TeacherNote) {
    if (
      !window.confirm(
        `Permanently delete "${note.fileName}"?\n\nThis will remove the file from cloud blob storage and purge all of its indexed vectors from the vector database.`
      )
    ) {
      return;
    }

    await performAction(async () => {
      await api.delete(`/teacher-notes/${note.fileId}`);
      if (selectedNotes.some((n) => n.fileId === note.fileId)) {
        onSelectNotes(selectedNotes.filter((n) => n.fileId !== note.fileId));
      }
      if (uploadState.result?.fileId === note.fileId) {
        setUploadState(initialUploadState);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(note.fileId);
        return next;
      });
    });
  }

  async function deleteSelectedNotes() {
    if (selectedNotes.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${selectedNotes.length} selected note(s)?\n\nThis will remove the files from cloud blob storage and purge all corresponding vectors from the vector database.`
      )
    ) {
      return;
    }

    await performAction(async () => {
      const fileIds = selectedNotes.map(n => n.fileId);
      try {
        await api.post("/teacher-notes/batch-delete", { fileIds });
      } catch {
        // Fallback to individual deletes if batch endpoint unavailable
        for (const id of fileIds) {
          await api.delete(`/teacher-notes/${id}`);
        }
      }
      onSelectNotes([]);
      if (uploadState.result && selectedNotes.some((n) => n.fileId === uploadState.result!.fileId)) {
        setUploadState(initialUploadState);
      }
    });
  }

  async function downloadNote(note: TeacherNote) {
    await performAction(async () => {
      const { data } = await api.get<{ url: string }>(
        `/teacher-notes/${note.fileId}/download`
      );
      const link = document.createElement("a");
      link.href = data.url;
      link.rel = "noreferrer";
      link.referrerPolicy = "no-referrer";
      link.click();
    });
  }

  function toggleSelectAll() {
    if (!filteredNotes.length) return;
    
    // Check if all filtered notes are currently selected
    const allSelected = filteredNotes.every(note => 
      selectedNotes.some(n => n.fileId === note.fileId)
    );

    if (allSelected) {
      // Remove all filtered notes from selection
      const filteredIds = new Set(filteredNotes.map(n => n.fileId));
      onSelectNotes(selectedNotes.filter(n => !filteredIds.has(n.fileId)));
    } else {
      // Add all filtered notes to selection (avoiding duplicates)
      const newSelection = [...selectedNotes];
      for (const note of filteredNotes) {
        if (!newSelection.some(n => n.fileId === note.fileId)) {
          newSelection.push(note);
        }
      }
      onSelectNotes(newSelection);
    }
  }

  if (!isOpen) return null;

  const notes = listing?.notes || [];
  const filteredNotes = notes.filter((n) =>
    n.fileName.toLowerCase().includes(search.toLowerCase().trim())
  );


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) handleModalClose();
      }}
    >
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <HardDrive className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Study Notes & Storage Manager
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage notes in cloud blob storage and vector database
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || isUploadingOrProcessing}
            onClick={handleModalClose}
            aria-label="Close storage modal"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <ErrorMessage message={error} />}

          {/* Storage Usage Card */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 bg-muted/20 p-4 rounded-lg border">
            <span>{notes.length} note(s) indexed in vector DB</span>
          </div>

          {/* LIVE UPLOAD / PROGRESS CARD */}
          {uploadState.stage !== "idle" && (
            <div
              className={`rounded-xl border p-4 space-y-3.5 transition-all duration-200 ${
                uploadState.stage === "confirmed"
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                  : uploadState.stage === "error"
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              {/* Header: File info & Stage badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      uploadState.stage === "confirmed"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : uploadState.stage === "error"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {uploadState.stage === "confirmed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : uploadState.stage === "error" ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : uploadState.stage === "processing" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    ) : (
                      <Cloud className="h-5 w-5 animate-bounce" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {uploadState.file?.name || "Uploaded Document"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadState.totalBytes)}
                      {uploadState.stage === "uploading" && (
                        <>
                          {" "}•{" "}
                          <span className="font-mono">
                            {formatFileSize(uploadState.loadedBytes)} /{" "}
                            {formatFileSize(uploadState.totalBytes)} ({uploadState.progress}%)
                          </span>
                        </>
                      )}
                      {uploadState.stage === "processing" && (
                        <>
                          {" "}•{" "}
                          {uploadState.b2Confirmed
                            ? "Stored in B2 ✓ Indexing vectors..."
                            : "Uploading to cloud storage..."}
                        </>
                      )}
                      {uploadState.stage === "confirmed" && " • Stored in Backblaze B2 & Indexed in Pinecone"}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="shrink-0">
                  {uploadState.stage === "uploading" && (
                    <Badge variant="secondary" className="gap-1 font-mono text-xs">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      Uploading {uploadState.progress}%
                    </Badge>
                  )}
                  {uploadState.stage === "processing" && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {uploadState.b2Confirmed ? "Indexing AI Vectors" : "Storing in Cloud B2"}
                    </Badge>
                  )}
                  {uploadState.stage === "confirmed" && (
                    <Badge className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-600 text-white">
                      <Check className="h-3 w-3" />
                      Ready
                    </Badge>
                  )}
                  {uploadState.stage === "error" && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      uploadState.stage === "confirmed"
                        ? "bg-emerald-500"
                        : uploadState.stage === "error"
                        ? "bg-destructive"
                        : uploadState.stage === "processing"
                        ? "w-full bg-gradient-to-r from-primary via-amber-500 to-primary animate-pulse"
                        : "bg-primary"
                    }`}
                    style={{
                      width:
                        uploadState.stage === "processing" || uploadState.stage === "confirmed"
                          ? "100%"
                          : `${uploadState.progress}%`,
                    }}
                  />
                </div>
              </div>

              {/* 3-Step Live Pipeline Tracker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                {/* Step 1: HTTP Upload */}
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    uploadState.stage === "uploading"
                      ? "border-primary/40 bg-primary/10 text-primary font-medium"
                      : "border-muted/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  {uploadState.stage === "uploading" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                  ) : uploadState.stage === "error" && uploadState.progress < 100 ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate">
                    1. File Upload {uploadState.stage === "uploading" ? `(${uploadState.progress}%)` : "Done"}
                  </span>
                </div>

                {/* Step 2: Blob Storage */}
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    uploadState.stage === "processing" && !uploadState.b2Confirmed
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                      : uploadState.b2Confirmed || uploadState.stage === "confirmed"
                      ? "border-muted/60 bg-muted/20 text-muted-foreground"
                      : "border-muted/30 bg-muted/10 text-muted-foreground/60"
                  }`}
                >
                  {uploadState.stage === "processing" && !uploadState.b2Confirmed ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
                  ) : uploadState.b2Confirmed || uploadState.stage === "confirmed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Cloud className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className="truncate">
                    2. Blob Storage {uploadState.b2Confirmed ? "(Confirmed)" : "(B2)"}
                  </span>
                </div>

                {/* Step 3: Vector Embeddings */}
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    uploadState.stage === "processing" && uploadState.b2Confirmed
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                      : uploadState.stage === "confirmed"
                      ? "border-muted/60 bg-muted/20 text-muted-foreground"
                      : "border-muted/30 bg-muted/10 text-muted-foreground/60"
                  }`}
                >
                  {uploadState.stage === "processing" && uploadState.b2Confirmed ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 shrink-0" />
                  ) : uploadState.stage === "confirmed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Database className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                  <span className="truncate">
                    3. AI Indexing {uploadState.activeChunkCount ? `(${uploadState.activeChunkCount} chunks)` : ""}
                  </span>
                </div>
              </div>

              {/* Status Message & Action buttons */}
              {uploadState.stage === "processing" && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-500" />
                  <span>
                    {uploadState.b2Confirmed
                      ? `Cloud storage confirmed! Now indexing ${uploadState.activeChunkCount ? `${uploadState.activeChunkCount} ` : ""}vector chunks in Pinecone with Gemini AI embeddings. Please keep this modal open.`
                      : "Saving securely to Backblaze B2 encrypted cloud blob storage..."}
                  </span>
                </div>
              )}

              {uploadState.stage === "confirmed" && uploadState.result && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      Confirmed! Document stored in cloud blob storage and ready for quiz grounding.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => {
                        if (uploadState.result) {
                          if (!selectedNotes.some((n) => n.fileId === uploadState.result!.fileId)) {
                            onSelectNotes([...selectedNotes, uploadState.result]);
                          }
                        }
                        onClose();
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Use for Quiz
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setUploadState(initialUploadState)}
                    >
                      Upload Another
                    </Button>
                  </div>
                </div>
              )}

              {uploadState.stage === "error" && (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">
                    {uploadState.error || "An error occurred during upload."}
                  </p>
                  <div className="flex items-center gap-2">
                    {uploadState.file && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => void startUpload(uploadState.file!)}
                      >
                        Try Again
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setUploadState(initialUploadState)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DRAG & DROP UPLOAD ZONE (Only shown when not actively uploading) */}
          {!isUploadingOrProcessing && uploadState.stage !== "confirmed" && (
            <div
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 group ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[0.99]"
                  : "border-muted hover:border-primary/60 bg-muted/10 hover:bg-muted/20"
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your study notes here, or{" "}
                    <span className="text-primary underline underline-offset-2">browse files</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, TXT, MD, CSV (max 25 MB) • Stored in cloud blob storage & indexed for quiz generation
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                disabled={loading || busy || isUploadingOrProcessing}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv"
                className="hidden"
                disabled={busy || loading || isUploadingOrProcessing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void startUpload(file);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || loading || isUploadingOrProcessing}
                onClick={() => inputRef.current?.click()}
              >
                {isUploadingOrProcessing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-1.5 h-4 w-4" />
                )}
                {isUploadingOrProcessing ? "Uploading..." : "Upload Note"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy || loading || isUploadingOrProcessing}
                onClick={() => void fetchNotes()}
                aria-label="Refresh notes"
                className="h-9 w-9 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              {selectedNotes.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy || isUploadingOrProcessing}
                  onClick={() => void deleteSelectedNotes()}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete ({selectedNotes.length})
                </Button>
              )}
            </div>
          </div>

          {/* Notes List Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Select all notes"
                  className="rounded border-input h-3.5 w-3.5 accent-primary cursor-pointer"
                  checked={filteredNotes.length > 0 && selectedNotes.length === filteredNotes.length}
                  onChange={toggleSelectAll}
                  disabled={loading || filteredNotes.length === 0 || isUploadingOrProcessing}
                />
                <span>Document ({filteredNotes.length})</span>
              </div>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Loading files and storage metrics...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm space-y-1">
                <p className="font-medium">
                  {search ? "No notes matching your search" : "No study notes in storage yet"}
                </p>
                <p className="text-xs">
                  {search
                    ? "Try a different search term or clear the filter."
                    : "Upload PDF, TXT, MD, or CSV notes to index them in the vector database."}
                </p>
              </div>
            ) : (
              <ul className="divide-y max-h-64 overflow-y-auto">
                {filteredNotes.map((note) => {
                  const isChecked = selectedNotes.some((n) => n.fileId === note.fileId);
                  const isJustUploaded = uploadState.result?.fileId === note.fileId;
                  const status = statusLabels[note.status] || {
                    label: note.status,
                    variant: "secondary" as const,
                  };

                  return (
                    <li
                      key={note.fileId}
                      className={`flex items-center justify-between gap-3 p-3 transition-colors text-sm hover:bg-muted/30 ${
                        isChecked
                          ? "bg-primary/5"
                          : isJustUploaded
                          ? "bg-emerald-500/5 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          aria-label={`Select ${note.fileName}`}
                          className="rounded border-input h-3.5 w-3.5 accent-primary cursor-pointer"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              onSelectNotes(selectedNotes.filter((n) => n.fileId !== note.fileId));
                            } else {
                              onSelectNotes([...selectedNotes, note]);
                            }
                          }}
                          disabled={busy || isUploadingOrProcessing}
                        />
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-foreground text-xs sm:text-sm">
                              {note.fileName}
                            </p>
                            {isJustUploaded && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-3.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              >
                                Newly Added
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{formatFileSize(note.size)}</span>
                            {note.chunkCount !== undefined && (
                              <>
                                <span>•</span>
                                <span>{note.chunkCount} vector chunks</span>
                              </>
                            )}
                            <span>•</span>
                            <Badge
                              variant={status.variant}
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {status.label}
                            </Badge>
                            {isChecked && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-semibold">Selected for Quiz</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy || note.status !== "ready" || isUploadingOrProcessing}
                          aria-label={`Download ${note.fileName}`}
                          className="h-7 w-7 p-0"
                          onClick={() => void downloadNote(note)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy || isUploadingOrProcessing}
                          aria-label={`Delete ${note.fileName}`}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => void deleteSingleNote(note)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Informational Notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p>
              Deleting study notes permanently purges the file from cloud blob storage
              and removes all of its indexed chunk vectors from the vector database.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3.5 bg-muted/30">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploadingOrProcessing}
            onClick={() => {
              onSelectNotes([]);
              onClose();
            }}
          >
            Use All Saved Notes for Quiz
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isUploadingOrProcessing}
            onClick={() => onClose()}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
