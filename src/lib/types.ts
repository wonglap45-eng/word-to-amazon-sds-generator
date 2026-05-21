/* ============================================================
 * Word to Amazon SDS Generator - Type Definitions
 *
 * These types define the core data model for the entire app.
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
  name: string;
  size: number;
  status: UploadStatus;
  error_message?: string;
  file: File;
  uploaded_at: string;
}

/* ───────── Parsed Product / Ingredient Types ───────── */

/** A single ingredient row from the composition table */
export interface Ingredient {
  chemical_composition: string;
  cas_number: string;
  percentage: number | null; // null if not parseable
  percentage_raw: string;    // original text e.g. "82%", "N/A"
}

/** A product extracted from the Word document */
export interface ParsedProduct {
  /** Section number e.g. "3.1" */
  section: string;
  /** Product name e.g. "GOLF GRIP CLEANER" */
  product_name: string;
  /** Extracted ingredient rows */
  ingredients: Ingredient[];
  /** Sum of all valid percentages */
  percentage_total: number;
}

/** Full parse result */
export interface ParsedSdsData {
  products: ParsedProduct[];
  /** Raw text extracted from the document */
  raw_text: string;
  /** Timestamp of parse */
  parsed_at: string;
}

/* ───────── SDS Settings (Phase 3) ───────── */

export interface SdsSettings {
  language: "en" | "zh";
  include_toc: boolean;
  output_format: "pdf" | "zip";
}

export const DEFAULT_SDS_SETTINGS: SdsSettings = {
  language: "en",
  include_toc: true,
  output_format: "pdf",
};

/* ───────── SDS Result (Phase 4) ───────── */

export interface SdsResult {
  pdf_url?: string;
  zip_url?: string;
}

/* ───────── Application State ───────── */

export interface AppState {
  active_step: WizardStep;
  uploaded_file: UploadedFile | null;
  parsed_data: ParsedSdsData | null;
  settings: SdsSettings;
  result: SdsResult | null;
}
