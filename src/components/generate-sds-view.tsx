"use client";

import { useCallback, useState } from "react";
import {
  Download,
  FileDown,
  Loader2,
  Package,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  generate_all_sds_outputs,
  validate_for_generation,
} from "@/lib/generate-sds-pdf";
import type { ParsedSdsData, SdsSettings } from "@/lib/types";

interface GenerateSdsViewProps {
  parsed_data: ParsedSdsData;
  settings: SdsSettings;
}

export function GenerateSdsView({
  parsed_data,
  settings,
}: GenerateSdsViewProps) {
  const products = parsed_data.products;

  const [generating, set_generating] = useState(false);
  const [generated, set_generated] = useState(false);
  const [error, set_error] = useState<string>("");
  const [downloads, set_downloads] = useState<{
    product_pdfs: { product_name: string; blob: Blob }[];
    package_pdf_blob: Blob;
    zip_blob: Blob;
  } | null>(null);

  // Validate
  const validation = validate_for_generation(products, settings);
  const can_generate = validation.valid;

  const handle_generate = useCallback(async () => {
    if (!can_generate) return;

    set_generating(true);
    set_error("");
    set_downloads(null);

    try {
      const result = await generate_all_sds_outputs(products, settings);
      set_downloads(result);
      set_generated(true);
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      set_generating(false);
    }
  }, [can_generate, products, settings]);

  const download_blob = useCallback(
    (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  const kit_name_safe = settings.kit_info.kit_name.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  return (
    <div className="space-y-6">
      {/* Summary: Products + Settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-1">
              {products.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {p.section}
                  </Badge>
                  <span>{p.product_name}</span>
                  <span
                    className={cn(
                      "ml-auto font-mono",
                      Math.abs(p.percentage_total - 100) < 0.01
                        ? "text-green-600"
                        : "text-red-500"
                    )}
                  >
                    {p.percentage_total}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              Settings Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>
                <strong>Kit:</strong> {settings.kit_info.kit_name}
              </p>
              <p>
                <strong>ASIN:</strong> {settings.kit_info.asin}
              </p>
              <p>
                <strong>Supplier:</strong> {settings.kit_info.supplier_name}
              </p>
              <p>
                <strong>Version:</strong> {settings.kit_info.version}
              </p>
              <p>
                <strong>Report Prefix:</strong>{" "}
                {settings.kit_info.report_number_prefix}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation errors */}
      {!can_generate && !generating && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="py-3">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              Cannot generate PDF — fix the following errors:
            </p>
            <ul className="text-xs text-red-600 dark:text-red-300 list-disc list-inside space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Generate button */}
      {!generated && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handle_generate}
            disabled={!can_generate || generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate All PDFs
              </>
            )}
          </Button>
        </div>
      )}

      {/* Generation in progress */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Generating SDS PDFs...</p>
          <p className="text-xs text-muted-foreground mt-1">
            This may take a moment for multiple products
          </p>
        </div>
      )}

      {/* Error */}
      {error && !generating && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardContent className="py-3">
            <p className="text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              Generation failed: {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Success + Download buttons */}
      {generated && downloads && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>All PDFs generated successfully!</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Download individual PDFs */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Individual SDS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {downloads.product_pdfs.map((pdf) => (
                  <Button
                    key={pdf.product_name}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs gap-2"
                    onClick={() =>
                      download_blob(pdf.blob, `${pdf.product_name}_SDS.pdf`)
                    }
                  >
                    <FileDown className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{pdf.product_name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Download Package PDF */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Package SDS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() =>
                    download_blob(
                      downloads.package_pdf_blob,
                      `${kit_name_safe}_SDS_Package.pdf`
                    )
                  }
                >
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  <span>Download {kit_name_safe}_SDS_Package.pdf</span>
                </Button>
              </CardContent>
            </Card>

            {/* Download ZIP */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  ZIP Archive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={() =>
                    download_blob(
                      downloads.zip_blob,
                      `${kit_name_safe}_SDS_Files.zip`
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5 shrink-0" />
                  <span>Download {kit_name_safe}_SDS_Files.zip</span>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Generated {products.length} product SDS
            {products.length > 1 ? "es" : ""},{" "}
            {downloads.product_pdfs.length + 1} PDF files total
          </p>
        </div>
      )}
    </div>
  );
}
