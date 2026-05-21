"use client";

import { useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParsedProduct, ParsedSdsData, Ingredient } from "@/lib/types";

/* ───── Validation helpers ───── */

const PCT_TOLERANCE = 0.01;

export interface ProductValidation {
  name_empty: boolean;
  no_ingredients: boolean;
  total_off: boolean;
  total: number;
  has_invalid_pct: boolean; // ingredient has unreadable percentage
}

export function validate_product(product: ParsedProduct): ProductValidation {
  const name_empty = !product.product_name.trim();
  const no_ingredients = product.ingredients.length === 0;
  const total_off = Math.abs(product.percentage_total - 100) > PCT_TOLERANCE;
  const has_invalid_pct = product.ingredients.some((i) => i.percentage === null);
  return { name_empty, no_ingredients, total_off, total: product.percentage_total, has_invalid_pct };
}

export function all_products_valid(products: ParsedProduct[]): boolean {
  return products.every((p) => {
    const v = validate_product(p);
    return !v.name_empty && !v.no_ingredients && !v.total_off;
  });
}

/* ───── Recalculate total ───── */

function recalc_total(ingredients: Ingredient[]): number {
  let total = 0;
  for (const ing of ingredients) {
    if (ing.percentage !== null) total += ing.percentage;
  }
  return Math.round(total * 100) / 100;
}

/* ───── Props ───── */

interface ParsedDataEditorProps {
  data: ParsedSdsData;
  on_data_change: (data: ParsedSdsData) => void;
}

/* ───── Component ───── */

export function ParsedDataEditor({ data, on_data_change }: ParsedDataEditorProps) {
  /** Update a product at index */
  const update_product = useCallback(
    (index: number, updated: ParsedProduct) => {
      const new_products = [...data.products];
      new_products[index] = updated;
      on_data_change({ ...data, products: new_products });
    },
    [data, on_data_change]
  );

  if (!data.products || data.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">No products detected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Could not parse any product sections from the uploaded document.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.products.length} product{data.products.length > 1 ? "s" : ""} — click fields to edit
        </p>
        <Badge variant="outline" className="text-xs">
          Editable mode
        </Badge>
      </div>

      {data.products.map((product, idx) => (
        <EditorProductCard
          key={idx}
          product={product}
          index={idx}
          on_update={(updated) => update_product(idx, updated)}
        />
      ))}
    </div>
  );
}

/* ───── Single product card (editable) ───── */

function EditorProductCard({
  product,
  index,
  on_update,
}: {
  product: ParsedProduct;
  index: number;
  on_update: (p: ParsedProduct) => void;
}) {
  const validation = validate_product(product);
  const total_ok = !validation.total_off;
  const badge_color = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
    total_ok && !validation.name_empty && !validation.no_ingredients
      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
  );

  /* ── Field updaters ── */

  const set_product_name = (val: string) => {
    on_update({ ...product, product_name: val });
  };

  const set_ingredient = (i: number, field: keyof Ingredient, val: string) => {
    const ings = [...product.ingredients];
    if (field === "chemical_composition") {
      ings[i] = { ...ings[i], chemical_composition: val };
    } else if (field === "cas_number") {
      ings[i] = { ...ings[i], cas_number: val, is_cas_auto_filled: false };
    } else if (field === "percentage_raw") {
      const pct = parse_pct_input(val);
      ings[i] = {
        ...ings[i],
        percentage_raw: val,
        percentage: pct,
      };
    }
    on_update({ ...product, ingredients: ings, percentage_total: recalc_total(ings) });
  };

  const add_row = () => {
    const new_ing: Ingredient = {
      chemical_composition: "",
      cas_number: "",
      percentage: null,
      percentage_raw: "",
    };
    const ings = [...product.ingredients, new_ing];
    on_update({ ...product, ingredients: ings, percentage_total: recalc_total(ings) });
  };

  const delete_row = (i: number) => {
    const ings = product.ingredients.filter((_, idx) => idx !== i);
    on_update({ ...product, ingredients: ings, percentage_total: recalc_total(ings) });
  };

  /* ── Render ── */

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          {/* Product name input */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="shrink-0 text-xs">
                {product.section}
              </Badge>
              <span className="text-xs text-muted-foreground">Product Name</span>
            </div>
            <input
              type="text"
              value={product.product_name}
              onChange={(e) => set_product_name(e.target.value)}
              placeholder="Enter product name"
              className={cn(
                "w-full rounded-md border bg-transparent px-3 py-1.5 text-sm font-medium outline-none transition-colors",
                "focus:border-primary focus:ring-1 focus:ring-primary",
                validation.name_empty
                  ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                  : "border-border hover:border-primary/50"
              )}
            />
            {validation.name_empty && (
              <p className="text-[11px] text-red-500 mt-1">Product name cannot be empty</p>
            )}
          </div>

          {/* Total badge */}
          <div className={badge_color}>
            {total_ok ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Total: {product.percentage_total}%
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Ingredients table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t bg-muted/50">
                <th className="w-8 px-2 py-2"></th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                  Chemical Composition
                </th>
                <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                  CAS No.
                </th>
                <th className="w-24 px-2 py-2 text-right font-medium text-muted-foreground">
                  Percentage
                </th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {product.ingredients.map((ing, i) => {
                const pct_valid = ing.percentage !== null;
                return (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors hover:bg-muted/20",
                      !pct_valid && "bg-yellow-50/50 dark:bg-yellow-950/10"
                    )}
                  >
                    {/* Row number */}
                    <td className="px-2 py-1.5 text-center text-muted-foreground select-none">
                      {i + 1}
                    </td>

                    {/* Chemical Composition */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ing.chemical_composition}
                        onChange={(e) => set_ingredient(i, "chemical_composition", e.target.value)}
                        placeholder="Chemical name"
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none hover:border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </td>

                    {/* CAS No. */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ing.cas_number}
                        onChange={(e) => set_ingredient(i, "cas_number", e.target.value)}
                        placeholder={ing.is_cas_auto_filled ? `Auto: ${ing.cas_number}` : "CAS No."}
                        className={cn(
                          "w-full rounded border border-transparent bg-transparent px-2 py-1 outline-none transition-colors",
                          "hover:border-border focus:border-primary focus:ring-1 focus:ring-primary",
                          ing.is_cas_auto_filled && "text-blue-600 dark:text-blue-400"
                        )}
                      />
                    </td>

                    {/* Percentage */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="text"
                          value={ing.percentage_raw}
                          onChange={(e) => set_ingredient(i, "percentage_raw", e.target.value)}
                          placeholder="%"
                          className={cn(
                            "w-full max-w-[80px] rounded border border-transparent bg-transparent px-2 py-1 text-right font-mono tabular-nums outline-none transition-colors",
                            "hover:border-border focus:border-primary focus:ring-1 focus:ring-primary",
                            !pct_valid && "text-yellow-600 dark:text-yellow-400"
                          )}
                        />
                      </div>
                    </td>

                    {/* Delete button */}
                    <td className="px-1 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => delete_row(i)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals row */}
            <tfoot>
              <tr className="border-t-2 bg-muted/30 font-medium">
                <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">
                  Total
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-right font-mono tabular-nums",
                    total_ok ? "text-green-600" : "text-red-600"
                  )}
                >
                  {product.percentage_total}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add row button */}
        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={add_row}
            className="h-7 text-xs text-muted-foreground hover:text-primary gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add ingredient
          </Button>
        </div>

        {/* Validation messages */}
        <div className="space-y-1 px-4 pb-3">
          {validation.no_ingredients && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>At least one ingredient is required.</span>
            </div>
          )}
          {validation.total_off && !validation.no_ingredients && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Percentage total is {product.percentage_total}%.
                {product.percentage_total < 100
                  ? ` Missing ${(100 - product.percentage_total).toFixed(2)}%.`
                  : ` Exceeds by ${(product.percentage_total - 100).toFixed(2)}%.`}
              </span>
            </div>
          )}
          {validation.has_invalid_pct && !validation.total_off && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-500">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Some percentages are not valid numbers.</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───── Parse percentage input ───── */

function parse_pct_input(raw: string): number | null {
  const trimmed = raw.trim().replace(/%$/, "").trim();
  if (trimmed === "") return null;
  const val = parseFloat(trimmed);
  return isNaN(val) ? null : val;
}
