/* ============================================================
 * Word to Amazon SDS Generator - PDF Generator
 *
 * Generates 16-section Safety Data Sheet PDFs using jspdf.
 *
 * Functions:
 *   - generate_product_sds_pdf()   → single product SDS
 *   - generate_package_sds_pdf()   → combined package PDF
 *   - generate_sds_zip_blob()      → ZIP with all PDFs
 * ============================================================ */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type {
  ParsedProduct,
  SdsSettings,
  Ingredient,
} from "@/lib/types";

/* ════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════ */

const PAGE_W = 612; // Letter width (points)
const PAGE_H = 792; // Letter height
const MARGIN = 54;  // 0.75 inch
const CONTENT_W = PAGE_W - MARGIN * 2; // 504

const COLOR_DARK_BLUE = [26, 58, 92] as const;
const COLOR_LIGHT_BLUE = [208, 228, 245] as const;
const COLOR_GREEN = [46, 125, 50] as const;
const COLOR_GREEN_BG = [232, 245, 233] as const;
const COLOR_RED = [198, 40, 40] as const;
const COLOR_GRAY = [100, 100, 100] as const;

const FONT_NORMAL = "helvetica";
const FONT_BOLD = "helvetica";
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SECTION = 11;
const FONT_SIZE_BODY = 8;
const FONT_SIZE_SMALL = 7;

/* ════════════════════════════════════════════════════════
   VALIDATION
   ════════════════════════════════════════════════════════ */

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

/** Validate all data before generating PDFs */
export function validate_for_generation(
  products: ParsedProduct[],
  settings: SdsSettings
): ValidationResult {
  const errors: string[] = [];

  for (const p of products) {
    const name = p.product_name.trim();
    if (!name) {
      errors.push(`${p.section}: Product name is empty`);
    }
    if (p.ingredients.length === 0) {
      errors.push(`${p.section}: No ingredients`);
    }
    if (Math.abs(p.percentage_total - 100) > 0.01) {
      errors.push(
        `${p.section}: Total is ${p.percentage_total}% (must be 100%)`
      );
    }
    // Check for placeholder text in ingredient names
    for (const ing of p.ingredients) {
      for (const pat of PLACEHOLDER_PATTERNS) {
        if (pat.test(ing.chemical_composition)) {
          errors.push(
            `${p.section}: Ingredient "${ing.chemical_composition}" contains placeholder text`
          );
        }
      }
    }
  }

  // Check supplier name consistency
  const sup = settings.kit_info.supplier_name.trim();
  if (!sup) {
    errors.push("Supplier Name is empty");
  }

  return { valid: errors.length === 0, errors };
}

/* ════════════════════════════════════════════════════════
   HELPER – draw header and footer on each page
   ════════════════════════════════════════════════════════ */

function draw_header(
  doc: jsPDF,
  product_name: string,
  page_num: number,
  total_pages: number
) {
  // Header background
  doc.setFillColor(...COLOR_DARK_BLUE);
  doc.rect(0, 0, PAGE_W, 38, "F");

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(FONT_BOLD, "bold");
  doc.text("SAFETY DATA SHEET", MARGIN, 14);
  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(8);
  doc.text(product_name, MARGIN, 24);
  doc.text("GHS/UN 16th Edition (2026)", MARGIN, 32);

  // Top-right page indicator
  doc.setFontSize(7);
  doc.text(`Page ${page_num} of ${total_pages}`, PAGE_W - MARGIN, 14, { align: "right" });
}

function draw_footer(doc: jsPDF, version: string, date: string, supplier: string, page_num: number) {
  // Footer line
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN, PAGE_H - 28, PAGE_W - MARGIN, PAGE_H - 28);

  doc.setTextColor(...COLOR_GRAY);
  doc.setFontSize(6.5);
  doc.setFont(FONT_NORMAL, "normal");
  doc.text(`Version ${version}`, MARGIN, PAGE_H - 18);
  doc.text(`Date: ${date}`, MARGIN + 60, PAGE_H - 18);
  doc.text(`Supplier: ${supplier}`, PAGE_W - MARGIN, PAGE_H - 18, { align: "right" });
}

/* ════════════════════════════════════════════════════════
   HELPER – section title banner
   ════════════════════════════════════════════════════════ */

function draw_section_title(doc: jsPDF, y: number, text: string): number {
  const h = 16;
  doc.setFillColor(...COLOR_DARK_BLUE);
  doc.rect(MARGIN, y, CONTENT_W, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(FONT_SIZE_SECTION);
  doc.text(text, MARGIN + 6, y + 11);
  return y + h + 4;
}

/* ════════════════════════════════════════════════════════
   HELPER – key-value layout (two-column)
   ════════════════════════════════════════════════════════ */

function draw_kv_row(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  label_w = 140
): number {
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setTextColor(0, 0, 0);
  doc.text(label + ":", MARGIN, y);
  doc.setFont(FONT_NORMAL, "normal");
  doc.text(value, MARGIN + label_w, y);
  return y + 11;
}

/* ════════════════════════════════════════════════════════
   SECTION CONTENT HELPERS
   ════════════════════════════════════════════════════════ */

function section1_content(
  doc: jsPDF,
  start_y: number,
  product: ParsedProduct,
  settings: SdsSettings
): number {
  const ki = settings.kit_info;
  let y = start_y;

  // Title
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(...COLOR_DARK_BLUE);
  doc.text("SAFETY DATA SHEET", MARGIN, y);
  y += 20;

  // Horizontal rule
  doc.setDrawColor(...COLOR_DARK_BLUE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Section title
  y = draw_section_title(doc, y, "SECTION 1 — Identification");

  // Content
  const items: [string, string][] = [
    ["Product Name", product.product_name],
    ["Kit Name", ki.kit_name],
    ["ASIN", ki.asin],
    ["Supplier Name", ki.supplier_name],
    ["Address", ki.address || "—"],
    ["Telephone", ki.telephone || "—"],
    ["Email", ki.email || "—"],
    ["Emergency Telephone", ki.emergency_telephone || "—"],
    ["Report No.", `${ki.report_number_prefix}-${product.section.replace(".", "")}`],
    ["Date", ki.issue_date],
    ["Version", ki.version],
  ];

  for (const [label, value] of items) {
    y = draw_kv_row(doc, y, label, value);
  }

  y += 4;

  // Stamp / signature (if uploaded)
  if (ki.company_stamp_data_url) {
    try {
      // Split data URL to get base64
      const parts = ki.company_stamp_data_url.split(",");
      if (parts.length === 2) {
        const img_data = parts[1];
        doc.addImage(img_data, "PNG", MARGIN + 200, y - 10, 60, 30);
        y += 40;
      }
    } catch {
      // Silently skip if image can't be added
    }
  }

  return y + 10;
}

function section2_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 2 — Hazard Identification");

  // Green classification box
  doc.setFillColor(...COLOR_GREEN_BG);
  doc.setDrawColor(...COLOR_GREEN);
  doc.rect(MARGIN, y, CONTENT_W, 18, "FD");
  doc.setTextColor(...COLOR_GREEN);
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(9);
  doc.text("NOT CLASSIFIED AS HAZARDOUS", MARGIN + 8, y + 12);
  y += 24;

  doc.setTextColor(0, 0, 0);
  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(FONT_SIZE_BODY);
  const lines = doc.splitTextToSize(
    "This mixture is not classified as hazardous according to GHS (Globally Harmonized System) criteria. No hazard symbols, signal words, or hazard statements are required under normal conditions of use.",
    CONTENT_W
  );
  for (const line of lines) {
    doc.text(line, MARGIN, y);
    y += 10;
  }
  y += 6;

  // Hazard info table
  const table_data = [
    ["GHS Classification", "Not classified as hazardous"],
    ["Hazard Symbols", "None"],
    ["Signal Word", "None"],
    ["Hazard Statements", "None"],
    ["Precautionary Statements", "None (general handling only)"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Category", "Description"]],
    body: table_data,
    theme: "grid",
    headStyles: {
      fillColor: [...COLOR_LIGHT_BLUE],
      textColor: 0,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: CONTENT_W - 120 } },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function section3_content(
  doc: jsPDF,
  start_y: number,
  product: ParsedProduct
): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 3 — Composition / Information on Ingredients");

  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(FONT_SIZE_BODY);
  const lines = doc.splitTextToSize(
    `Product Name: ${product.product_name}`,
    CONTENT_W
  );
  for (const line of lines) {
    doc.text(line, MARGIN, y);
    y += 10;
  }
  y += 2;

  // Ingredients table
  const body = product.ingredients.map((ing, i) => [
    String(i + 1),
    ing.chemical_composition,
    ing.cas_number || "N/A",
    ing.percentage !== null ? `${ing.percentage}%` : ing.percentage_raw || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Chemical Composition", "CAS No.", "Percentage"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [...COLOR_LIGHT_BLUE],
      textColor: 0,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 220 },
      2: { cellWidth: 100 },
      3: { cellWidth: 60, halign: "right" },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });

  // Total row
  const fy = (doc as any).lastAutoTable.finalY;
  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setTextColor(...COLOR_DARK_BLUE);
  doc.text("Total:", PAGE_W - MARGIN - 60, fy + 6, { align: "right" });
  doc.text(`${product.percentage_total}%`, PAGE_W - MARGIN, fy + 6, { align: "right" });

  return fy + 14;
}

/** Standard body text for a section */
function section_standard_text(doc: jsPDF, y: number, lines: string[]): number {
  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setTextColor(0, 0, 0);
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W);
    for (const w of wrapped) {
      doc.text(w, MARGIN, y);
      y += 9;
    }
  }
  return y + 4;
}

function section4_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 4 — First-Aid Measures");

  const table = [
    ["Eye Contact", "Rinse immediately with plenty of water for at least 15 minutes. Remove contact lenses if present. Seek medical attention if irritation persists."],
    ["Skin Contact", "Wash with soap and water. Remove contaminated clothing. Seek medical attention if irritation develops."],
    ["Inhalation", "Move to fresh air. If symptoms occur, seek medical attention."],
    ["Ingestion", "Rinse mouth with water. Do NOT induce vomiting. Seek medical attention if symptoms develop."],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Route of Exposure", "First-Aid Measures"]],
    body: table,
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: CONTENT_W - 100 } },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function section5_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 5 — Fire-Fighting Measures");
  y = section_standard_text(doc, y, [
    "Suitable Extinguishing Media: Water spray, dry chemical, foam, CO₂.",
    "Unsuitable Extinguishing Media: None known.",
    "Specific Hazards: Non-flammable. No hazardous combustion products under normal fire conditions.",
    "Protective Equipment: Self-contained breathing apparatus and full protective clothing for firefighters.",
    "Firefighting Instructions: Use standard firefighting procedures. Collect contaminated fire water separately. Do not allow runoff to enter drains or waterways.",
  ]);
  return y;
}

function section6_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 6 — Accidental Release Measures");
  y = section_standard_text(doc, y, [
    "Personal Precautions: Avoid direct contact. Wear appropriate personal protective equipment.",
    "Environmental Precautions: Prevent product from entering drains, sewers, and waterways. Use absorbent materials to contain spills.",
    "Containment Methods: Contain spilled material with inert absorbent (sand, earth, vermiculite). Collect in suitable containers for disposal.",
    "Cleanup Procedures: Wash area with water after absorption. Dispose of collected material in accordance with local regulations.",
  ]);
  return y;
}

function section7_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 7 — Handling and Storage");
  y = section_standard_text(doc, y, [
    "Handling: Handle in accordance with good industrial hygiene and safety practice. Avoid contact with eyes and skin. Use in well-ventilated areas. Keep container tightly closed when not in use.",
    "Storage: Store in original container in a cool, dry, well-ventilated area. Keep away from incompatible materials. Store at temperatures between 5°C and 40°C. Protect from freezing.",
    "Incompatible Materials: Strong oxidizing agents, strong acids, strong bases.",
  ]);
  return y;
}

function section8_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 8 — Exposure Controls / Personal Protection");

  const table = [
    ["Component", "ACGIH TLV (ppm)", "OSHA PEL (ppm)", "Biological Exposure Index"],
    ["Not established for this mixture", "N/E", "N/E", "N/E"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Component", "ACGIH TLV (ppm)", "OSHA PEL (ppm)", "Biological Exposure Index"]],
    body: table.slice(1),
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  y = section_standard_text(doc, y, [
    "Engineering Controls: General ventilation is sufficient under normal use conditions.",
    "Eye Protection: Safety glasses with side shields recommended.",
    "Skin Protection: Impervious gloves (nitrile rubber recommended). Standard work clothing.",
    "Respiratory Protection: Not required under normal use conditions.",
    "Hygiene Measures: Wash hands after handling. Do not eat, drink or smoke when using.",
  ]);
  return y;
}

function section9_content(doc: jsPDF, start_y: number, settings: SdsSettings): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 9 — Physical and Chemical Properties");

  const pp = settings.physical_properties;
  const props: [string, string][] = [
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
  ];

  const body = props.map(([label, value]) => [label, value]);

  autoTable(doc, {
    startY: y,
    head: [["Property", "Value"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 200 }, 1: { cellWidth: CONTENT_W - 200 } },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function section10_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 10 — Stability and Reactivity");
  y = section_standard_text(doc, y, [
    "Reactivity: No dangerous reactions known under normal conditions of use.",
    "Chemical Stability: Stable under normal ambient and anticipated storage and handling conditions.",
    "Hazardous Reactions: None under normal processing.",
    "Conditions to Avoid: Extreme temperatures, freezing, direct sunlight.",
    "Incompatible Materials: Strong oxidizing agents, strong acids, strong bases.",
    "Hazardous Decomposition Products: None known under normal use. Thermal decomposition may produce carbon oxides.",
  ]);
  return y;
}

function section11_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 11 — Toxicological Information");
  y = section_standard_text(doc, y, [
    "Acute Toxicity: Based on available data, classification criteria are not met. No acute toxicity hazards under GHS.",
    "Skin Corrosion/Irritation: May cause mild irritation upon prolonged contact. Not classified as a skin irritant.",
    "Serious Eye Damage/Irritation: May cause mild transient irritation. Not classified as an eye irritant.",
    "Respiratory/Skin Sensitization: Not classified as a respiratory or skin sensitizer.",
    "Germ Cell Mutagenicity: Not classified as a germ cell mutagen.",
    "Carcinogenicity: No component is classified as carcinogenic by IARC, NTP, or OSHA.",
    "Reproductive Toxicity: Not classified as a reproductive toxicant.",
    "STOT - Single Exposure: Not classified.",
    "STOT - Repeated Exposure: Not classified.",
    "Aspiration Hazard: Not classified.",
    "Note: This mixture has been evaluated using GHS criteria. No significant toxicological hazards are identified for the intended use of this product.",
  ]);
  return y;
}

function section12_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 12 — Ecological Information");
  y = section_standard_text(doc, y, [
    "Ecotoxicity: The components of this mixture are biodegradable surfactants. No significant environmental hazards are anticipated under normal use conditions.",
    "Persistence and Degradability: Readily biodegradable. Surfactants meet OECD biodegradability criteria.",
    "Bioaccumulative Potential: Not expected to bioaccumulate significantly.",
    "Mobility in Soil: Water-miscible. May be mobile in soil and aquatic environments.",
    "Other Adverse Effects: No known significant effects or critical hazards.",
  ]);
  return y;
}

function section13_content(doc: jsPDF, start_y: number): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 13 — Disposal Considerations");
  y = section_standard_text(doc, y, [
    "Waste Disposal: Dispose of in accordance with local, regional, and national regulations. Do not dispose of product into drains or waterways.",
    "Contaminated Packaging: Empty containers should be rinsed with water and disposed of in accordance with applicable regulations. Recycle or dispose of through licensed waste management facilities.",
    "RCRA Hazard Class (USA): Not classified as hazardous waste under RCRA.",
  ]);
  return y;
}

function section14_content(doc: jsPDF, start_y: number, settings: SdsSettings): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 14 — Transport Information");

  const ti = settings.transport_info;
  const items: [string, string][] = [
    ["UN Number", ti.un_number],
    ["UN Proper Shipping Name", ti.proper_shipping_name],
    ["Transport Hazard Class", ti.hazard_class],
    ["Packing Group", ti.packing_group],
    ["Environmental Hazard", ti.environmental_hazard],
    ["Special Precautions", ti.special_precautions],
    ["DOT (USA)", "Not regulated as dangerous goods"],
    ["IMDG (Marine)", "Not regulated"],
    ["IATA (Air)", "Not regulated"],
  ];

  const body = items.map(([label, value]) => [label, value]);

  autoTable(doc, {
    startY: y,
    head: [["Transport Category", "Information"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: CONTENT_W - 140 } },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function section15_content(doc: jsPDF, start_y: number, settings: SdsSettings): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 15 — Regulatory Information");

  const ri = settings.regulatory_info;
  const items: [string, string][] = [
    ["GHS Classification", ri.ghs_classification],
    ["US EPA", ri.us_epa],
    ["California Proposition 65", ri.california_prop65],
    ["TSCA (USA)", ri.tsca],
    ["EU CLP / GHS", ri.eu_clp],
    ["Amazon Product Safety", ri.amazon_product_safety],
  ];

  const body = items.map(([label, value]) => [label, value]);

  autoTable(doc, {
    startY: y,
    head: [["Regulation", "Status"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: CONTENT_W - 140 } },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function section16_content(doc: jsPDF, start_y: number, settings: SdsSettings): number {
  let y = start_y;
  y = draw_section_title(doc, y, "SECTION 16 — Other Information");

  const sup = settings.kit_info.supplier_name;
  y = section_standard_text(doc, y, [
    `Prepared by: Quality & Safety Department, ${sup}`,
    "",
    "Revision History:",
    "  Version 1.0 — Initial issue",
    "",
    "References:",
    "  • GHS Rev. 9 (2025) / UN GHS 16th Revised Edition (2026)",
    "  • OSHA Hazard Communication Standard 29 CFR 1910.1200",
    "  • EU Regulation (EC) No. 1272/2008 (CLP)",
    "  • Amazon SDS Compliance Guidelines",
    "",
    "Disclaimer:",
    "The information provided in this Safety Data Sheet is based on current knowledge and is intended to",
    "describe the product for safety purposes only. It does not constitute a warranty of any kind.",
    `This SDS was prepared for ${sup} by the Quality & Safety Department.`,
  ]);
  return y;
}

/* ════════════════════════════════════════════════════════
   PAGE MANAGER – handles auto page breaks
   ════════════════════════════════════════════════════════ */

const PAGE_BODY_TOP = 48;
const PAGE_BODY_BOTTOM = 48;

function check_page_break(doc: jsPDF, y: number, needed: number, product_name: string, page_tracker: { current: number }, total_pages: number): number {
  if (y + needed > PAGE_H - PAGE_BODY_BOTTOM) {
    doc.addPage();
    page_tracker.current++;
    draw_header(doc, product_name, page_tracker.current, total_pages);
    draw_footer(doc, "1.0", "", "", page_tracker.current);
    return PAGE_BODY_TOP;
  }
  return y;
}

/* ════════════════════════════════════════════════════════
   GENERATE SINGLE PRODUCT SDS
   ════════════════════════════════════════════════════════ */

export function generate_product_sds_pdf(
  product: ParsedProduct,
  settings: SdsSettings
): jsPDF {
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const total_pages = 7;
  const page_tracker = { current: 1 };

  const product_name = product.product_name;
  const date = settings.kit_info.issue_date;
  const supplier = settings.kit_info.supplier_name;
  const version = settings.kit_info.version;

  // ── Helper to add header/footer per page ──
  function setup_page(doc: jsPDF) {
    draw_header(doc, product_name, page_tracker.current, total_pages);
    draw_footer(doc, version, date, supplier, page_tracker.current);
  }

  setup_page(doc);

  // ── Page 1: Section 1 ──
  let y = PAGE_BODY_TOP;
  y = section1_content(doc, y, product, settings);
  y += 40;

  // Check if we need to fill the page or add sections 2-3 on next
  // For a nice layout, sections 2-3 go on page 2
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;

  // ── Page 2: Sections 2 + 3 ──
  y = section2_content(doc, y);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);
  y = section3_content(doc, y, product);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);

  // ── Page 3: Sections 4 + 5 + 6 ──
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;
  y = section4_content(doc, y);
  y = check_page_break(doc, y, 40, product_name, page_tracker, total_pages);
  y = section5_content(doc, y);
  y = check_page_break(doc, y, 40, product_name, page_tracker, total_pages);
  y = section6_content(doc, y);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);

  // ── Page 4: Sections 7 + 8 ──
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;
  y = section7_content(doc, y);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);
  y = section8_content(doc, y);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);

  // ── Page 5: Section 9 (Physical Properties - large table) ──
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;
  y = section9_content(doc, y, settings);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);

  // ── Page 6: Sections 10 + 11 + 12 + 13 ──
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;
  y = section10_content(doc, y);
  y = check_page_break(doc, y, 40, product_name, page_tracker, total_pages);
  y = section11_content(doc, y);
  y = check_page_break(doc, y, 40, product_name, page_tracker, total_pages);
  y = section12_content(doc, y);
  y = check_page_break(doc, y, 40, product_name, page_tracker, total_pages);
  y = section13_content(doc, y);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);

  // ── Page 7: Sections 14 + 15 + 16 ──
  doc.addPage();
  page_tracker.current++;
  setup_page(doc);
  y = PAGE_BODY_TOP;
  y = section14_content(doc, y, settings);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);
  y = section15_content(doc, y, settings);
  y = check_page_break(doc, y, 60, product_name, page_tracker, total_pages);
  y = section16_content(doc, y, settings);

  return doc;
}

/* ════════════════════════════════════════════════════════
   GENERATE PACKAGE SDS  (cover index + merged PDFs)
   ════════════════════════════════════════════════════════ */

/**
 * Generate a cover page as a jspdf document for the package index.
 */
export function generate_package_cover_page(
  products: ParsedProduct[],
  settings: SdsSettings
): jsPDF {
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const ki = settings.kit_info;
  const total_products = products.length;

  let y = PAGE_BODY_TOP + 40;

  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_DARK_BLUE);
  doc.text("SAFETY DATA SHEET PACKAGE", PAGE_W / 2, y, { align: "center" });
  y += 30;

  doc.setDrawColor(...COLOR_DARK_BLUE);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const info_items: [string, string][] = [
    ["Kit Name", ki.kit_name],
    ["ASIN", ki.asin],
    ["Supplier Name", ki.supplier_name],
    ["Issue Date", ki.issue_date],
    ["Total Products", String(total_products)],
  ];
  for (const [label, value] of info_items) {
    y = draw_kv_row(doc, y, label, value, 100);
  }
  y += 10;

  doc.setFont(FONT_BOLD, "bold");
  doc.setFontSize(FONT_SIZE_SECTION);
  doc.setTextColor(...COLOR_DARK_BLUE);
  doc.text("Product List", MARGIN, y);
  y += 10;

  const list_body = products.map((p, i) => [
    String(i + 1),
    p.product_name,
    `${ki.report_number_prefix}-${p.section.replace(".", "")}`,
    "Word document",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["No.", "Product Name", "Report No.", "Ingredients Source"]],
    body: list_body,
    theme: "grid",
    headStyles: { fillColor: [...COLOR_LIGHT_BLUE], textColor: 0, fontStyle: "bold", fontSize: 7, cellPadding: 2 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 200 },
      2: { cellWidth: 140 },
      3: { cellWidth: 130 },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });

  doc.setFont(FONT_NORMAL, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_GRAY);
  doc.text("This Safety Data Sheet Package contains individual SDS documents for each product listed above.",
    MARGIN, (doc as any).lastAutoTable.finalY + 12);
  doc.text("Each product SDS follows the GHS/UN 16-section format (16th Edition, 2026).",
    MARGIN, (doc as any).lastAutoTable.finalY + 22);

  return doc;
}

/** Convert a jspdf blob to Uint8Array for pdf-lib */
async function jsdoc_to_bytes(doc: jsPDF): Promise<Uint8Array> {
  const blob = doc.output("blob");
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Generate a single combined PDF containing:
 * 1. Package index (cover page)
 * 2. Each product's full SDS
 */
export async function generate_package_sds_pdf_merged(
  products: ParsedProduct[],
  settings: SdsSettings
): Promise<Blob> {
  // 1. Generate cover page
  const cover_doc = generate_package_cover_page(products, settings);
  const cover_bytes = await jsdoc_to_bytes(cover_doc);

  // 2. Generate each product PDF as blob
  const product_docs = products.map((p) => generate_product_sds_pdf(p, settings));
  const all_blobs = [cover_bytes, ...(await Promise.all(product_docs.map(jsdoc_to_bytes)))];

  // 3. Merge all using pdf-lib
  const merged_pdf = await PDFDocument.create();

  for (const bytes of all_blobs) {
    const src = await PDFDocument.load(bytes);
    const pages = await merged_pdf.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      merged_pdf.addPage(page);
    }
  }

  const merged_bytes = await merged_pdf.save();
  const blob_array = merged_bytes as unknown as BlobPart;
  return new Blob([blob_array], { type: "application/pdf" });
}

/**
 * Generate all SDS outputs:
 * - Individual product PDFs
 * - Combined package PDF
 * - ZIP containing all PDFs
 */
export async function generate_all_sds_outputs(
  products: ParsedProduct[],
  settings: SdsSettings
): Promise<{
  product_pdfs: { product_name: string; blob: Blob }[];
  package_pdf_blob: Blob;
  zip_blob: Blob;
}> {
  const zip = new JSZip();
  const kit_name = settings.kit_info.kit_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const product_pdfs: { product_name: string; blob: Blob }[] = [];

  // Generate individual product PDFs
  for (const product of products) {
    const doc = generate_product_sds_pdf(product, settings);
    const blob = doc.output("blob");
    const safe_name = product.product_name.replace(/[^a-zA-Z0-9_-]/g, "_");
    product_pdfs.push({ product_name: safe_name, blob });
    zip.file(`${safe_name}_SDS.pdf`, blob);
  }

  // Generate combined package PDF
  const package_blob = await generate_package_sds_pdf_merged(products, settings);
  zip.file(`${kit_name}_SDS_Package.pdf`, package_blob);

  // Generate ZIP
  const zip_blob = await zip.generateAsync({ type: "blob" });

  return { product_pdfs, package_pdf_blob: package_blob, zip_blob };
}
