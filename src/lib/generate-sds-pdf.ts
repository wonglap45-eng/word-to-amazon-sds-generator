/* ============================================================
 * SDS PDF Generator – matching reference template
 *
 * jsPDF + manual drawing for letter-sized, 7-page SDS documents.
 * Professional layout per GHS/UN 16th Edition (2026) template.
 * ============================================================ */

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { ParsedProduct, SdsSettings } from "@/lib/types";

/* ════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════ */

const W = 612; const H = 792;
const M = 45;
const HEAD_H = 34; const FOOT_H = 26;
const BODY_T = HEAD_H + 8; const BODY_B = FOOT_H + 10;
const CW = W - M * 2;

// Colors (RGB 0-255 for jsPDF)
const DB = [26, 58, 92] as [number, number, number];
const LB = [208, 228, 245] as [number, number, number];
const LBA = [230, 240, 250] as [number, number, number];
const GN = [46, 125, 50] as [number, number, number];
const GNBG = [232, 245, 233] as [number, number, number];
const GR = [100, 100, 100] as [number, number, number];
const BC = [160, 170, 180] as [number, number, number];
const WH = [255, 255, 255] as [number, number, number];
const BK = [0, 0, 0] as [number, number, number];

/* ════════════════════════════════════════════════════
   PAGE CONTEXT
   ════════════════════════════════════════════════════ */

class Pg {
  doc: jsPDF; y: number; page: number; total: number;
  pName: string; ver: string; date: string; sup: string;
  bottle: string; // "Bottle 1" etc for subtitle

  constructor(doc: jsPDF, nm: string, ver: string, date: string, sup: string, bottle?: string) {
    this.doc = doc; this.page = 1; this.total = 5; // placeholder, fixed later
    this.pName = nm; this.ver = ver; this.date = date; this.sup = sup;
    this.y = BODY_T; this.bottle = bottle || "";
    this.header(); this.footer();
  }

  header() {
    const d = this.doc;
    d.setFillColor(...DB);
    d.rect(0, 0, W, HEAD_H, "F");
    d.setTextColor(255, 255, 255);
    d.setFontSize(8.5);
    d.setFont("helvetica", "bold");
    d.text("SAFETY DATA SHEET", M, 13);
    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    const pn = this.pName.length > 45 ? this.pName.slice(0, 43) + ".." : this.pName;
    d.text(pn, W / 2, 13, { align: "center" });
    d.text("GHS/UN 16th Edition (2026)", W - M, 13, { align: "right" });
    d.setDrawColor(...LB);
    d.setLineWidth(1);
    d.line(M, HEAD_H, W - M, HEAD_H);
  }

  footer() {
    const d = this.doc;
    const y = H - FOOT_H + 2;
    d.setDrawColor(...LB); d.setLineWidth(1);
    d.line(M, y, W - M, y);
    d.setTextColor(...GR); d.setFontSize(6.5);
    d.setFont("helvetica", "normal");
    d.text(`Version ${this.ver}  |  Date: ${this.date}  |  Page ${this.page} of ${this.total}  |  Supplier: ${this.sup}`, W / 2, y + 10, { align: "center" });
  }

  np() { this.page++; this.doc.addPage(); this.y = BODY_T; this.header(); this.footer(); }
  ns(h: number): boolean { return this.y + h > H - BODY_B; }
  es(h: number) { if (this.ns(h)) this.np(); }

  /** After all content is drawn, fix up footer page numbers */
  fixupFooters() {
    const total = this.doc.getNumberOfPages();
    this.total = total;
    const d = this.doc;
    const sup = this.sup;
    for (let p = 1; p <= total; p++) {
      d.setPage(p);
      // Erase old footer
      d.setFillColor(255, 255, 255);
      d.rect(0, H - FOOT_H - 5, W, FOOT_H + 10, "F");
      // Redraw footer line + text
      const fy = H - FOOT_H + 2;
      d.setDrawColor(...LB); d.setLineWidth(1);
      d.line(M, fy, W - M, fy);
      d.setTextColor(...GR); d.setFontSize(6.5);
      d.setFont("helvetica", "normal");
      d.text(`Version ${this.ver}  |  Date: ${this.date}  |  Page ${p} of ${total}  |  Supplier: ${sup}`, W / 2, fy + 10, { align: "center" });
    }
  }
}

/* ════════════════════════════════════════════════════
   DRAWING HELPERS
   ════════════════════════════════════════════════════ */

const PAD = 3; const MAX_PAGE_SIZE = 3 * 1024 * 1024;

function secTitle(ctx: Pg, text: string, h = 14) {
  ctx.es(h + 3);
  const d = ctx.doc;
  d.setFillColor(...DB); d.rect(M, ctx.y, CW, h, "F");
  d.setTextColor(255, 255, 255); d.setFontSize(8);
  d.setFont("helvetica", "bold");
  d.text(text, M + PAD + 2, ctx.y + h - 4);
  ctx.y += h + 3;
}

/**
 * Wrapped info table – label + value with auto text wrapping.
 * Each row's height is calculated from the taller column's line count.
 */
function infoTable(ctx: Pg, rows: [string, string][], lw = 120, fs = 6.8, lh = 8) {
  const d = ctx.doc;
  const vw = CW - lw;

  for (const [k, v] of rows) {
    const kLines = d.splitTextToSize(k, lw - PAD * 2);
    const vLines = d.splitTextToSize(v || "—", vw - PAD * 2);
    const nLines = Math.max(kLines.length, vLines.length, 1);
    const rowH = nLines * lh + PAD * 2;

    ctx.es(rowH);
    const ry = ctx.y;

    // Label cell
    d.setFillColor(...LB); d.rect(M, ry, lw, rowH, "F");
    d.setDrawColor(...BC); d.setLineWidth(0.3); d.rect(M, ry, lw, rowH, "S");
    d.setTextColor(...BK); d.setFontSize(fs);
    d.setFont("helvetica", "bold");
    let ky = ry + PAD + lh * 0.7;
    for (const line of kLines) { d.text(line, M + PAD, ky); ky += lh; }

    // Value cell
    d.setFillColor(255, 255, 255); d.rect(M + lw, ry, vw, rowH, "F");
    d.setDrawColor(...BC); d.rect(M + lw, ry, vw, rowH, "S");
    d.setFont("helvetica", "normal");
    ky = ry + PAD + lh * 0.7;
    for (const line of vLines) { d.text(line, M + lw + PAD, ky); ky += lh; }

    ctx.y += rowH;
  }
  ctx.y += 4;
}

/**
 * Wrapped data table – multi-column with auto text wrapping.
 */
function dataTable(ctx: Pg, hd: string[], rows: string[][], cw: number[], hf?: boolean, fs = 6.5, lh = 8) {
  const d = ctx.doc;
  // Calculate header height
  let hdrLines = 1;
  for (let c = 0; c < hd.length; c++) {
    const n = d.splitTextToSize(hd[c], cw[c] - PAD * 2).length;
    if (n > hdrLines) hdrLines = n;
  }
  const hdrH = hdrLines * lh + PAD * 2;
  ctx.es(hdrH);

  // Draw header
  let x = M;
  for (let c = 0; c < hd.length; c++) {
    d.setFillColor(...LB); d.rect(x, ctx.y, cw[c], hdrH, "F");
    d.setDrawColor(...BC); d.setLineWidth(0.3); d.rect(x, ctx.y, cw[c], hdrH, "S");
    d.setTextColor(...BK); d.setFontSize(fs); d.setFont("helvetica", "bold");
    let hy = ctx.y + PAD + lh * 0.7;
    for (const l of d.splitTextToSize(hd[c], cw[c] - PAD * 2)) { d.text(l, x + PAD, hy); hy += lh; }
    x += cw[c];
  }
  ctx.y += hdrH;

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    // Calculate max lines for this row
    let maxLines = 1;
    for (let c = 0; c < rows[r].length; c++) {
      const n = d.splitTextToSize(rows[r][c], cw[c] - PAD * 2).length;
      if (n > maxLines) maxLines = n;
    }
    const rowH = maxLines * lh + PAD * 2;
    ctx.es(rowH);

    x = M; const isLast = hf && r === rows.length - 1;
    for (let c = 0; c < rows[r].length; c++) {
      d.setFillColor(isLast ? LB[0] : WH[0], isLast ? LB[1] : WH[1], isLast ? LB[2] : WH[2]);
      d.rect(x, ctx.y, cw[c], rowH, "F");
      d.setDrawColor(...BC); d.setLineWidth(0.3); d.rect(x, ctx.y, cw[c], rowH, "S");
      d.setTextColor(isLast ? DB[0] : BK[0], isLast ? DB[1] : BK[1], isLast ? DB[2] : BK[2]);
      d.setFontSize(fs); d.setFont("helvetica", isLast ? "bold" : "normal");
      let ry = ctx.y + PAD + lh * 0.7;
      for (const l of d.splitTextToSize(rows[r][c], cw[c] - PAD * 2)) {
        d.text(l, x + PAD, ry); ry += lh;
      }
      x += cw[c];
    }
    ctx.y += rowH;
  }
  ctx.y += 5;
}

function bodyP(ctx: Pg, text: string, fs = 7) {
  const d = ctx.doc; d.setTextColor(...BK); d.setFontSize(fs); d.setFont("helvetica", "normal");
  const ls = d.splitTextToSize(text, CW - 4);
  for (const l of ls) { ctx.es(fs + 4); d.text(l, M + 2, ctx.y + fs); ctx.y += fs + 3; }
}

/** Draw wrapped paragraph text returning the height used. FS=fontSize, LH=lineHeight */
function bodyWrapped(ctx: Pg, text: string, fs = 7, lh = 8.5, x = M + PAD + 2) {
  const d = ctx.doc;
  d.setTextColor(...BK); d.setFontSize(fs); d.setFont("helvetica", "normal");
  const lines = d.splitTextToSize(text, CW - PAD * 2 - 4);
  const totalH = lines.length * lh;
  ctx.es(totalH);
  let yy = ctx.y + lh * 0.7;
  for (const l of lines) { d.text(l, x, yy); yy += lh; }
  ctx.y += totalH + 2;
}

function sectionKV(ctx: Pg, title: string, rows: [string, string][], lw = 120) { secTitle(ctx, title); infoTable(ctx, rows, lw); }

/* ════════════════════════════════════════════════════
   IMAGE PREPROCESSING – resize stamp for PDF embedding
   ════════════════════════════════════════════════════ */

const STAMP_MAX_PX = 300;

async function preprocessStamp(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width <= STAMP_MAX_PX) { resolve(dataUrl); return; }
      const scale = STAMP_MAX_PX / width;
      const canvas = document.createElement("canvas");
      canvas.width = STAMP_MAX_PX;
      canvas.height = Math.round(height * scale);
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) { resolve(dataUrl); return; }
      ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL("image/png");
      resolve(resized);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ════════════════════════════════════════════════════
   SECTION RENDERERS
   ════════════════════════════════════════════════════ */

function renderS1(ctx: Pg, product: ParsedProduct, s: SdsSettings) {
  const ki = s.kit_info;
  const addr = ki.address || "No.37 Zhengzhuang Village, Xieqiao Town, Yingshang County, Fuyang City, Anhui Province, 236000";
  const tel = ki.telephone || "+86 13178739270";
  const em = ki.email || "songping3544@outlook.com";

  secTitle(ctx, "SECTION 1 — Identification of the Substance / Mixture and the Company / Undertaking");
  infoTable(ctx, [
    ["Product Name", product.product_name],
    ["Recommended Use", "Professional and household cleaning agent for golf clubs, grips, shafts. Removes dirt, grass stains, mud, and light oil from golf club surfaces."],
    ["ASIN (Amazon)", ki.asin],
    ["Kit Component", ctx.bottle || product.product_name],
    ["Supplier Name", ki.supplier_name],
    ["Address", addr],
    ["Telephone", tel],
    ["E-mail", em],
    ["Emergency Telephone", ki.emergency_telephone || tel],
  ], 110);
}

function renderS2(ctx: Pg) {
  const d = ctx.doc;
  secTitle(ctx, "SECTION 2 — Hazard Identification");

  // Green banner
  ctx.es(18 + 4);
  d.setFillColor(...GNBG); d.setDrawColor(...GN); d.setLineWidth(1);
  d.rect(M, ctx.y, CW, 18, "FD");
  d.setTextColor(...GN); d.setFontSize(9); d.setFont("helvetica", "bold");
  d.text("NOT CLASSIFIED AS HAZARDOUS", W / 2, ctx.y + 12.5, { align: "center" });
  ctx.y += 22;

  // GHS Classification sub-title
  d.setFillColor(...LBA); d.rect(M, ctx.y, CW, 14, "F");
  d.setFontSize(7.5); d.setTextColor(...DB);
  d.text("GHS Classification (2026)", M + 5, ctx.y + 9.5);
  ctx.y += 16;

  infoTable(ctx, [
    ["Classification", "Not classified as hazardous according to GHS/CLP regulations."],
    ["Signal Word", "Not applicable"],
    ["Hazard Statements", "Not applicable"],
  ], 110);

  // P-Phrases table
  ctx.y += 2;
  d.setFillColor(...LBA); d.rect(M, ctx.y, CW, 14, "F");
  d.setFontSize(7.5); d.setTextColor(...DB);
  d.setFont("helvetica", "bold");
  d.text("Precautionary Statements (P-Phrases)", M + 5, ctx.y + 9.5);
  ctx.y += 16;

  infoTable(ctx, [
    ["P102", "Keep out of reach of children."],
    ["P264", "Wash skin thoroughly after handling."],
    ["P302+P352", "IF ON SKIN: Wash with plenty of soap and water."],
    ["P332+P313", "If skin irritation occurs: Get medical advice/attention."],
  ], 80);

  // Hazard Summary
  ctx.y += 2;
  d.setFillColor(...LBA); d.rect(M, ctx.y, CW, 14, "F");
  d.setFontSize(7.5); d.setTextColor(...DB);
  d.setFont("helvetica", "bold");
  d.text("Hazard Summary", M + 5, ctx.y + 9.5);
  ctx.y += 16;

  infoTable(ctx, [
    ["Physical Hazards", "Non-flammable liquid. No explosive or oxidizing properties."],
    ["Health Hazards", "May cause mild eye irritation. Low acute toxicity."],
  ], 90);
}

function renderS3(ctx: Pg, product: ParsedProduct) {
  secTitle(ctx, "SECTION 3 — Composition / Information on Ingredients");

  const d = ctx.doc;
  d.setFontSize(7.5); d.setFont("helvetica", "bold");
  d.setTextColor(...DB);
  d.text("Type:", M + 2, ctx.y + 7);
  d.setFont("helvetica", "normal");
  d.setTextColor(...BK);
  d.text("Mixture (Water-based cleaning solution, pH 5.5, transparent liquid)", M + 35, ctx.y + 7);
  ctx.y += 14;

  const rows = product.ingredients.map((ing, i) => [
    String(i + 1),
    ing.chemical_composition,
    ing.cas_number || "N/A",
    ing.percentage !== null ? `${ing.percentage}%` : (ing.percentage_raw || "—"),
  ]);
  dataTable(ctx, ["#", "Ingredient", "CAS No.", "Percentage"], rows, [24, 240, 110, 70], false);

  // Total row – bold, light-blue background
  ctx.y += 1;
  const totalRowH = 13;
  d.setFillColor(...LB);
  d.rect(M, ctx.y, CW, totalRowH, "F");
  d.setDrawColor(...BC); d.setLineWidth(0.3);
  d.rect(M, ctx.y, CW, totalRowH, "S");
  d.setFontSize(7); d.setFont("helvetica", "bold");
  d.setTextColor(...DB);
  d.text("Total", M + 180, ctx.y + 9, { align: "right" });
  d.text(`${product.percentage_total}%`, M + 300, ctx.y + 9);
  ctx.y += totalRowH + 2;

  // Mixture Description
  ctx.y += 2;
  d.setFont("helvetica", "bold"); d.setFontSize(7); d.setTextColor(...DB);
  d.text("Mixture Description:", M + 2, ctx.y + 6);
  d.setFont("helvetica", "normal"); d.setTextColor(...BK);
  d.text("Water-based mild cleaning solution, pH 5.5, transparent liquid, non-irritating odor. All surfactants used are readily biodegradable.", M + 90, ctx.y + 6);
  ctx.y += 14;
}

function renderS4(ctx: Pg) {
  secTitle(ctx, "SECTION 4 — First-Aid Measures");
  infoTable(ctx, [
    ["Inhalation", "Remove to fresh air. If breathing is difficult, call a physician."],
    ["Skin Contact", "Wash with plenty of soap and water. Remove contaminated clothing. Seek medical attention if irritation develops."],
    ["Eye Contact", "Rinse cautiously with water for 15-20 minutes. Remove contact lenses if present. Call an ophthalmologist if irritation persists."],
    ["Ingestion", "Rinse mouth. Do NOT induce vomiting. Call a poison control center or doctor immediately."],
    ["Most Important Symptoms", "Mild eye/skin irritation; no known delayed health effects."],
    ["Indication of Medical Attention", "Treat symptomatically. No specific antidote."],
  ], 105);
}

function renderS5(ctx: Pg) {
  sectionKV(ctx, "SECTION 5 — Fire-Fighting Measures", [
    ["Extinguishing Media", "Suitable: Water spray, foam, dry chemical, CO2. Unsuitable: Not applicable."],
    ["Special Hazards", "Non-flammable. No hazardous combustion products under normal fire conditions."],
    ["Advice for Firefighters", "Wear self-contained breathing apparatus (SCBA) and full protective clothing as a precaution."],
  ]);
}

function renderS6(ctx: Pg) {
  sectionKV(ctx, "SECTION 6 — Accidental Release Measures", [
    ["Personal Precautions", "Avoid contact with eyes and skin. Ensure good ventilation."],
    ["Environmental Precautions", "Do not discharge into drains, soil, or waterways."],
    ["Methods for Containment/Cleanup", "Contain spill with absorbent material (cloth, sand, absorbent mats). Wipe up. Rinse area with water. Dispose of waste properly."],
  ]);
}

function renderS7(ctx: Pg) {
  sectionKV(ctx, "SECTION 7 — Handling and Storage", [
    ["Handling", "Avoid contact with eyes. Wash hands after use. Keep container closed. Handle in well-ventilated areas."],
    ["Storage", "Store in a cool, dry, well-ventilated area. Keep from direct sunlight and heat. Keep containers tightly closed and upright."],
    ["Incompatible Materials", "Strong oxidizing agents, concentrated acids/bases."],
  ]);
}

function renderS8(ctx: Pg) {
  secTitle(ctx, "SECTION 8 — Exposure Controls / Personal Protection");
  infoTable(ctx, [
    ["Exposure Limits", "No occupational exposure limits established for components."],
    ["Engineering Controls", "General room ventilation is sufficient for normal use."],
    ["Respiratory Protection", "Not required under normal use."],
    ["Hand Protection", "Impermeable gloves if prolonged or repeated contact."],
    ["Eye Protection", "Safety glasses recommended."],
    ["Skin & Body Protection", "Standard work clothing; no special requirements."],
    ["Hygiene Measures", "Wash hands before breaks and after work."],
  ], 130);
}

function renderS9(ctx: Pg, s: SdsSettings) {
  const pp = s.physical_properties;
  secTitle(ctx, "SECTION 9 — Physical and Chemical Properties");
  infoTable(ctx, [
    ["Appearance", pp.appearance],
    ["Odor", pp.odor],
    ["Odor Threshold", pp.odor_threshold],
    ["pH", pp.ph],
    ["Melting Point / Freezing Point", pp.melting_point],
    ["Initial Boiling Point / BP Range", pp.boiling_point],
    ["Flash Point", pp.flash_point],
    ["Evaporation Rate", pp.evaporation_rate],
    ["Flammability (solid/gas)", pp.flammability],
    ["Upper/Lower Explosion Limits", pp.explosion_limits],
    ["Vapor Pressure", pp.vapor_pressure],
    ["Vapor Density", pp.vapor_density],
    ["Relative Density (Specific Gravity)", pp.relative_density],
    ["Solubility", pp.solubility],
    ["Partition Coefficient (n-octanol/water)", pp.partition_coefficient],
    ["Autoignition Temperature", pp.autoignition_temperature],
    ["Decomposition Temperature", pp.decomposition_temperature],
    ["Viscosity", pp.viscosity],
  ], 190); // wider label column for long property names
}

function renderS10(ctx: Pg) {
  sectionKV(ctx, "SECTION 10 — Stability and Reactivity", [
    ["Reactivity", "No hazardous reactions known under normal conditions."],
    ["Chemical Stability", "Stable under normal conditions of use and storage."],
    ["Hazardous Reactions", "Hazardous polymerization will not occur."],
    ["Conditions to Avoid", "Extreme heat, open flames, strong oxidizers."],
    ["Incompatible Materials", "Strong oxidizing agents, concentrated alkaline solutions."],
    ["Decomposition Products", "None under normal temperatures."],
  ]);
}

function renderS11(ctx: Pg) {
  sectionKV(ctx, "SECTION 11 — Toxicological Information", [
    ["Acute Toxicity", "Low toxicity; no lethal dose data available for normal use."],
    ["Skin Corrosion/Irritation", "Mildly irritating to sensitive skin. No classification required."],
    ["Eye Damage/Irritation", "May cause mild reversible eye irritation."],
    ["Sensitization", "No skin sensitization expected."],
    ["Germ Cell Mutagenicity", "No data indicating mutagenic potential."],
    ["Carcinogenicity", "No ingredients listed as carcinogens by IARC, NTP, or OSHA."],
    ["Reproductive Toxicity", "No known reproductive toxicity."],
    ["STOT-SE (Single Exposure)", "No specific target organ toxicity expected."],
    ["STOT-RE (Repeated Exposure)", "No effects expected from normal use."],
    ["Aspiration Hazard", "Not applicable (aqueous solution)."],
  ]);
}

function renderS12(ctx: Pg) {
  sectionKV(ctx, "SECTION 12 — Ecological Information", [
    ["Aquatic Toxicity", "Low aquatic toxicity expected based on component data."],
    ["Persistence/Degradability", "Readily biodegradable. Surfactants meet OECD criteria."],
    ["Bioaccumulative Potential", "Low bioaccumulation potential."],
    ["Mobility in Soil", "High water solubility; low soil adsorption."],
    ["Other Adverse Effects", "Do not release into environment. Safe for household drainage after dilution."],
  ]);
}

function renderS13(ctx: Pg) {
  secTitle(ctx, "SECTION 13 — Disposal Considerations");
  bodyP(ctx, "• Dispose of contents/container in accordance with local, regional, national regulations.");
  bodyP(ctx, "• Do not discharge into drains, soil, or waterways.");
  bodyP(ctx, "• Empty containers: rinse thoroughly before recycling or disposal.");
  bodyP(ctx, "• Do not pour into storm drains, rivers, or lakes.");
}

function renderS14(ctx: Pg, s: SdsSettings) {
  const ti = s.transport_info;
  sectionKV(ctx, "SECTION 14 — Transport Information", [
    ["UN Number", ti.un_number],
    ["UN Proper Shipping Name", ti.proper_shipping_name],
    ["Transport Hazard Class", ti.hazard_class],
    ["Packing Group", ti.packing_group],
    ["Environmental Hazard", ti.environmental_hazard],
    ["Special Precautions", ti.special_precautions],
  ]);
}

function renderS15(ctx: Pg, s: SdsSettings) {
  const ri = s.regulatory_info;
  secTitle(ctx, "SECTION 15 — Regulatory Information");

  const d = ctx.doc;
  // International sub-title
  d.setFillColor(...LBA); d.rect(M, ctx.y, CW, 14, "F");
  d.setFontSize(7.5); d.setTextColor(...DB); d.setFont("helvetica", "bold");
  d.text("International Regulations", M + 5, ctx.y + 9.5);
  ctx.y += 16;

  infoTable(ctx, [
    ["GHS Classification", ri.ghs_classification],
    ["US EPA", ri.us_epa],
    ["California Proposition 65", ri.california_prop65],
    ["TSCA (USA)", ri.tsca],
    ["EU CLP/GHS", ri.eu_clp],
    ["Amazon Product Safety", ri.amazon_product_safety],
  ], 120);

  ctx.y += 2;
  d.setFillColor(...LBA); d.rect(M, ctx.y, CW, 14, "F");
  d.setFontSize(7.5); d.setTextColor(...DB); d.setFont("helvetica", "bold");
  d.text("National Regulations", M + 5, ctx.y + 9.5);
  ctx.y += 16;

  bodyP(ctx, "China GB 30000 (2013): Not classified as hazardous. OSHA HazCom 2012: Compliant. EU CLP Regulation: Compliant.");
}

function renderS16(ctx: Pg, s: SdsSettings) {
  const ki = s.kit_info;
  secTitle(ctx, "SECTION 16 — Other Information");

  infoTable(ctx, [
    ["Preparation Date", ki.issue_date],
    ["Version", `${ki.version} (2026 International SDS Standard)`],
    ["Report Number", `${ki.report_number_prefix}-${ctx.bottle ? "LC" + ctx.bottle.replace("Bottle ", "") : "00"}-${ki.issue_date.replace(/-/g, "")}`],
    ["Prepared by", `Quality & Safety Department, ${ki.supplier_name}`],
    ["Key Literature Data", "Internal safety tests, supplier ingredient data, GHS 2026 guidelines."],
  ], 100);

  ctx.y += 4;
  secTitle(ctx, "Legal Disclaimer");
  bodyP(ctx, "This SDS is accurate to the best of our knowledge. Users must determine suitability for their specific use.");
  bodyP(ctx, "This SDS complies with GHS/UN 16th Edition (2026) and applicable international and national regulations for Amazon marketplace listing.");
}

/* ════════════════════════════════════════════════════
   PRODUCT SDS (7 pages)
   ════════════════════════════════════════════════════ */

function genProductSDS(product: ParsedProduct, s: SdsSettings, stampDataUrl: string, bottle?: string): jsPDF {
  const ki = s.kit_info;
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const ctx = new Pg(doc, product.product_name, ki.version, ki.issue_date, ki.supplier_name, bottle);

  // PAGE 1: Cover + Section 1 + Section 2 + stamp
  let y = ctx.y + 20;
  const d = doc;
  d.setFontSize(18); d.setFont("helvetica", "bold"); d.setTextColor(...DB);
  d.text("SAFETY DATA SHEET", W / 2, y, { align: "center" });
  y += 12;
  d.setFontSize(8.5); d.setFont("helvetica", "normal"); d.setTextColor(...GR);
  d.text("According to GHS/UN 16th Edition (2026 International Standard)", W / 2, y, { align: "center" });
  y += 8;

  // Report bar
  d.setFillColor(...LB); d.rect(M, y, CW, 20, "F");
  d.setFontSize(7.5); d.setTextColor(...BK);
  const rn = `${ki.report_number_prefix}-${bottle ? "LC" + bottle.replace("Bottle ", "") : product.section.replace(".", "")}-${ki.issue_date.replace(/-/g, "")}`;
  d.text(`Report No.: ${rn}    |    Date: ${ki.issue_date}`, M + 8, y + 13);
  y += 26;

  // Bottle label
  if (bottle) {
    d.setFontSize(9); d.setFont("helvetica", "bold"); d.setTextColor(...DB);
    d.text(`${bottle} / ${product.product_name}`, M, y);
    y += 12;
  }

  ctx.y = y;
  renderS1(ctx, product, s);
  renderS2(ctx);

  // ── PAGE 2: Sections 3 + 4 + 5 + 6 ──
  ctx.np();
  renderS3(ctx, product);
  renderS4(ctx);
  renderS5(ctx);
  renderS6(ctx);

  // ── PAGE 3: Sections 7 + 8 + 9 ──
  ctx.np();
  renderS7(ctx);
  renderS8(ctx);
  renderS9(ctx, s);

  // ── PAGE 4: Sections 10 + 11 + 12 + 13 ──
  ctx.np();
  renderS10(ctx);
  renderS11(ctx);
  renderS12(ctx);
  renderS13(ctx);

  // ── PAGE 5: Sections 14 + 15 + 16 ──
  ctx.np();
  renderS14(ctx, s);
  renderS15(ctx, s);
  renderS16(ctx, s);

  // Stamp – floating overlay on page 1 only, near bottom-right
  if (stampDataUrl) {
    try {
      d.setPage(1);
      const parts = stampDataUrl.split(",");
      if (parts.length === 2) {
        const sx = 465, sy = 675, sw = 100, sh = 52;
        d.addImage(parts[1], "PNG", sx, sy, sw, sh);
      }
    } catch { /* ignore */ }
  }

  // Fix up footers with actual page count
  ctx.fixupFooters();

  return doc;
}

/* ════════════════════════════════════════════════════
   PACKAGE COVER
   ════════════════════════════════════════════════════ */

function genPackageCover(prods: ParsedProduct[], s: SdsSettings): jsPDF {
  const ki = s.kit_info;
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const d = doc;
  let y = BODY_T + 40;

  d.setFontSize(18); d.setFont("helvetica", "bold"); d.setTextColor(...DB);
  d.text("SAFETY DATA SHEET PACKAGE", W / 2, y, { align: "center" });
  y += 16;
  d.setFontSize(9); d.setFont("helvetica", "normal"); d.setTextColor(...GR);
  d.text(`${ki.kit_name} — Three Liquid Components`, W / 2, y, { align: "center" });
  y += 10;
  d.setFontSize(7.5); d.setTextColor(...GR);
  const rn = `${ki.report_number_prefix}-PACKAGE-${ki.issue_date.replace(/-/g, "")}`;
  d.text(`Report No.: ${rn}    |    Date: ${ki.issue_date}`, M + 10, y + 6);
  y += 24;

  // KIT COMPONENT INDEX
  d.setFillColor(...LBA); d.rect(M, y, CW, 16, "F");
  d.setFontSize(9); d.setTextColor(...DB); d.setFont("helvetica", "bold");
  d.text("KIT COMPONENT INDEX", M + 8, y + 11);
  y += 20;

  const ctx = new Pg(doc, "Package Index", ki.version, ki.issue_date, ki.supplier_name);
  ctx.y = y;

  const btls = ["Bottle 1", "Bottle 2", "Bottle 3"];
  dataTable(ctx, ["Kit Component", "Product Name", "Report No."],
    prods.map((p, i) => [
      btls[i] || `Bottle ${i + 1}`,
      p.product_name,
      `${ki.report_number_prefix}-LC${i + 1}-${ki.issue_date.replace(/-/g, "")}`,
    ]),
    [120, 270, 130]
  );

  ctx.y += 6;

  // Document Purpose
  secTitle(ctx, "Document Purpose");
  bodyWrapped(ctx, "This Safety Data Sheet Package is prepared to meet Amazon marketplace requirements for chemical product documentation. It provides comprehensive safety information for each liquid component in the Golf Club Cleaning Kit.", 7, 8);

  // Kit Components Statement
  secTitle(ctx, "Kit Components Statement");
  bodyWrapped(ctx, `The Golf Club Cleaning Kit (ASIN: ${ki.asin}) contains three independently formulated liquid components. Each component has been documented with its own Safety Data Sheet containing 16 standardized sections per GHS/UN 16th Edition (2026).`, 7, 8);

  // Amazon SDS Review Note
  secTitle(ctx, "Amazon SDS Review Note");
  bodyWrapped(ctx, "These SDS documents have been formatted to comply with Amazon's Safety Data Sheet requirements for chemical products sold on Amazon.com. All ingredients are disclosed with CAS numbers and percentage composition. Hazard classification follows GHS UN 16th Edition criteria.", 7, 8);

  sectionKV(ctx, "PACKAGE NOTE", [
    ["Purpose", "This PDF package contains separate Safety Data Sheets for each liquid component. The three components have different formulations and are documented separately for Amazon SDS review."],
    ["ASIN (Amazon)", ki.asin],
    ["Supplier", ki.supplier_name],
    ["Date", ki.issue_date],
  ]);

  ctx.y += 4;
  secTitle(ctx, "Supplier Declaration");
  bodyWrapped(ctx, `The supplier ${ki.supplier_name} certifies that the information provided in these Safety Data Sheets is accurate to the best of knowledge and complies with applicable regulations for Amazon marketplace.`, 7, 8);
  ctx.y += 14;

  ctx.fixupFooters();

  return doc;
}

/* ════════════════════════════════════════════════════
   VALIDATION
   ════════════════════════════════════════════════════ */

const PLACEHOLDER_PATTERNS = [/liquid\s*component\s*\d/i, /to\s*be\s*confirmed/i, /supplier\s*confirmation/i, /\bTBC\b/i];

export interface ValidationResult { valid: boolean; errors: string[]; }

export function validate_for_generation(prods: ParsedProduct[], s: SdsSettings): ValidationResult {
  const errors: string[] = [];
  for (const p of prods) {
    if (!p.product_name.trim()) errors.push(`${p.section}: Product name is empty`);
    if (p.ingredients.length === 0) errors.push(`${p.section}: No ingredients`);
    if (Math.abs(p.percentage_total - 100) > 0.01) errors.push(`${p.section}: Total is ${p.percentage_total}%`);
    for (const ing of p.ingredients) for (const pat of PLACEHOLDER_PATTERNS) if (pat.test(ing.chemical_composition)) errors.push(`${p.section}: "${ing.chemical_composition}" has placeholder text`);
  }
  if (!s.kit_info.supplier_name.trim()) errors.push("Supplier Name is empty");
  return { valid: errors.length === 0, errors };
}

/* ════════════════════════════════════════════════════
   OUTPUT
   ════════════════════════════════════════════════════ */

async function docBytes(doc: jsPDF): Promise<Uint8Array> {
  const b = doc.output("blob"); const ab = await b.arrayBuffer(); return new Uint8Array(ab);
}

export async function generate_package_merged(
  prods: ParsedProduct[], s: SdsSettings, stampUrl: string
): Promise<Blob> {
  const btls = ["Bottle 1", "Bottle 2", "Bottle 3"];
  const cov = genPackageCover(prods, s);
  const covB = await docBytes(cov);
  const pB = await Promise.all(
    prods.map((p, i) => genProductSDS(p, s, stampUrl, btls[i] || undefined)).map(docBytes)
  );
  const mg = await PDFDocument.create();
  for (const bytes of [covB, ...pB]) {
    const src = await PDFDocument.load(bytes);
    const pgs = await mg.copyPages(src, src.getPageIndices());
    for (const pg of pgs) mg.addPage(pg);
  }
  const out = await mg.save({ useObjectStreams: true });

  // Size check
  if (out.byteLength > MAX_PAGE_SIZE) {
    throw new Error(
      `PDF size is ${(out.byteLength / 1024 / 1024).toFixed(1)}MB, exceeds ${(MAX_PAGE_SIZE / 1024 / 1024).toFixed(0)}MB limit. Please reduce stamp image size or remove it.`
    );
  }

  return new Blob([out as unknown as BlobPart], { type: "application/pdf" });
}

export async function generate_all_sds_outputs(prods: ParsedProduct[], s: SdsSettings) {
  const zip = new JSZip();
  const btls = ["Bottle 1", "Bottle 2", "Bottle 3"];

  // Preprocess stamp image – resize for PDF embedding, single time
  let stampUrl = "";
  if (s.kit_info.company_stamp_data_url) {
    stampUrl = await preprocessStamp(s.kit_info.company_stamp_data_url);
  }

  const pdfs: { product_name: string; blob: Blob }[] = [];

  for (let i = 0; i < prods.length; i++) {
    const doc = genProductSDS(prods[i], s, stampUrl, btls[i] || undefined);
    const blob = doc.output("blob");
    const safe = prods[i].product_name.replace(/[^a-zA-Z0-9_-]/g, "_");
    pdfs.push({ product_name: safe, blob });
    zip.file(`${safe}_SDS.pdf`, blob);
  }

  const pkg = await generate_package_merged(prods, s, stampUrl);
  const kn = s.kit_info.kit_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  zip.file(`${kn}_SDS_Package.pdf`, pkg);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  return { product_pdfs: pdfs, package_pdf_blob: pkg, zip_blob: zipBlob };
}
