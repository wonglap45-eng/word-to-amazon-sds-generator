"use client";

import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ParsedProduct, ParsedSdsData } from "@/lib/types";

interface ParsedDataTableProps {
  data: ParsedSdsData;
}

/** Format percentage for display */
function fmt_pct(value: number | null, raw: string): string {
  if (value !== null) return `${value}%`;
  return raw || "—";
}

/** Determine badge color based on total */
function total_badge(total: number) {
  const diff = Math.abs(total - 100);
  if (diff < 0.01) return { color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400" as const, label: "100%" };
  if (diff < 1) return { color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400" as const, label: `${total}% (off by ${diff.toFixed(2)}%)` };
  return { color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" as const, label: `${total}%` };
}

export function ParsedDataTable({ data }: ParsedDataTableProps) {
  if (!data.products || data.products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">No products detected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Could not parse any product sections from the uploaded document.
          Make sure the document contains section headers like &quot;3.1 Product Name&quot;
          with a composition table.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {data.products.length} product{data.products.length > 1 ? "s" : ""} detected
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Parsed at {new Date(data.parsed_at).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {data.products.length} section{data.products.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Product cards */}
      {data.products.map((product, idx) => (
        <ProductCard key={`${product.section}-${idx}`} product={product} index={idx} />
      ))}
    </div>
  );
}

function ProductCard({ product, index }: { product: ParsedProduct; index: number }) {
  const badge = total_badge(product.percentage_total);
  const total_ok = Math.abs(product.percentage_total - 100) < 0.01;
  const has_missing = product.ingredients.some((i) => i.percentage === null);
  const cas_auto_filled_count = product.ingredients.filter((i) => i.is_cas_auto_filled).length;
  const has_empty_cas = product.ingredients.some((i) => !i.cas_number && !i.is_cas_auto_filled);
  const row_count = product.ingredients.length;

  return (
    <Card key={index} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0 text-xs">
                {product.section}
              </Badge>
              <CardTitle className="text-base">{product.product_name}</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {row_count} ingredient{row_count > 1 ? "s" : ""}
              {has_missing && " · Some percentages unreadable"}
              {cas_auto_filled_count > 0 && ` · ${cas_auto_filled_count} CAS auto-filled`}
              {has_empty_cas && " · Some CAS numbers still missing"}
            </p>
          </div>

          {/* Percentage total badge */}
          <div className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", badge.color)}>
            {total_ok ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            Total: {badge.label}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  Chemical Composition
                </th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                  CAS No.
                </th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {product.ingredients.map((ing, i) => {
                const pct_is_valid = ing.percentage !== null;
                return (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      !pct_is_valid && "bg-yellow-50/50 dark:bg-yellow-950/10"
                    )}
                  >
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">
                      {ing.chemical_composition}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ing.cas_number ? (
                        <span className={cn(
                          ing.is_cas_auto_filled && "text-blue-600 dark:text-blue-400"
                        )}>
                          {ing.cas_number}
                          {ing.is_cas_auto_filled && (
                            <span className="ml-1 text-[10px] text-blue-500 dark:text-blue-400">auto</span>
                          )}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/60">
                          N/A
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2 text-right font-mono tabular-nums",
                        pct_is_valid
                          ? "text-foreground"
                          : "text-yellow-600 dark:text-yellow-400"
                      )}
                    >
                      {fmt_pct(ing.percentage, ing.percentage_raw)}
                    </td>
                  </tr>
                );
              })}

              {/* Totals row */}
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
              </tr>
            </tbody>
          </table>
        </div>

        {/* Warning banner if total is not 100% */}
        {!total_ok && (
          <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Percentage total is {product.percentage_total}%, not 100%.
              {product.percentage_total < 100
                ? ` Missing ${(100 - product.percentage_total).toFixed(2)}%.`
                : ` Exceeds by ${(product.percentage_total - 100).toFixed(2)}%.`}
              Please verify the ingredient data.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
