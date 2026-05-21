/* ─────────────────────────────────────────────
 * Type declarations for mammoth.js
 * (No @types/mammoth package available)
 * ───────────────────────────────────────────── */

declare module "mammoth" {
  interface ExtractRawTextOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ExtractRawTextResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(
    options: ExtractRawTextOptions
  ): Promise<ExtractRawTextResult>;

  interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer;
  }

  interface ConvertToHtmlResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(
    options: ConvertToHtmlOptions
  ): Promise<ConvertToHtmlResult>;
}
