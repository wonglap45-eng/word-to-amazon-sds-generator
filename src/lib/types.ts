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
  is_cas_auto_filled?: boolean; // true if CAS was filled from lookup table
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
  /** Extracted identification info (from application form docs) */
  extracted_info?: {
    product_name?: string;
    manufacturer_name?: string;
    address?: string;
    email?: string;
    telephone?: string;
    /** Physical properties extracted from doc */
    color?: string;
    odor?: string;
    flash_point?: string;
    ph_value?: string;
    appearance?: string;
    brand?: string;
  };
}

/* ───────── SDS Settings ───────── */

/** Kit / supplier information for the SDS header */
export interface SdsKitInfo {
  kit_name: string;
  asin: string;
  supplier_name: string;
  address: string;
  telephone: string;
  email: string;
  emergency_telephone: string;
  issue_date: string;
  version: string;
  report_number_prefix: string;
  /** Product recommended use / intended application */
  recommended_use: string;
  /** Base64 data URL of the company stamp / signature image */
  company_stamp_data_url: string;
}

/** Physical & chemical properties section (Section 9) */
export interface SdsPhysicalProperties {
  appearance: string;
  odor: string;
  odor_threshold: string;
  ph: string;
  melting_point: string;
  boiling_point: string;
  flash_point: string;
  evaporation_rate: string;
  flammability: string;
  explosion_limits: string;
  vapor_pressure: string;
  vapor_density: string;
  relative_density: string;
  solubility: string;
  partition_coefficient: string;
  autoignition_temperature: string;
  decomposition_temperature: string;
  viscosity: string;
}

/** Transport information section (Section 14) */
export interface SdsTransportInfo {
  un_number: string;
  proper_shipping_name: string;
  hazard_class: string;
  packing_group: string;
  environmental_hazard: string;
  special_precautions: string;
}

/** Regulatory information section (Section 15) */
export interface SdsRegulatoryInfo {
  ghs_classification: string;
  us_epa: string;
  california_prop65: string;
  tsca: string;
  eu_clp: string;
  amazon_product_safety: string;
}

/** Complete SDS settings used for PDF generation */
export interface SdsSettings {
  kit_info: SdsKitInfo;
  physical_properties: SdsPhysicalProperties;
  transport_info: SdsTransportInfo;
  regulatory_info: SdsRegulatoryInfo;
}

export const DEFAULT_SDS_SETTINGS: SdsSettings = {
  kit_info: {
    kit_name: "",
    asin: "",
    supplier_name: "",
    address: "",
    telephone: "",
    email: "",
    emergency_telephone: "",
    issue_date: new Date().toISOString().split("T")[0],
    version: "1.0",
    report_number_prefix: "SDS",
    recommended_use: "",
    company_stamp_data_url: "",
  },
  physical_properties: {
    appearance: "Liquid",
    odor: "Odorless",
    odor_threshold: "Not determined",
    ph: "5.5",
    melting_point: "~0°C",
    boiling_point: "~100°C",
    flash_point: "Non-flammable (no flash point)",
    evaporation_rate: "Similar to water",
    flammability: "Non-flammable",
    explosion_limits: "Not applicable",
    vapor_pressure: "Similar to water",
    vapor_density: "Not determined",
    relative_density: "~1.0 g/cm³",
    solubility: "Miscible with water",
    partition_coefficient: "Not determined",
    autoignition_temperature: "Not applicable",
    decomposition_temperature: "Not applicable",
    viscosity: "Aqueous solution; similar to water",
  },
  transport_info: {
    un_number: "Not regulated for transport (UN3077 does not apply)",
    proper_shipping_name: "Not dangerous goods",
    hazard_class: "None",
    packing_group: "Not applicable",
    environmental_hazard: "No (not a marine pollutant)",
    special_precautions: "No special transport precautions required.",
  },
  regulatory_info: {
    ghs_classification: "Not classified as hazardous",
    us_epa: "Complies with Safer Choice criteria (surfactants)",
    california_prop65: "No listed chemicals present",
    tsca: "All components are listed",
    eu_clp: "Not classified as hazardous",
    amazon_product_safety: "Complies with Amazon chemical product requirements",
  },
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
