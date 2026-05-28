"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  Search,
  Settings,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepIndicator } from "@/components/step-indicator";
import { FileUpload } from "@/components/file-upload";
import { ParsedDataEditor, all_products_valid } from "@/components/parsed-data-editor";
import { SdsSettingsForm } from "@/components/sds-settings-form";
import { GenerateSdsView } from "@/components/generate-sds-view";
import { parse_docx } from "@/lib/parse-docx";
import type {
  WizardStep,
  UploadedFile,
  UploadStatus,
  ParsedSdsData,
  SdsSettings,
} from "@/lib/types";
import { DEFAULT_SDS_SETTINGS } from "@/lib/types";

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

/* ───── Parse status ───── */
type ParseStatus =
  | "idle"
  | "parsing"
  | "done"
  | "error";

/* ───── Placeholder for steps 3-4 ───── */
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

/* ───── Parsing spinner ───── */
function ParsingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
      <p className="text-sm font-medium">Parsing document...</p>
      <p className="text-xs text-muted-foreground mt-1">
        Extracting products and ingredient data
      </p>
    </div>
  );
}

/* ───── Parse error display ───── */
function ParseError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 mb-4">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
        Document parsing failed
      </p>
      <p className="text-xs text-muted-foreground max-w-md">{message}</p>
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
  const [parse_status, set_parse_status] = useState<ParseStatus>("idle");
  const [parsed_data, set_parsed_data] = useState<ParsedSdsData | null>(null);
  const [parse_error, set_parse_error] = useState<string>("");
  const [sds_settings, set_sds_settings] = useState<SdsSettings>(DEFAULT_SDS_SETTINGS);

  /* ── Handlers ── */

  const handle_file_selected = useCallback(async (file: File) => {
    set_upload_status("uploading");

    // Set the file info immediately
    set_uploaded_file({
      name: file.name,
      size: file.size,
      status: "ready",
      file,
      uploaded_at: new Date().toISOString(),
    });
    set_upload_status("ready");

    // Automatically start parsing
    set_parse_status("parsing");
    set_parse_error("");

    try {
      const result = await parse_docx(file);
      set_parsed_data(result);
      set_parse_status("done");

      // Auto-fill settings from extracted identification info
      if (result.extracted_info) {
        const ei = result.extracted_info;
        set_sds_settings((prev) => ({
          ...prev,
          kit_info: {
            ...prev.kit_info,
            kit_name: ei.product_name || prev.kit_info.kit_name,
            supplier_name: ei.manufacturer_name || ei.product_name || prev.kit_info.supplier_name,
            address: ei.address || prev.kit_info.address,
            email: ei.email || prev.kit_info.email,
            telephone: ei.telephone || prev.kit_info.telephone,
            emergency_telephone: ei.telephone || prev.kit_info.emergency_telephone,
          },
        }));
      }
    } catch (err) {
      console.error("Parse error:", err);
      set_parse_error(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while parsing the document."
      );
      set_parse_status("error");
    }
  }, []);

  const handle_file_removed = useCallback(() => {
    set_uploaded_file(null);
    set_upload_status("idle");
    set_parse_status("idle");
    set_parsed_data(null);
    set_parse_error("");
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
    if (step <= active_step) {
      set_active_step(step);
    }
  };

  /* ── Editable data change handler ── */
  const handle_data_change = useCallback((data: ParsedSdsData) => {
    set_parsed_data(data);
  }, []);

  /* ── Settings change handler ── */
  const handle_settings_change = useCallback((settings: SdsSettings) => {
    set_sds_settings(settings);
  }, []);

  /* ── Validation on Step 2 ── */
  const step2_valid = parsed_data
    ? all_products_valid(parsed_data.products)
    : false;

  /* ── Determine if Next is enabled for current step ── */
  const next_disabled = (() => {
    if (active_step === 1 && !uploaded_file) return true;
    if (active_step === 1 && parse_status === "parsing") return true;
    if (active_step === 2 && parse_status !== "done") return true;
    if (active_step === 2 && !step2_valid) return true;
    if (active_step === 4) return true;
    return false;
  })();

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
              {(() => {
                const Meta = STEP_META.find(
                  (s) => s.number === active_step
                )!;
                const Icon = Meta.icon;
                return (
                  <>
                    <Icon className="h-5 w-5" />
                    {Meta.title}
                  </>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ── Step 1: Upload ── */}
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

                {/* Parsing status */}
                {parse_status === "parsing" && (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">
                      Parsing document — extracting products and ingredients...
                    </span>
                  </div>
                )}

                {parse_status === "done" && (
                  <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <p>
                      ✅ Parsed{" "}
                      {parsed_data?.products.length ?? 0} product
                      {(parsed_data?.products.length ?? 0) !== 1
                        ? "s"
                        : ""}{" "}
                      successfully. Click <strong>Next</strong> to review the
                      data.
                    </p>
                  </div>
                )}

                {parse_status === "error" && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    <p>
                      ❌ Parsing failed: {parse_error}
                    </p>
                  </div>
                )}

                {uploaded_file && parse_status === "idle" && (
                  <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
                    <p>✅ File stored in browser state.</p>
                    <p>
                      ⚡ Uploaded at:{" "}
                      {new Date(
                        uploaded_file.uploaded_at
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Review Parsed Data ── */}
            {active_step === 2 && parse_status === "parsing" && (
              <ParsingSpinner />
            )}

            {active_step === 2 && parse_status === "error" && (
              <ParseError message={parse_error} />
            )}

            {active_step === 2 && parse_status === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload a document first in Step 1.
                </p>
              </div>
            )}

            {active_step === 2 && parse_status === "done" && parsed_data && (
              <div>
                <p className="text-sm text-muted-foreground mb-6">
                  Review and edit the extracted product data below. All fields
                  are editable. Fix any errors before proceeding.
                </p>
                <ParsedDataEditor
                  data={parsed_data}
                  on_data_change={handle_data_change}
                />
                {!step2_valid && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                    <p className="font-medium mb-1">
                      ⚠️ Validation errors — fix before proceeding:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {parsed_data.products.map((p, i) => {
                        const name_missing = !p.product_name.trim();
                        const no_ings = p.ingredients.length === 0;
                        const total_bad =
                          Math.abs(p.percentage_total - 100) > 0.01;
                        const errors: string[] = [];
                        if (name_missing) errors.push("Product name is empty");
                        if (no_ings) errors.push("No ingredients");
                        if (total_bad)
                          errors.push(
                            `Total is ${p.percentage_total}% (must be 100%)`
                          );
                        return errors.length > 0 ? (
                          <li key={i}>
                            <strong>{p.section}</strong>: {errors.join("; ")}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: SDS Settings ── */}
            {active_step === 3 && (
              <SdsSettingsForm
                settings={sds_settings}
                on_settings_change={handle_settings_change}
              />
            )}

            {/* ── Step 4: Generate PDF ── */}
            {active_step === 4 && parsed_data && (
              <GenerateSdsView
                parsed_data={parsed_data}
                settings={sds_settings}
              />
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
            <Button onClick={handle_next} disabled={next_disabled}>
              {active_step === 4 ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p>
          Word to Amazon SDS Generator &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
