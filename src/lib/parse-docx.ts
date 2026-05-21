/* ============================================================
 * Word to Amazon SDS Generator - .docx Parser
 *
 * Uses mammoth.js to extract raw text from a .docx file.
 * mammoth outputs each table cell on its own line, so the
 * parser handles line-based format where ingredient rows
 * appear as pairs/spans of (chemical_name) ... (percentage).
 * ============================================================ */

import * as mammoth from "mammoth";
import type { ParsedProduct, ParsedSdsData, Ingredient } from "@/lib/types";

/* ───── Regex patterns ───── */

/**
 * Section header: "3.1 GOLF GRIP CLEANER"
 */
const SECTION_RE = /^(\d+\.\d+)\s+(.+)$/;

/**
 * A line that looks like a percentage value: "82%", "6.5%"
 */
const PCT_LINE_RE = /^[\d.]+\s*%$/;

/**
 * Lines to skip inside a table (Chinese annotations, table headers)
 */
const SKIP_LINES = [
  /^chemical\s*composition/i,
  /^(成分|cas|cas\s*no)/i,
  /^percentage/i,
  /^(百分比)/i,
  /^加起来/i,
  /^composition/i,
  /^information/i,
];

function is_skip_line(line: string): boolean {
  return SKIP_LINES.some((re) => re.test(line));
}

/** Uninterleave blank lines around content */
function is_content_line(line: string): boolean {
  return line.trim() !== "";
}

/* ───── Helpers ───── */

function parse_percentage(raw: string): number | null {
  const match = raw.trim().match(/^([\d.]+)\s*%?$/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

/** Check if a non-blank, non-section line is a CAS number pattern */
function looks_like_cas(text: string): boolean {
  // CAS numbers: digits-dash-digits (e.g. "7732-18-5") or partial
  return /^\d{2,7}-\d{2}-\d$/.test(text.trim());
}

function post_process_product(product: ParsedProduct): void {
  let total = 0;
  for (const ing of product.ingredients) {
    if (ing.percentage !== null) total += ing.percentage;
  }
  product.percentage_total = Math.round(total * 100) / 100;
}

/* ───── Main parsing ───── */

export async function extract_raw_text(file: File): Promise<string> {
  const array_buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({
    arrayBuffer: array_buffer,
  });
  return result.value;
}

/**
 * Parse mammoth raw text into structured products & ingredients.
 *
 * The raw text from mammoth places each table cell on its own line.
 * For a 3-column composition table (Chemical | CAS | Percentage):
 *
 *   [chemical_name]
 *   [blank lines, possibly with CAS if non-empty]
 *   [percentage e.g. "82%"]
 *   [blank lines]
 *   [next chemical_name]
 *   ...
 *
 * Header annotation lines like "成分", "CAS No. 可以不填", "百分比",
 * "加起来要100%" are skipped automatically.
 */
export function parse_products(raw_text: string): ParsedSdsData {
  const lines = raw_text.split("\n");
  const products: ParsedProduct[] = [];

  let current_product: ParsedProduct | null = null;
  let waiting_for_pct = false; // true after we've read a chem name, expecting %
  let pending_chem = "";       // chemical name accumulated while we skip blank/CAS lines
  let pending_cas = "";

  /**
   * Flush the pending ingredient into the current product.
   */
  function flush_pending() {
    if (!current_product || !pending_chem) return;
    const pct_value = parse_percentage(pending_cas || pending_chem);
    // If pending_cas is actually the percentage (no CAS column data),
    // then pending_chem is the name and pending_cas is the % value.
    // If pending_cas is empty, the % might come next.
    // We handle this via the 2-phase waiting_for_pct flag.
    current_product.ingredients.push({
      chemical_composition: pending_chem.trim(),
      cas_number: pending_cas.trim(),
      percentage: null,
      percentage_raw: "",
    });
    pending_chem = "";
    pending_cas = "";
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const line = raw; // keep original for whitespace detection

    // ── Section header ──
    const section_match = trimmed.match(SECTION_RE);
    if (section_match) {
      // Flush any pending ingredient
      if (waiting_for_pct && pending_chem) {
        // The pending item has no percentage — store with null
        if (current_product && !current_product.ingredients.some(
          (ing) => ing.chemical_composition === pending_chem.trim()
        )) {
          current_product.ingredients.push({
            chemical_composition: pending_chem.trim(),
            cas_number: pending_cas.trim(),
            percentage: null,
            percentage_raw: "",
          });
        }
      }
      waiting_for_pct = false;
      pending_chem = "";
      pending_cas = "";

      // Finalize previous product
      if (current_product) {
        post_process_product(current_product);
        products.push(current_product);
      }

      current_product = {
        section: section_match[1],
        product_name: section_match[2].trim(),
        ingredients: [],
        percentage_total: 0,
      };
      continue;
    }

    if (!current_product) continue;

    // ── Skip annotation / header lines ──
    if (is_skip_line(trimmed)) {
      continue;
    }

    // ── Blank line handling ──
    if (!is_content_line(line)) {
      continue;
    }

    // ── Now we have a non-blank, non-skip content line ──
    // It could be: chemical name, CAS number, or percentage

    // Is it a percentage?
    if (PCT_LINE_RE.test(trimmed)) {
      // This is a percentage — associate with pending chemical if we have one
      if (waiting_for_pct && pending_chem) {
        const pct_value = parse_percentage(trimmed);
        current_product.ingredients.push({
          chemical_composition: pending_chem.trim(),
          cas_number: pending_cas.trim(),
          percentage: pct_value,
          percentage_raw: trimmed,
        });
        waiting_for_pct = false;
        pending_chem = "";
        pending_cas = "";
      } else {
        // Percentage without a preceding chemical name — should not happen
        // but store it as a standalone ingredient with empty name
        const pct_value = parse_percentage(trimmed);
        current_product.ingredients.push({
          chemical_composition: "(unknown)",
          cas_number: "",
          percentage: pct_value,
          percentage_raw: trimmed,
        });
      }
      continue;
    }

    // Not a percentage — could be chemical name, CAS, or other content
    if (!waiting_for_pct) {
      // This should be a chemical composition name
      pending_chem = trimmed;
      pending_cas = "";
      waiting_for_pct = true;
    } else {
      // We already have a pending chemical name
      // This line might be a CAS number (between name and %)
      if (looks_like_cas(trimmed) || (!PCT_LINE_RE.test(trimmed) && !pending_cas)) {
        pending_cas = trimmed;
      } else {
        // Might be another chemical name if previous one was already complete
        // Flush the previous one and start new
        if (current_product.ingredients.length === 0 ||
            current_product.ingredients[current_product.ingredients.length - 1]
              .chemical_composition !== pending_chem.trim()) {
          current_product.ingredients.push({
            chemical_composition: pending_chem.trim(),
            cas_number: pending_cas.trim(),
            percentage: null,
            percentage_raw: "",
          });
        }
        pending_chem = trimmed;
        pending_cas = "";
      }
    }
  }

  // Finalize last pending ingredient
  if (waiting_for_pct && pending_chem && current_product) {
    // The last ingredient might be missing its percentage
    if (!current_product.ingredients.some(
      (ing) => ing.chemical_composition === pending_chem.trim()
    )) {
      current_product.ingredients.push({
        chemical_composition: pending_chem.trim(),
        cas_number: pending_cas.trim(),
        percentage: null,
        percentage_raw: "",
      });
    }
  }

  // Finalize last product
  if (current_product) {
    post_process_product(current_product);
    products.push(current_product);
  }

  return {
    products,
    raw_text,
    parsed_at: new Date().toISOString(),
  };
}

export async function parse_docx(file: File): Promise<ParsedSdsData> {
  const raw_text = await extract_raw_text(file);
  return parse_products(raw_text);
}
