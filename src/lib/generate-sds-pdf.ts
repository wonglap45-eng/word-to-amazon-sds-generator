/* ============================================================
 * SDS PDF Generator - Professional Layout
 *
 * Built with jsPDF + manual drawing for full control over:
 * - Colored section headers (dark blue)
 * - Light-blue table backgrounds
 * - Proper headers & footers on every page
 * - Image embedding (stamp/signature)
 * ============================================================ */

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { ParsedProduct, SdsSettings } from "@/lib/types";

/* ════════════════════════════════════════════════
   CONSTANTS – Page & Colors
   ════════════════════════════════════════════════ */

const W = 612;
const H = 792;
const M = 40;              // horizontal margin
const HEADER_H = 36;
const FOOTER_H = 28;
const BODY_TOP = HEADER_H + 6;
const BODY_BOTTOM = FOOTER_H + 10;
const CONTENT_W = W - M * 2;

const DARK_BLUE: [number, number, number] = [0.10, 0.23, 0.36];
const LIGHT_BLUE: [number, number, number] = [0.82, 0.90, 0.96];
const LIGHT_BLUE_ALT: [number, number, number] = [0.88, 0.93, 0.97];
const GREEN_BG: [number, number, number] = [0.91, 0.96, 0.91];
const GREEN_TEXT: [number, number, number] = [0.18, 0.49, 0.20];
const RED_TEXT: [number, number, number] = [0.78, 0.16, 0.16];
const GRAY: [number, number, number] = [0.40, 0.40, 0.40];
const BORDER_COLOR: [number, number, number] = [0.65, 0.70, 0.75];

/* ════════════════════════════════════════════════════
   PAGE CONTEXT – manages pages, headers, footers
   ════════════════════════════════════════════════════ */

class PageContext {
  doc: jsPDF;
  y: number;
  page: number;
  totalPages: number;
  productName: string;
  version: string;
  date: string;
  supplier: string;

  constructor(
    doc: jsPDF, productName: string,
    version: string, date: string, supplier: string, totalPages: number
  ) {
    this.doc = doc;
    this.page = 1;
    this.totalPages = totalPages;
    this.productName = productName;
    this.version = version;
    this.date = date;
    this.supplier = supplier;
    this.y = BODY_TOP;
    this.drawHeader();
    this.drawFooter();
  }

  drawHeader() {
    const d = this.doc;
    // Background
    d.setFillColor(...DARK_BLUE);
    d.rect(0, 0, W, HEADER_H, "F");
    // Text
    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold");
    d.setFontSize(9);
    d.text("SAFETY DATA SHEET", M, 14);
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    const pn = this.productName.length > 50 ? this.productName.slice(0, 50) + "..." : this.productName;
    d.text(pn, W / 2, 14, { align: "center" });
    d.setFontSize(7);
    d.text("GHS/UN 16th Edition (2026)", W - M, 14, { align: "right" });
    d.text(`Page ${this.page} of ${this.totalPages}`, W - M, 24, { align: "right" });
    // Bottom line
    d.setDrawColor(...LIGHT_BLUE);
    d.setLineWidth(1.5);
    d.line(M, HEADER_H, W - M, HEADER_H);
  }

  drawFooter() {
    const d = this.doc;
    const y = H - FOOTER_H + 4;
    d.setDrawColor(...LIGHT_BLUE);
    d.setLineWidth(1.5);
    d.line(M, y, W - M, y);
    d.setTextColor(...GRAY);
    d.setFont("helvetica", "normal");
    d.setFontSize(6.5);
    d.text(`Version ${this.version}`, M, y + 10);
    d.text(`Date: ${this.date}`, M + 60, y + 10);
    d.text(`Page ${this.page} of ${this.totalPages}`, W / 2, y + 10, { align: "center" });
    const sup = `Supplier: ${this.supplier}`;
    d.text(sup, W - M, y + 10, { align: "right" });
  }

  addPage() {
    this.page++;
    this.doc.addPage();
    this.y = BODY_TOP;
    this.drawHeader();
    this.drawFooter();
  }

  needSpace(h: number): boolean {
    return this.y + h > H - BODY_BOTTOM;
  }

  ensureSpace(h: number) {
    if (this.needSpace(h)) {
      this.addPage();
    }
  }
}

/* ════════════════════════════════════════════════════
   DRAWING HELPERS
   ════════════════════════════════════════════════════ */

/** Draw a dark-blue section title banner */
function sectionTitle(ctx: PageContext, text: string, nh = 16) {
  ctx.ensureSpace(nh + 6);
  const d = ctx.doc;
  d.setFillColor(...DARK_BLUE);
  d.rect(M, ctx.y, CONTENT_W, nh, "F");
  d.setTextColor(255, 255, 255);
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.text(text, M + 5, ctx.y + nh - 5);
  ctx.y += nh + 5;
}

/** Draw body text */
function bodyText(ctx: PageContext, text: string, fs = 7.5) {
  const d = ctx.doc;
  d.setTextColor(0, 0, 0);
  d.setFont("helvetica", "normal");
  d.setFontSize(fs);
  const lines = d.splitTextToSize(text, CONTENT_W - 4);
  for (const l of lines) {
    ctx.ensureSpace(fs + 4);
    d.text(l, M + 2, ctx.y + fs);
    ctx.y += fs + 3;
  }
}

/** Draw a key-value info table */
function infoTable(ctx: PageContext, items: [string, string][], labelW = 120) {
  const d = ctx.doc;
  const cols = [labelW, CONTENT_W - labelW];
  const rowH = 14;
  ctx.ensureSpace(rowH * items.length + 4);

  for (let i = 0; i < items.length; i++) {
    const [k, v] = items[i];
    const ry = ctx.y;
    // Label cell
    d.setFillColor(...LIGHT_BLUE);
    d.rect(M, ry, cols[0], rowH, "F");
    d.setDrawColor(...BORDER_COLOR);
    d.setLineWidth(0.3);
    d.rect(M, ry, cols[0], rowH, "S");
    d.setTextColor(0, 0, 0);
    d.setFont("helvetica", "bold");
    d.setFontSize(7);
    d.text(k, M + 4, ry + 9);
    // Value cell
    d.setFillColor(255, 255, 255);
    d.rect(M + cols[0], ry, cols[1], rowH, "F");
    d.rect(M + cols[0], ry, cols[1], rowH, "S");
    d.setFont("helvetica", "normal");
    d.text(v || "—", M + cols[0] + 4, ry + 9);
    ctx.y += rowH;
  }
  ctx.y += 4;
}

/** Draw a multi-column data table */
function dataTable(
  ctx: PageContext,
  headers: string[],
  rows: string[][],
  colW: number[],
  opts?: { highlightTotal?: boolean }
) {
  const d = ctx.doc;
  const rowH = 14;
  const tblW = colW.reduce((a, b) => a + b, 0);

  ctx.ensureSpace(rowH * (rows.length + 1) + 8);

  // Header row
  d.setFillColor(...LIGHT_BLUE);
  let x = M;
  for (let c = 0; c < headers.length; c++) {
    d.rect(x, ctx.y, colW[c], rowH, "F");
    d.setDrawColor(...BORDER_COLOR);
    d.setLineWidth(0.3);
    d.rect(x, ctx.y, colW[c], rowH, "S");
    d.setTextColor(0, 0, 0);
    d.setFont("helvetica", "bold");
    d.setFontSize(7);
    d.text(headers[c], x + 3, ctx.y + 9);
    x += colW[c];
  }
  ctx.y += rowH;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    x = M;
    const isTotal = opts?.highlightTotal && r === rows.length - 1;
    for (let c = 0; c < rows[r].length; c++) {
      d.setFillColor(isTotal ? LIGHT_BLUE[0] : 255, isTotal ? LIGHT_BLUE[1] : 255, isTotal ? LIGHT_BLUE[2] : 255);
      d.rect(x, ctx.y, colW[c], rowH, "F");
      d.setDrawColor(...BORDER_COLOR);
      d.setLineWidth(0.3);
      d.rect(x, ctx.y, colW[c], rowH, "S");
      d.setTextColor(isTotal ? DARK_BLUE[0] : 0, isTotal ? DARK_BLUE[1] : 0, isTotal ? DARK_BLUE[2] : 0);
      d.setFont("helvetica", isTotal ? "bold" : "normal");
      d.setFontSize(7);
      d.text(rows[r][c], x + 3, ctx.y + 9);
      x += colW[c];
    }
    ctx.y += rowH;
  }
  ctx.y += 6;
}

/* ════════════════════════════════════════════════════
   SECTION 1 — First Page (Identification)
   ════════════════════════════════════════════════════ */

function renderPage1(ctx: PageContext, product: ParsedProduct, settings: SdsSettings) {
  const d = ctx.doc;
  const ki = settings.kit_info;
  let y = ctx.y + 20;

  // Big title
  d.setFont("helvetica", "bold");
  d.setFontSize(20);
  d.setTextColor(...DARK_BLUE);
  d.text("SAFETY DATA SHEET", W / 2, y, { align: "center" });
  y += 22;
  d.setDrawColor(...DARK_BLUE);
  d.setLineWidth(0.5);
  d.line(M + 20, y, W - M - 20, y);
  y += 14;

  // Report info bar
  d.setFillColor(...LIGHT_BLUE);
  d.rect(M, y, CONTENT_W, 24, "F");
  d.setFont("helvetica", "normal");
  d.setFontSize(8);
  d.setTextColor(0, 0, 0);
  const rpt = `${ki.report_number_prefix}-${product.section.replace(".", "")}`;
  d.text(`Report No.:  ${rpt}    |    Date:  ${ki.issue_date}    |    Version: ${ki.version}`, M + 8, y + 16);
  y += 34;

  // ── SECTION 1 ──
  ctx.y = y;
  sectionTitle(ctx, "SECTION 1 — Identification of the Substance / Mixture and the Company / Undertaking");

  const addr = ki.address.trim();
  const tel = ki.telephone.trim();
  const eml = ki.email.trim();
  const etel = ki.emergency_telephone.trim();

  // Show "—" only if truly empty
  const av = (v: string) => v || "—";
  const items: [string, string][] = [
    ["Product Name", product.product_name],
    ["ASIN", ki.asin],
    ["Kit Name", ki.kit_name],
    ["Recommended Use", "Golf club cleaning solution"],
    ["Supplier Name", ki.supplier_name],
    ["Address", addr || "(not specified)"],
    ["Telephone", tel || "(not specified)"],
    ["Email", eml || "(not specified)"],
    ["Emergency Telephone", etel || "(not specified)"],
  ];
  infoTable(ctx, items);

  // Stamp image (right side of page 1, top area)
  if (ki.company_stamp_data_url) {
    try {
      const parts = ki.company_stamp_data_url.split(",");
      if (parts.length === 2) {
        // Place top-right corner of the page, above section 1
        const imgW = 80;
        const imgH = 40;
        const imgX = W - M - imgW;
        const imgY = 100;
        // Add white background behind stamp
        d.setFillColor(255, 255, 255);
        d.rect(imgX - 2, imgY - 2, imgW + 4, imgH + 4, "F");
        d.setDrawColor(...BORDER_COLOR);
        d.setLineWidth(0.3);
        d.rect(imgX - 2, imgY - 2, imgW + 4, imgH + 4, "S");
        d.addImage(parts[1], "PNG", imgX, imgY, imgW, imgH);
      }
    } catch { /* skip if image fails */ }
  }

  // ── SECTION 2 ──
  sectionTitle(ctx, "SECTION 2 — Hazard Identification");

  // Green "NOT CLASSIFIED" banner
  d.setFillColor(...GREEN_BG);
  d.setDrawColor(...GREEN_TEXT);
  d.setLineWidth(1);
  d.rect(M, ctx.y, CONTENT_W, 18, "FD");
  d.setTextColor(...GREEN_TEXT);
  d.setFont("helvetica", "bold");
  d.setFontSize(9);
  d.text("NOT CLASSIFIED AS HAZARDOUS    —    GHS/UN Compliant", M + 10, ctx.y + 12);
  ctx.y += 22;

  // GHS table
  dataTable(ctx,
    ["Category", "Description"],
    [
      ["GHS Classification", "Not classified as hazardous"],
      ["Hazard Symbols", "None"],
      ["Signal Word", "None"],
      ["Hazard Statements", "None"],
      ["Precautionary Statements", "None (general handling only)"],
    ],
    [120, CONTENT_W - 120]
  );
}

/* ════════════════════════════════════════════════════
   SECTION 3 — Composition / Ingredients
   ════════════════════════════════════════════════════ */

function renderSection3(ctx: PageContext, product: ParsedProduct) {
  sectionTitle(ctx, "SECTION 3 — Composition / Information on Ingredients");

  dbtxt(ctx, `Product Name: ${product.product_name}`, 0, CONTENT_W, 7);
  ctx.y += 1;

  const rows = product.ingredients.map((ing, i) => [
    String(i + 1),
    ing.chemical_composition,
    ing.cas_number || "N/A",
    ing.percentage !== null ? `${ing.percentage}%` : (ing.percentage_raw || "—"),
  ]);

  dataTable(ctx,
    ["#", "Chemical Composition", "CAS No.", "Percentage"],
    rows,
    [24, 234, 110, 70]
  );

  // Total row
  const d = ctx.doc;
  d.setFont("helvetica", "bold");
  d.setFontSize(7);
  d.setTextColor(...DARK_BLUE);
  d.text(`Total: ${product.percentage_total}%`, W - M, ctx.y, { align: "right" });
  ctx.y += 12;
}

/* ════════════════════════════════════════════════════
   SECTIONS 4-6 — Standard info tables
   ════════════════════════════════════════════════════ */

function sectionKVTable(ctx: PageContext, title: string, rows: [string, string][]) {
  sectionTitle(ctx, title);
  infoTable(ctx, rows, 105);
}

function dbtxt(ctx: PageContext, text: string, x0: number, w: number, fs = 7) {
  const d = ctx.doc;
  d.setTextColor(0, 0, 0);
  d.setFont("helvetica", "normal");
  d.setFontSize(fs);
  const lines = d.splitTextToSize(text, w);
  for (const l of lines) {
    ctx.ensureSpace(fs + 4);
    d.text(l, M + x0 + 2, ctx.y + fs);
    ctx.y += fs + 2.5;
  }
}

function renderSectionN(ctx: PageContext, title: string, lines: string[]) {
  sectionTitle(ctx, title);
  ctx.y += 1;
  for (const line of lines) {
    dbtxt(ctx, line, 0, CONTENT_W, 7);
    ctx.y += 1;
  }
}

/* ════════════════════════════════════════════════════
   GENERATE SINGLE PRODUCT SDS (7 pages)
   ════════════════════════════════════════════════════ */

function generate_product_sds_pdf(product: ParsedProduct, settings: SdsSettings): jsPDF {
  const ki = settings.kit_info;
  const pp = settings.physical_properties;
  const ti = settings.transport_info;
  const ri = settings.regulatory_info;

  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const ctx = new PageContext(
    doc, product.product_name,
    ki.version, ki.issue_date, ki.supplier_name,
    7
  );

  // ── PAGE 1: Sections 1 + 2 ──
  renderPage1(ctx, product, settings);

  // ── PAGE 2: Sections 3 + 4 ──
  ctx.addPage();
  renderSection3(ctx, product);
  sectionKVTable(ctx, "SECTION 4 — First-Aid Measures", [
    ["Eye Contact", "Rinse with water for 15 minutes. Remove contacts. Seek medical attention if irritation persists."],
    ["Skin Contact", "Wash with soap and water. Remove contaminated clothing."],
    ["Inhalation", "Move to fresh air. If symptoms occur, seek medical attention."],
    ["Ingestion", "Rinse mouth with water. Do not induce vomiting. Seek medical attention."],
  ]);

  // ── PAGE 3: Sections 5 + 6 + 7 ──
  ctx.addPage();
  sectionKVTable(ctx, "SECTION 5 — Fire-Fighting Measures", [
    ["Suitable Extinguishing Media", "Water spray, dry chemical, foam, CO₂."],
    ["Unsuitable Media", "None known."],
    ["Specific Hazards", "Non-flammable. No hazardous combustion products."],
    ["Firefighting Equipment", "Self-contained breathing apparatus, full protective clothing."],
  ]);
  sectionKVTable(ctx, "SECTION 6 — Accidental Release Measures", [
    ["Personal Precautions", "Avoid direct contact. Wear appropriate PPE."],
    ["Environmental Precautions", "Prevent entry into drains and waterways. Use absorbent for containment."],
    ["Cleanup Procedures", "Absorb with inert material. Collect in containers. Wash area with water."],
  ]);
  sectionKVTable(ctx, "SECTION 7 — Handling and Storage", [
    ["Handling", "Use with good industrial hygiene. Avoid skin/eye contact. Keep container closed."],
    ["Storage", "Store in a cool, dry, well-ventilated area between 5°C and 40°C. Protect from freezing."],
    ["Incompatible Materials", "Strong oxidizing agents, strong acids, strong bases."],
  ]);

  // ── PAGE 4: Sections 8 ──
  ctx.addPage();
  sectionKVTable(ctx, "SECTION 8 — Exposure Controls / Personal Protection", [
    ["Engineering Controls", "General ventilation is sufficient."],
    ["Eye Protection", "Safety glasses with side shields."],
    ["Skin Protection", "Impervious gloves (nitrile recommended). Standard work clothing."],
    ["Respiratory Protection", "Not required under normal use conditions."],
    ["Hygiene Measures", "Wash hands after handling. No eating/drinking/smoking during use."],
    ["Occupational Exposure Limits", "Not established for this mixture."],
  ]);

  // ── PAGE 5: Section 9 (Physical Properties table) ──
  ctx.addPage();
  sectionKVTable(ctx, "SECTION 9 — Physical and Chemical Properties", [
    ["Appearance", pp.appearance],
    ["Odor", pp.odor],
    ["Odor Threshold", pp.odor_threshold],
    ["pH", pp.ph],
    ["Melting Point / Freezing Point", pp.melting_point],
    ["Initial Boiling Point / BP Range", pp.boiling_point],
    ["Flash Point", pp.flash_point],
    ["Evaporation Rate", pp.evaporation_rate],
    ["Flammability", pp.flammability],
    ["Upper / Lower Explosion Limits", pp.explosion_limits],
    ["Vapor Pressure", pp.vapor_pressure],
    ["Vapor Density", pp.vapor_density],
    ["Relative Density", pp.relative_density],
    ["Solubility", pp.solubility],
    ["Partition Coefficient", pp.partition_coefficient],
    ["Autoignition Temperature", pp.autoignition_temperature],
    ["Decomposition Temperature", pp.decomposition_temperature],
    ["Viscosity", pp.viscosity],
  ]);

  // ── PAGE 6: Sections 10 + 11 + 12 + 13 ──
  ctx.addPage();
  renderSectionN(ctx, "SECTION 10 — Stability and Reactivity", [
    "Reactivity: No dangerous reactions known under normal conditions.",
    "Chemical Stability: Stable under normal ambient and storage conditions.",
    "Hazardous Reactions: None under normal processing.",
    "Conditions to Avoid: Extreme temperatures, freezing, direct sunlight.",
    "Incompatible Materials: Strong oxidizers, strong acids, strong bases.",
    "Hazardous Decomposition Products: None known. Thermal decomposition may produce carbon oxides.",
  ]);
  renderSectionN(ctx, "SECTION 11 — Toxicological Information", [
    "Acute Toxicity: Not classified. No acute toxicity hazards under GHS.",
    "Skin Corrosion/Irritation: May cause mild irritation on prolonged contact.",
    "Eye Damage/Irritation: May cause mild transient irritation.",
    "Sensitization: Not a respiratory or skin sensitizer.",
    "Carcinogenicity: No component classified as carcinogenic (IARC, NTP, OSHA).",
    "STOT/Reproductive/Aspiration: Not classified.",
    "Note: Evaluated using GHS criteria. No significant toxicological hazards.",
  ]);
  renderSectionN(ctx, "SECTION 12 — Ecological Information", [
    "Ecotoxicity: No significant environmental hazards under normal use.",
    "Persistence & Degradability: Readily biodegradable surfactants (OECD criteria).",
    "Bioaccumulation: Not expected to bioaccumulate significantly.",
    "Mobility in Soil: Water-miscible. May be mobile in soil/aquatic environments.",
  ]);
  renderSectionN(ctx, "SECTION 13 — Disposal Considerations", [
    "Waste Disposal: Dispose per local/regional/national regulations. Do not discharge to drains.",
    "Contaminated Packaging: Rinse and dispose through licensed waste facilities.",
    "RCRA (USA): Not classified as hazardous waste.",
  ]);

  // ── PAGE 7: Sections 14 + 15 + 16 ──
  ctx.addPage();
  sectionKVTable(ctx, "SECTION 14 — Transport Information", [
    ["UN Number", ti.un_number],
    ["UN Proper Shipping Name", ti.proper_shipping_name],
    ["Transport Hazard Class", ti.hazard_class],
    ["Packing Group", ti.packing_group],
    ["Environmental Hazard", ti.environmental_hazard],
    ["Special Precautions", ti.special_precautions],
    ["DOT (USA)", "Not regulated as dangerous goods"],
    ["IMDG (Marine)", "Not regulated"],
    ["IATA (Air)", "Not regulated"],
  ]);
  sectionKVTable(ctx, "SECTION 15 — Regulatory Information", [
    ["GHS Classification", ri.ghs_classification],
    ["US EPA", ri.us_epa],
    ["California Proposition 65", ri.california_prop65],
    ["TSCA (USA)", ri.tsca],
    ["EU CLP / GHS", ri.eu_clp],
    ["Amazon Product Safety", ri.amazon_product_safety],
  ]);

  const sup = ki.supplier_name;
  renderSectionN(ctx, "SECTION 16 — Other Information", [
    `Prepared by: Quality & Safety Department, ${sup}`,
    "",
    "Revision: Version 1.0 — Initial issue",
    "References: GHS Rev.9 / UN GHS 16th Edition (2026); OSHA 29 CFR 1910.1200;",
    "EU CLP (EC) No. 1272/2008; Amazon SDS Compliance Guidelines.",
    "",
    "Disclaimer: This SDS is based on current knowledge and is intended to",
    "describe the product for safety purposes only. It does not constitute a warranty.",
  ]);

  return doc;
}

/* ════════════════════════════════════════════════════
   PACKAGE COVER PAGE
   ════════════════════════════════════════════════════ */

function generate_package_cover(products: ParsedProduct[], settings: SdsSettings): jsPDF {
  const ki = settings.kit_info;
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const d = doc;

  let y = BODY_TOP + 40;

  d.setFont("helvetica", "bold");
  d.setFontSize(20);
  d.setTextColor(...DARK_BLUE);
  d.text("SAFETY DATA SHEET PACKAGE", W / 2, y, { align: "center" });
  y += 20;
  d.setDrawColor(...DARK_BLUE);
  d.setLineWidth(0.5);
  d.line(M + 20, y, W - M - 20, y);
  y += 16;

  // Kit info
  const ctx = new PageContext(doc, "Package Index", ki.version, ki.issue_date, ki.supplier_name, 1);
  ctx.drawHeader();
  ctx.drawFooter();
  ctx.y = y;

  infoTable(ctx, [
    ["Kit Name", ki.kit_name],
    ["ASIN", ki.asin],
    ["Supplier Name", ki.supplier_name],
    ["Issue Date", ki.issue_date],
  ], 100);

  ctx.y += 4;
  sectionTitle(ctx, "Product List");
  ctx.y += 2;

  dataTable(ctx,
    ["No.", "Product Name", "Report No.", "Ingredients Source"],
    products.map((p, i) => [
      String(i + 1),
      p.product_name,
      `${ki.report_number_prefix}-${p.section.replace(".", "")}`,
      "Word document",
    ]),
    [30, 210, 140, 110]
  );

  ctx.y += 10;
  d.setTextColor(...GRAY);
  d.setFont("helvetica", "normal");
  d.setFontSize(7);
  d.text("This package contains individual SDS documents for each product listed above.", M, ctx.y);
  ctx.y += 10;
  d.text(`Total Products: ${products.length}    |    GHS/UN 16th Edition (2026)`, M, ctx.y);

  return doc;
}

/* ════════════════════════════════════════════════════
   VALIDATION
   ════════════════════════════════════════════════════ */

const PLACEHOLDER_PATTERNS = [
  /liquid\s*component\s*\d/i,
  /to\s*be\s*confirmed/i,
  /supplier\s*confirmation/i,
  /\bTBC\b/i,
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validate_for_generation(
  products: ParsedProduct[],
  settings: SdsSettings
): ValidationResult {
  const errors: string[] = [];
  for (const p of products) {
    if (!p.product_name.trim()) errors.push(`${p.section}: Product name is empty`);
    if (p.ingredients.length === 0) errors.push(`${p.section}: No ingredients`);
    if (Math.abs(p.percentage_total - 100) > 0.01)
      errors.push(`${p.section}: Total is ${p.percentage_total}% (must be 100%)`);
    for (const ing of p.ingredients) {
      for (const pat of PLACEHOLDER_PATTERNS) {
        if (pat.test(ing.chemical_composition))
          errors.push(`${p.section}: "${ing.chemical_composition}" contains placeholder text`);
      }
    }
  }
  if (!settings.kit_info.supplier_name.trim()) errors.push("Supplier Name is empty");
  return { valid: errors.length === 0, errors };
}

/* ════════════════════════════════════════════════════
   OUTPUT: merge, ZIP, download
   ════════════════════════════════════════════════════ */

async function docToBytes(doc: jsPDF): Promise<Uint8Array> {
  const blob = doc.output("blob");
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

export async function generate_package_merged(
  products: ParsedProduct[],
  settings: SdsSettings
): Promise<Blob> {
  const cover = generate_package_cover(products, settings);
  const coverBytes = await docToBytes(cover);
  const pBytes = await Promise.all(
    products.map((p) => generate_product_sds_pdf(p, settings)).map(docToBytes)
  );
  const merged = await PDFDocument.create();
  for (const bytes of [coverBytes, ...pBytes]) {
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  const out = await merged.save();
  return new Blob([out as unknown as BlobPart], { type: "application/pdf" });
}

export async function generate_all_sds_outputs(
  products: ParsedProduct[],
  settings: SdsSettings
): Promise<{
  product_pdfs: { product_name: string; blob: Blob }[];
  package_pdf_blob: Blob;
  zip_blob: Blob;
}> {
  const zip = new JSZip();
  const product_pdfs: { product_name: string; blob: Blob }[] = [];

  // Individual PDFs
  for (const p of products) {
    const doc = generate_product_sds_pdf(p, settings);
    const blob = doc.output("blob");
    const safe = p.product_name.replace(/[^a-zA-Z0-9_-]/g, "_");
    product_pdfs.push({ product_name: safe, blob });
    zip.file(`${safe}_SDS.pdf`, blob);
  }

  // Merged package PDF
  const pkg = await generate_package_merged(products, settings);
  const kName = settings.kit_info.kit_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  zip.file(`${kName}_SDS_Package.pdf`, pkg);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { product_pdfs, package_pdf_blob: pkg, zip_blob: zipBlob };
}
