/* ============================================================
 * Word to Amazon SDS Generator - Type Definitions
 *
 * These types define the core data model for the entire app.
 * They will be extended in later phases as parsing, SDS generation,
 * and ZIP export features are implemented.
 * ============================================================ */

/** 4-step wizard step indices */
export type WizardStep = 1 | 2 | 3 | 4;

/** File upload status */
export type UploadStatus =
  | "idle"
  | "uploading"
  | "ready"
  | "error";

/** Uploaded file metadata */
export interface UploadedFile {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** Upload status */
  status: UploadStatus;
  /** Error message if status === "error" */
  error_message?: string;
  /** Raw File object for later processing */
  file: File;
  /** Timestamp when uploaded */
  uploaded_at: string;
}

/**
 * Parsed SDS data — placeholder.
 * In Phase 2, this will hold structured data extracted from the Word docx.
 */
export interface ParsedSdsData {
  sections: SdsSection[];
}

export interface SdsSection {
  title: string;
  content: string;
}

/**
 * SDS generation settings — placeholder.
 * In Phase 3, this will hold user-configurable SDS generation options.
 */
export interface SdsSettings {
  language: "en" | "zh";
  include_toc: boolean;
  output_format: "pdf" | "zip";
}

/**
 * SDS generation result — placeholder.
 * In Phase 4, this will hold the final output.
 */
export interface SdsResult {
  pdf_url?: string;
  zip_url?: string;
}

/** Default SDS settings */
export const DEFAULT_SDS_SETTINGS: SdsSettings = {
  language: "en",
  include_toc: true,
  output_format: "pdf",
};

/** Application-wide state */
export interface AppState {
  active_step: WizardStep;
  uploaded_file: UploadedFile | null;
  parsed_data: ParsedSdsData | null;
  settings: SdsSettings;
  result: SdsResult | null;
}
