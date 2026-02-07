import { formatDateForFilename } from "./date";

/**
 * Options for generating export filename
 */
export interface ExportFilenameOptions {
  prefix?: string;
  pageNumber?: number;
  totalPages?: number;
  scale?: 1 | 2 | 3;
  extension?: string;
}

/**
 * Generate a filename for exported images
 *
 * @example
 * generateExportFilename() // "ctxport-2024-01-31-143022.png"
 * generateExportFilename({ pageNumber: 1, totalPages: 3 }) // "ctxport-2024-01-31-143022-001.png"
 * generateExportFilename({ prefix: "chatgpt" }) // "chatgpt-2024-01-31-143022.png"
 */
export function generateExportFilename(
  options: ExportFilenameOptions = {},
): string {
  const {
    prefix = "ctxport",
    pageNumber,
    totalPages,
    extension = "png",
  } = options;

  const datePart = formatDateForFilename();

  let filename = `${prefix}-${datePart}`;

  // Add page number if multi-page export
  if (pageNumber !== undefined && totalPages !== undefined && totalPages > 1) {
    const pageStr = pageNumber.toString().padStart(3, "0");
    filename += `-${pageStr}`;
  }

  return `${filename}.${extension}`;
}

/**
 * Generate a filename for ZIP archive
 */
export function generateZipFilename(prefix = "ctxport"): string {
  return generateExportFilename({ prefix, extension: "zip" });
}

/**
 * Sanitize a string for use in filenames
 * Removes or replaces characters that are invalid in file names
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-") // Replace invalid chars
    .replace(/\s+/g, "-") // Replace spaces
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim dashes from ends
    .substring(0, 100); // Limit length
}
