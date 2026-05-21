/* ============================================================
 * Word to Amazon SDS Generator - .docx Parser
 *
 * Uses mammoth.js to extract raw text from a .docx file,
 * then applies regex-based parsing to identify product sections
 * and their ingredient composition tables.
 * ============================================================ */

import * as mammoth from "mammoth";
import type { ParsedProduct, ParsedSdsData, Ingredient } from "@/lib/types";

/* ───── Regex patterns ───── */

/**
 * Matches section headers like "3.1 GOLF GRIP CLEANER"
 * Group 1: section number (e.g. "3.1")
 * Group 2: product name (e.g. "GOLF GRIP CLEANER")
 */
const SECTION_RE = /^(\d+\.\d+)\s+(.+)$/im;

/**
 * Matches the composition table header:
 * "Chemical Composition | CAS No. | Percentage"
 * or tab-delimited variant
 */
const TABLE_HEADER_RE =
  /chemical\s*composition\s*[|\t]\s*cas\s*no\.?\s*[|\t]\s*percentage/i;

/**
 * Matches an ingredient row in the table.
 * Format: "Water |  | 82%" or "Water\t\t82%"
 *
 * Group 1: Chemical Composition
 * Group 2: CAS Number (optional, may be empty)
 * Group 3: Percentage string (e.g. "82%", "6.5%", "N/A")
 */
const INGREDIENT_ROW_RE =
  /^([^|\t]+?)\s*[|\t]\s*([^|\t]*?)\s*[|\t]\s*(.+)$/;

/* ───── Helpers ───── */

/** Parse a percentage string like "82%", "6.5%", or "N/A" */
function parse_percentage(raw: string): number | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([\d.]+)\s*%?$/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

/** Try to determine if a line is the section divider (blank line or "---") */
function is_blank_or_divider(line: string): boolean {
  return line.trim() === "" || /^[-=]{3,}$/.test(line.trim());
}

/* ───── Main parsing logic ───── */

/**
 * Extract text content from a .docx file (ArrayBuffer).
 * Uses mammoth.js client-side in the browser.
 */
export async function extract_raw_text(file: File): Promise<string> {
  const array_buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({
    arrayBuffer: array_buffer,
  });
  return result.value;
}

/**
 * Parse raw text into structured product/ingredient data.
 *
 * Strategy:
 * 1. Split text into lines and iterate through.
 * 2. When we encounter a "3.X product_name" line, start a new product.
 * 3. After a product header, look for the table header
 *    "Chemical Composition | CAS No. | Percentage".
 * 4. Once the table header is found, read ingredient rows until
 *    a blank line or next section header.
 */
export function parse_products(raw_text: string): ParsedSdsData {
  const lines = raw_text.split("\n").map((l) => l.trim());
  const products: ParsedProduct[] = [];

  let current_product: ParsedProduct | null = null;
  let in_table = false;
  let table_header_found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Detect section header like "3.1 GOLF GRIP CLEANER" ──
    const section_match = line.match(SECTION_RE);
    if (section_match) {
      // Finalize previous product
      if (current_product) {
        post_process_product(current_product);
        products.push(current_product);
      }

      const section_number = section_match[1];
      const product_name = section_match[2].trim();
      current_product = {
        section: section_number,
        product_name,
        ingredients: [],
        percentage_total: 0,
      };
      in_table = false;
      table_header_found = false;
      continue;
    }

    // Skip if no active product
    if (!current_product) continue;

    // ── Detect table header (only if not already in table) ──
    if (!in_table && TABLE_HEADER_RE.test(line)) {
      in_table = true;
      table_header_found = true;
      continue;
    }

    // ── Read ingredient rows ──
    if (in_table && table_header_found) {
      // Stop conditions: blank line, divider, next section header
      if (is_blank_or_divider(line) || line.match(SECTION_RE)) {
        in_table = false;
        table_header_found = false;
        // Don't consume a section header line - let the top of the
        // loop handle it on the next iteration
        if (line.match(SECTION_RE)) {
          i--; // re-process this line
        }
        continue;
      }

      const ing_match = line.match(INGREDIENT_ROW_RE);
      if (ing_match) {
        const chem_name = ing_match[1].trim();
        const cas_raw = ing_match[2].trim();
        const pct_raw = ing_match[3].trim();

        // Skip if it looks like a totals/notes row
        if (/^total|^sum|^note|^tota/i.test(chem_name)) {
          continue;
        }

        const pct_value = parse_percentage(pct_raw);
        current_product.ingredients.push({
          chemical_composition: chem_name,
          cas_number: cas_raw || "",
          percentage: pct_value,
          percentage_raw: pct_raw,
        });
        continue;
      }

      // If line doesn't match ingredient format and isn't blank,
      // it might be a continuation or note — skip
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

/**
 * Post-process a product: calculate percentage total.
 */
function post_process_product(product: ParsedProduct): void {
  let total = 0;
  for (const ing of product.ingredients) {
    if (ing.percentage !== null) {
      total += ing.percentage;
    }
  }
  // Round to 2 decimal places
  product.percentage_total = Math.round(total * 100) / 100;
}

/**
 * High-level function: read a .docx File and parse it.
 */
export async function parse_docx(file: File): Promise<ParsedSdsData> {
  const raw_text = await extract_raw_text(file);
  return parse_products(raw_text);
}
