/* ============================================================
 * CAS Number Lookup Table
 *
 * Auto-fills CAS numbers for common chemical ingredients
 * found in cleaning products and SDS documents.
 *
 * Source references:
 * - PubChem (https://pubchem.ncbi.nlm.nih.gov)
 * - ECHA (https://echa.europa.eu)
 * ============================================================ */

export interface CasEntry {
  /** Canonical name */
  name: string;
  /** CAS Registry Number */
  cas: string;
  /** Alternative names / aliases to match against */
  aliases: string[];
}

const CAS_DATABASE: CasEntry[] = [
  // ── Water & Solvents ──
  { name: "Water", cas: "7732-18-5", aliases: ["H2O", "aqua", "di-water", "deionized water"] },
  { name: "Ethanol", cas: "64-17-5", aliases: ["ethyl alcohol", "alcohol", "grain alcohol"] },
  { name: "Isopropyl Alcohol", cas: "67-63-0", aliases: ["IPA", "isopropanol", "2-propanol", "rubbing alcohol"] },
  { name: "Acetone", cas: "67-64-1", aliases: ["dimethyl ketone", "2-propanone"] },
  { name: "Methanol", cas: "67-56-1", aliases: ["methyl alcohol", "wood alcohol"] },
  { name: "Butyl Glycol", cas: "111-76-2", aliases: ["2-butoxyethanol", "ethylene glycol monobutyl ether", "EGMBE"] },
  { name: "Propylene Glycol", cas: "57-55-6", aliases: ["1,2-propanediol", "propane-1,2-diol"] },
  { name: "Dipropylene Glycol", cas: "25265-71-8", aliases: ["DPG", "oxydipropanol"] },
  { name: "Diethylene Glycol", cas: "111-46-6", aliases: ["DEG", "2,2-oxydiethanol"] },
  { name: "Ethylene Glycol", cas: "107-21-1", aliases: ["1,2-ethanediol", "monoethylene glycol", "MEG"] },
  { name: "Cyclomethicone", cas: "541-02-6", aliases: ["D5", "decamethylcyclopentasiloxane"] },
  { name: "Dimethicone", cas: "9006-65-9", aliases: ["polydimethylsiloxane", "PDMS", "dimethyl silicone"] },

  // ── Surfactants / Detergents ──
  { name: "Cocamidopropyl Betaine", cas: "61789-40-0", aliases: ["CAPB", "coco betaine", "cocamidopropyl betaine"] },
  { name: "Alkyl Polyglucoside", cas: "68515-73-1", aliases: ["APG", "alkyl polyglycoside", "decyl glucoside"] },
  { name: "Decyl Glucoside", cas: "54549-25-6", aliases: ["decyl polyglucose", "decyl D-glucoside"] },
  { name: "Coco-Glucoside", cas: "141464-42-8", aliases: ["cocoyl glucoside", "coco glucoside"] },
  { name: "Capryl Glucoside", cas: "54549-24-5", aliases: ["caprylyl glucoside", "octyl glucoside"] },
  { name: "Lauryl Glucoside", cas: "110615-47-9", aliases: ["dodecyl glucoside", "lauryl polyglucose"] },
  { name: "Sodium Lauryl Sulfate", cas: "151-21-3", aliases: ["SLS", "sodium dodecyl sulfate", "SDS"] },
  { name: "Sodium Laureth Sulfate", cas: "9004-82-4", aliases: ["SLES", "sodium lauryl ether sulfate"] },
  { name: "Sodium Lauryl Sulfoacetate", cas: "1847-58-1", aliases: ["SLSA"] },
  { name: "Ammonium Lauryl Sulfate", cas: "2235-54-3", aliases: ["ALS"] },
  { name: "Ammonium Laureth Sulfate", cas: "32612-48-9", aliases: ["ALES"] },
  { name: "Coco Betaine", cas: "68424-94-2", aliases: ["cocoyl betaine", "coconut betaine"] },
  { name: "Cocamine Oxide", cas: "7128-91-8", aliases: ["coco amine oxide", "cocamidopropyl amine oxide"] },
  { name: "Lauramine Oxide", cas: "1643-20-5", aliases: ["lauryl dimethyl amine oxide", "LDAO"] },
  { name: "Cocamide DEA", cas: "68603-42-9", aliases: ["coconut diethanolamide", "cocamide diethanolamine"] },
  { name: "Cocamide MEA", cas: "68140-00-1", aliases: ["coconut monoethanolamide"] },
  { name: "Polysorbate 20", cas: "9005-64-5", aliases: ["Tween 20", "polyoxyethylene sorbitan monolaurate"] },
  { name: "Polysorbate 80", cas: "9005-65-6", aliases: ["Tween 80", "polyoxyethylene sorbitan monooleate"] },
  { name: "Sorbitan Oleate", cas: "1338-43-8", aliases: ["Span 80", "sorbitan monooleate"] },

  // ── Acids & pH Adjusters ──
  { name: "Citric Acid", cas: "77-92-9", aliases: ["2-hydroxy-1,2,3-propanetricarboxylic acid", "citrate"] },
  { name: "Sodium Citrate", cas: "68-04-2", aliases: ["trisodium citrate", "trisodium citrate dihydrate", "citrate"] },
  { name: "Citric Acid Monohydrate", cas: "5949-29-1", aliases: ["citric acid hydrate"] },
  { name: "Lactic Acid", cas: "50-21-5", aliases: ["2-hydroxypropanoic acid", "milk acid"] },
  { name: "Acetic Acid", cas: "64-19-7", aliases: ["ethanoic acid", "vinegar", "glacial acetic acid"] },
  { name: "Hydrochloric Acid", cas: "7647-01-0", aliases: ["HCl", "muriatric acid", "hydrogen chloride"] },
  { name: "Sulfuric Acid", cas: "7664-93-9", aliases: ["H2SO4", "battery acid"] },
  { name: "Phosphoric Acid", cas: "7664-38-2", aliases: ["H3PO4", "orthophosphoric acid"] },
  { name: "Sulfamic Acid", cas: "5329-14-6", aliases: ["amidosulfonic acid", "sulphamic acid"] },
  { name: "Oxalic Acid", cas: "144-62-7", aliases: ["ethanedioic acid"] },
  { name: "Salicylic Acid", cas: "69-72-7", aliases: ["2-hydroxybenzoic acid"] },

  // ── Bases & pH Adjusters ──
  { name: "Sodium Hydroxide", cas: "1310-73-2", aliases: ["NaOH", "caustic soda", "lye"] },
  { name: "Potassium Hydroxide", cas: "1310-58-3", aliases: ["KOH", "caustic potash"] },
  { name: "Ammonium Hydroxide", cas: "1336-21-6", aliases: ["NH4OH", "ammonia solution", "ammonium hydrate"] },
  { name: "Monoethanolamine", cas: "141-43-5", aliases: ["MEA", "ethanolamine", "2-aminoethanol"] },
  { name: "Diethanolamine", cas: "111-42-2", aliases: ["DEA", "2,2-iminodiethanol"] },
  { name: "Triethanolamine", cas: "102-71-6", aliases: ["TEA", "trolamine", "tris(2-hydroxyethyl)amine"] },

  // ── Preservatives ──
  { name: "Sodium Benzoate", cas: "532-32-1", aliases: ["benzoate", "sodium benzoic acid"] },
  { name: "Benzoic Acid", cas: "65-85-0", aliases: ["benzoic", "E210"] },
  { name: "Potassium Sorbate", cas: "590-00-1", aliases: ["potassium (2E)-hexa-2,4-dienoate", "E202"] },
  { name: "Sorbic Acid", cas: "110-44-1", aliases: ["2,4-hexadienoic acid"] },
  { name: "Methylparaben", cas: "99-76-3", aliases: ["methyl paraben", "methyl 4-hydroxybenzoate", "E218"] },
  { name: "Ethylparaben", cas: "120-47-8", aliases: ["ethyl 4-hydroxybenzoate", "E214"] },
  { name: "Propylparaben", cas: "94-13-3", aliases: ["propyl 4-hydroxybenzoate", "E216"] },
  { name: "Phenoxyethanol", cas: "122-99-6", aliases: ["2-phenoxyethanol", "ethylene glycol monophenyl ether"] },
  { name: "Benzalkonium Chloride", cas: "63449-41-2", aliases: ["BAC", "alkyl dimethyl benzyl ammonium chloride", "quat"] },
  { name: "Sodium Metabisulfite", cas: "7681-57-4", aliases: ["sodium pyrosulfite", "disodium disulfite"] },
  { name: "Formaldehyde", cas: "50-00-0", aliases: ["formalin", "methanal"] },
  { name: "Glutaraldehyde", cas: "111-30-8", aliases: ["glutaral", "pentanedial", "Gluteraldehyde"] },
  { name: "MIT", cas: "2682-20-4", aliases: ["methylisothiazolinone", "2-methyl-4-isothiazolin-3-one"] },
  { name: "CMIT/MIT", cas: "55965-84-9", aliases: ["Kathon", "methylchloroisothiazolinone", "CIT/MIT"] },

  // ── Chelating Agents ──
  { name: "EDTA", cas: "60-00-4", aliases: ["ethylenediaminetetraacetic acid", "edetic acid", "EDTA acid"] },
  { name: "Tetrasodium EDTA", cas: "64-02-8", aliases: ["EDTA tetrasodium", "Na4EDTA"] },
  { name: "Disodium EDTA", cas: "139-33-3", aliases: ["EDTA disodium", "Na2EDTA"] },
  { name: "MGDA", cas: "164462-16-2", aliases: ["methylglycinediacetic acid", "trilon M"] },
  { name: "GLDA", cas: "51953-17-4", aliases: ["glutamic acid diacetic acid", "dissolvine GL"] },
  { name: "Sodium Gluconate", cas: "527-07-1", aliases: ["sodium (2R,3S,4R,5R)-2,3,4,5,6-pentahydroxyhexanoate"] },
  { name: "Phosphonates", cas: "6419-19-8", aliases: ["HEDP", "etidronic acid", "1-hydroxyethylidene-1,1-diphosphonic acid"] },

  // ── Thickeners & Polymers ──
  { name: "Xanthan Gum", cas: "11138-66-2", aliases: ["xanthan", "xanthan gum"] },
  { name: "Acrylates Copolymer", cas: "25035-69-0", aliases: ["acrylic polymer", "carbomer", "polyacrylate"] },
  { name: "Carbomer", cas: "9007-20-9", aliases: ["carbopol", "polyacrylic acid"] },
  { name: "Hydroxyethyl Cellulose", cas: "9004-62-0", aliases: ["HEC", "cellulose hydroxyethyl ether"] },
  { name: "Hydroxypropyl Methylcellulose", cas: "9004-65-3", aliases: ["HPMC", "hypromellose"] },

  // ── Fragrance & Dyes ──
  { name: "Fragrance", cas: "", aliases: ["parfum", "perfume", "essential oil blend", "aroma"] },
  { name: "Dye", cas: "", aliases: ["colorant", "CI", "pigment"] },
  { name: "Limonene", cas: "5989-27-5", aliases: ["d-limonene", "dipentene", "orange oil"] },
  { name: "Linalool", cas: "78-70-6", aliases: ["3,7-dimethyl-1,6-octadien-3-ol"] },
  { name: "Citronellol", cas: "106-22-9", aliases: ["3,7-dimethyl-6-octen-1-ol"] },
  { name: "Coumarin", cas: "91-64-5", aliases: ["2H-chromen-2-one", "1,2-benzopyrone"] },
  { name: "Geraniol", cas: "106-24-1", aliases: ["trans-3,7-dimethyl-2,6-octadien-1-ol"] },

  // ── Glycerin / Humectants ──
  { name: "Glycerin", cas: "56-81-5", aliases: ["glycerol", "glycerine", "1,2,3-propanetriol"] },
  { name: "Sorbitol", cas: "50-70-4", aliases: ["D-glucitol", "sorbitol solution", "E420"] },
  { name: "Urea", cas: "57-13-6", aliases: ["carbamide", "urea"] },

  // ── Enzymes ──
  { name: "Protease", cas: "9014-01-1", aliases: ["subtilisin", "proteolytic enzyme"] },
  { name: "Amylase", cas: "9000-90-2", aliases: ["alpha-amylase"] },
  { name: "Lipase", cas: "9001-62-1", aliases: ["triacylglycerol lipase"] },
  { name: "Cellulase", cas: "9012-54-8", aliases: ["cellulase enzyme"] },
  { name: "Mannanase", cas: "37288-54-3", aliases: ["beta-mannanase", "mannan endo-1,4-beta-mannosidase"] },

  // ── Bleach / Oxidizers ──
  { name: "Sodium Hypochlorite", cas: "7681-52-9", aliases: ["bleach", "NaClO", "chlorine bleach"] },
  { name: "Hydrogen Peroxide", cas: "7722-84-1", aliases: ["H2O2", "peroxide", "hydrogen dioxide"] },
  { name: "Sodium Percarbonate", cas: "15630-89-4", aliases: ["SPC", "sodium carbonate peroxide"] },
  { name: "Sodium Perborate", cas: "7632-04-4", aliases: ["sodium perborate tetrahydrate"] },
  { name: "Sodium Carbonate Peroxide", cas: "15630-89-4", aliases: ["sodium percarbonate"] },

  // ── Buffers & Salts ──
  { name: "Sodium Bicarbonate", cas: "144-55-8", aliases: ["baking soda", "NaHCO3", "sodium hydrogen carbonate"] },
  { name: "Sodium Carbonate", cas: "497-19-8", aliases: ["soda ash", "Na2CO3", "washing soda"] },
  { name: "Sodium Silicate", cas: "6834-92-0", aliases: ["water glass", "Na2SiO3"] },
  { name: "Sodium Metasilicate", cas: "6834-92-0", aliases: ["sodium silicate"] },
  { name: "Sodium Sulfate", cas: "7757-82-6", aliases: ["Na2SO4", "Glauber's salt"] },
  { name: "Sodium Chloride", cas: "7647-14-5", aliases: ["NaCl", "table salt", "salt"] },
  { name: "Sodium Xylene Sulfonate", cas: "1300-72-7", aliases: ["SXS", "sodium dimethylbenzenesulfonate"] },
  { name: "Sodium Cumenesulfonate", cas: "28348-53-0", aliases: ["SCS", "sodium cumenesulfonate"] },
  { name: "Magnesium Sulfate", cas: "7487-88-9", aliases: ["MgSO4", "Epsom salt"] },
  { name: "Calcium Chloride", cas: "10043-52-4", aliases: ["CaCl2", "calcium dichloride"] },
];

/* ───── Lookup function ───── */

/**
 * Normalize a chemical name for matching.
 * - Trims whitespace
 * - Lowercases
 * - Removes trailing/leading whitespace artifacts
 * - Collapses multiple spaces
 */
function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;]+$/, "");
}

/**
 * Look up the CAS number for a chemical name.
 * Returns the CAS string (possibly empty for things like "Fragrance")
 * or null if no match found.
 */
export function lookup_cas(chemical_name: string): string | null {
  const normalized = normalize(chemical_name);

  // 1. Exact match on canonical name
  for (const entry of CAS_DATABASE) {
    if (normalize(entry.name) === normalized) {
      return entry.cas || null;
    }
  }

  // 2. Match on aliases
  for (const entry of CAS_DATABASE) {
    for (const alias of entry.aliases) {
      if (normalize(alias) === normalized) {
        return entry.cas || null;
      }
    }
  }

  // 3. Fuzzy: check if chemical name contains any canonical name
  for (const entry of CAS_DATABASE) {
    const canon = normalize(entry.name);
    if (normalized.includes(canon) && canon.length > 3) {
      return entry.cas || null;
    }
    // Check aliases too
    for (const alias of entry.aliases) {
      const norm_alias = normalize(alias);
      if (normalized.includes(norm_alias) && norm_alias.length > 3) {
        return entry.cas || null;
      }
    }
  }

  return null;
}

/**
 * Get the number of entries in the CAS database.
 */
export function cas_database_size(): number {
  return CAS_DATABASE.length;
}
