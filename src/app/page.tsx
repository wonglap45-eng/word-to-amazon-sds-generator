"use client";

import { useState, useCallback } from "react";
import { FileText, Search, Settings, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepIndicator } from "@/components/step-indicator";
import { FileUpload } from "@/components/file-upload";
import type {
  WizardStep,
  UploadedFile,
  UploadStatus,
} from "@/lib/types";

/* ───── Step metadata ───── */
const STEP_META = [
  { number: 1 as WizardStep, icon: FileText, title: "Upload Word" },
  {
    number: 2 as WizardStep,
    icon: Search,
    title: "Review Parsed Data",
  },
  {
    number: 3 as WizardStep,
    icon: Settings,
    title: "SDS Settings",
  },
  {
    number: 4 as WizardStep,
    icon: Download,
    title: "Generate PDF",
  },
];

/* ───── Placeholder step content for steps 2-4 ───── */
function StepPlaceholder({ step }: { step: WizardStep }) {
  const meta = STEP_META.find((s) => s.number === step)!;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-5">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{meta.title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        This step will be available after the previous step is completed.
      </p>
    </div>
  );
}

/* ───── Main page ───── */
export default function Home() {
  const [active_step, set_active_step] = useState<WizardStep>(1);
  const [uploaded_file, set_uploaded_file] = useState<UploadedFile | null>(
    null
  );
  const [upload_status, set_upload_status] = useState<UploadStatus>("idle");

  /* ── Handlers ── */

  const handle_file_selected = useCallback((file: File) => {
    set_upload_status("uploading");

    // Simulate brief upload delay for UX
    setTimeout(() => {
      set_uploaded_file({
        name: file.name,
        size: file.size,
        status: "ready",
        file,
        uploaded_at: new Date().toISOString(),
      });
      set_upload_status("ready");
    }, 500);
  }, []);

  const handle_file_removed = useCallback(() => {
    set_uploaded_file(null);
    set_upload_status("idle");
    localStorage.removeItem("w2sds_uploaded_file");
  }, []);

  const handle_next = () => {
    if (active_step < 4) {
      set_active_step((active_step + 1) as WizardStep);
    }
  };

  const handle_prev = () => {
    if (active_step > 1) {
      set_active_step((active_step - 1) as WizardStep);
    }
  };

  const handle_step_click = (step: WizardStep) => {
    // Allow clicking completed steps
    if (step <= active_step) {
      set_active_step(step);
    }
  };

  /* ── Render ── */

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <h1 className="text-xl font-bold tracking-tight">
            Word to Amazon SDS Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Convert your Word documents into Amazon-compliant Safety Data Sheets
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator
            current_step={active_step}
            on_step_click={handle_step_click}
          />
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {STEP_META.find((s) => s.number === active_step) && (
                <>
                  {(() => {
                    const Meta =
                      STEP_META.find((s) => s.number === active_step)!;
                    const Icon = Meta.icon;
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {STEP_META.find((s) => s.number === active_step)!.title}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {active_step === 1 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Upload your Word document (.docx) to begin. The document will
                  be parsed and its content will be used to generate an
                  Amazon-compliant Safety Data Sheet (SDS).
                </p>

                <FileUpload
                  on_file_selected={handle_file_selected}
                  on_file_removed={handle_file_removed}
                  current_file={uploaded_file?.file ?? null}
                  status={upload_status}
                />

                {uploaded_file && (
                  <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                    <p>
                      ✅ File stored in browser state — ready for parsing in
                      Step 2.
                    </p>
                    <p>
                      ⚡ Uploaded at:{" "}
                      {new Date(uploaded_file.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {(active_step === 2 ||
              active_step === 3 ||
              active_step === 4) && (
              <StepPlaceholder step={active_step} />
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handle_prev}
            disabled={active_step === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Step {active_step} of 4
            </span>
            <Button
              onClick={handle_next}
              disabled={
                (active_step === 1 && !uploaded_file) || active_step === 4
              }
            >
              {active_step === 4 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p>Word to Amazon SDS Generator &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
