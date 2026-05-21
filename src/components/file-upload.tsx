"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadStatus } from "@/lib/types";

interface FileUploadProps {
  on_file_selected: (file: File) => void;
  on_file_removed: () => void;
  current_file: File | null;
  status: UploadStatus;
}

function format_file_size(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileUpload({
  on_file_selected,
  on_file_removed,
  current_file,
  status,
}: FileUploadProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const [is_dragging, set_is_dragging] = useState(false);

  const handle_file = useCallback(
    (file: File) => {
      // Accept only .docx
      const is_docx =
        file.name.endsWith(".docx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (!is_docx) {
        alert("Please upload a .docx file.");
        return;
      }

      if (file.size === 0) {
        alert("The file is empty. Please upload a valid .docx file.");
        return;
      }

      on_file_selected(file);
    },
    [on_file_selected]
  );

  const handle_drag_over = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    set_is_dragging(true);
  }, []);

  const handle_drag_leave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    set_is_dragging(false);
  }, []);

  const handle_drop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      set_is_dragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handle_file(files[0]);
      }
    },
    [handle_file]
  );

  const handle_input_change = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handle_file(files[0]);
      }
      // Reset input so the same file can be re-selected
      if (input_ref.current) {
        input_ref.current.value = "";
      }
    },
    [handle_file]
  );

  const handle_click = () => {
    input_ref.current?.click();
  };

  const handle_remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    on_file_removed();
  };

  // File already selected – show file info card
  if (current_file) {
    const is_ready = status === "ready";
    const is_error = status === "error";

    return (
      <div className="w-full">
        <div
          className={cn(
            "flex items-center gap-4 rounded-xl border-2 p-5 transition-all",
            is_ready
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
              : is_error
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
              : "border-border bg-card"
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
              is_ready
                ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                : is_error
                ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {is_ready ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : is_error ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <FileText className="h-6 w-6" />
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{current_file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format_file_size(current_file.size)}
              {is_ready && " — Ready for parsing"}
              {status === "uploading" && " — Uploading..."}
              {is_error && " — Error"}
            </p>
          </div>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handle_remove}
            className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // No file – show drop zone
  return (
    <div className="w-full">
      <input
        ref={input_ref}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handle_input_change}
        className="hidden"
      />

      <button
        type="button"
        onClick={handle_click}
        onDragOver={handle_drag_over}
        onDragLeave={handle_drag_leave}
        onDrop={handle_drop}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-all",
          is_dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
            is_dragging
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Upload className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm font-medium">
            {is_dragging
              ? "Drop your file here"
              : "Drag & drop your Word document here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse – only .docx files are accepted
          </p>
        </div>
      </button>
    </div>
  );
}
