// Dynamic import for PDF.js to avoid server-side issues
let pdfjsLib: typeof import("pdfjs-dist") | null = null;

// Lazy load PDF.js only on the client side
const loadPdfJs = async () => {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be used in the browser environment");
  }

  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
  }

  return pdfjsLib;
};

/**
 * Renders the first page of a PDF document to an image Blob.
 *
 * @param pdfData - The PDF document data as ArrayBuffer
 * @param scale - Scale factor for rendering (default: 2.0 for good resolution)
 * @param quality - JPEG quality (0.0 to 1.0, default: 0.9)
 * @returns Promise that resolves to an image Blob (JPEG format)
 *
 * @example
 * ```typescript
 * const pdfArrayBuffer = new ArrayBuffer(1000);
 * const imageBlob = await renderPdfPageToImage(pdfArrayBuffer);
 * // Use imageBlob for classification
 * ```
 */
export async function renderPdfPageToImage(
  pdfData: ArrayBuffer,
  scale: number = 2.0,
  quality: number = 0.9
): Promise<Blob> {
  try {
    // Load PDF.js dynamically
    const pdfjs = await loadPdfJs();

    // Load the PDF document
    const loadingTask = pdfjs.getDocument(pdfData);
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Set up the viewport with the specified scale
    const viewport = page.getViewport({ scale });

    // Create an offscreen canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get canvas 2D context");
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the page to the canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to Blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to Blob"));
          }
        },
        "image/jpeg",
        quality
      );
    });
  } catch (error) {
    console.error("Error rendering PDF page to image:", error);
    throw new Error(
      `Failed to render PDF page to image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Checks if a file type is a PDF
 * @param mimeType - The MIME type to check
 * @returns true if the file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
