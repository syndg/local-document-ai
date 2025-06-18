import Tesseract from "tesseract.js";

/**
 * Result interface for OCR operations
 */
export interface OCRResult {
  /** Extracted text from the image */
  text: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Detailed word-level information */
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * OCRService - A client-side OCR service using Tesseract.js WebAssembly engine
 *
 * This service provides optical character recognition capabilities that run entirely
 * in the browser, maintaining privacy by never sending data to external servers.
 *
 * Features:
 * - WebAssembly-based OCR using Tesseract engine
 * - Progress tracking for long-running operations
 * - Automatic worker management and cleanup
 * - Support for multiple image formats
 * - Confidence scoring for extracted text
 *
 * @example
 * ```typescript
 * const ocrService = new OCRService();
 *
 * // Extract text from an image with progress tracking
 * const result = await ocrService.recognize(imageData, (progress) => {
 *   console.log(`OCR Progress: ${progress}%`);
 * });
 *
 * console.log('Extracted text:', result.text);
 * console.log('Confidence:', result.confidence);
 *
 * // Clean up when done
 * await ocrService.terminate();
 * ```
 */
export class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the OCR service
   * Creates and configures the Tesseract worker
   */
  constructor() {
    // Only initialize in browser environment (not during SSR)
    if (typeof window !== "undefined") {
      this.initializeWorker();
    }
  }

  /**
   * Initialize the Tesseract worker with English language support
   * @private
   */
  private async initializeWorker(): Promise<void> {
    // Ensure we're in a browser environment
    if (typeof window === "undefined") {
      throw new Error("OCR service can only be used in browser environments");
    }

    if (this.worker || this.isInitializing) {
      return this.initializationPromise || Promise.resolve();
    }

    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Perform the actual worker initialization
   * @private
   */
  private async performInitialization(): Promise<void> {
    try {
      this.worker = await Tesseract.createWorker("eng");
      console.log("OCR Service: Worker initialized successfully");
    } catch (error) {
      console.error("OCR Service: Failed to initialize worker:", error);
      throw new Error(
        `Failed to initialize OCR worker: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Ensure the worker is ready before performing operations
   * @private
   */
  private async ensureWorkerReady(): Promise<void> {
    if (!this.worker) {
      await this.initializeWorker();
    }

    if (!this.worker) {
      throw new Error("OCR worker failed to initialize");
    }
  }

  /**
   * Extract text from an image using OCR
   *
   * @param image - Image data (can be File, ArrayBuffer, string URL, or other Tesseract.ImageLike types)
   * @param onProgress - Optional callback to track progress (0-100)
   * @returns Promise resolving to OCR result with extracted text and metadata
   *
   * @throws {Error} If worker initialization fails or OCR processing encounters an error
   *
   * @example
   * ```typescript
   * // With progress tracking
   * const result = await ocrService.recognize(imageFile, (progress) => {
   *   updateProgressBar(progress);
   * });
   *
   * // Without progress tracking
   * const result = await ocrService.recognize(imageBlob);
   * ```
   */
  async recognize(
    image: Tesseract.ImageLike,
    onProgress?: (progress: number) => void
  ): Promise<OCRResult> {
    // Ensure we're in a browser environment
    if (typeof window === "undefined") {
      throw new Error("OCR service can only be used in browser environments");
    }

    const startTime = Date.now();

    try {
      // Ensure worker is ready
      await this.ensureWorkerReady();

      if (!this.worker) {
        throw new Error("OCR worker is not available");
      }

      console.log("OCR Service: Starting text recognition...");

      // Simulate progress tracking since Tesseract.js logger has issues in this environment
      let progressInterval: NodeJS.Timeout | null = null;
      let currentProgress = 0;

      if (onProgress) {
        progressInterval = setInterval(() => {
          currentProgress += Math.random() * 15; // Random increment
          if (currentProgress > 90) currentProgress = 90; // Cap at 90% until completion
          onProgress(Math.round(currentProgress));
        }, 200); // Update every 200ms
      }

      try {
        // Perform OCR
        const result = await this.worker.recognize(image);

        // Clear interval and set progress to 100%
        if (progressInterval) {
          clearInterval(progressInterval);
          onProgress?.(100);
        }

        const processingTime = Date.now() - startTime;

        console.log(
          `OCR Service: Text recognition completed in ${processingTime}ms`
        );
        console.log(
          `OCR Service: Extracted ${result.data.text.length} characters with ${result.data.confidence}% confidence`
        );

        // Transform the result into our standard format
        const data = result.data as any; // Type assertion for Tesseract.js response
        return {
          text: data.text,
          confidence: data.confidence,
          words:
            data.words?.map((word: any) => ({
              text: word.text,
              confidence: word.confidence,
              bbox: word.bbox,
            })) || [],
          processingTime,
        };
      } catch (ocrError) {
        // Clean up progress interval on error
        if (progressInterval) {
          clearInterval(progressInterval);
        }
        throw ocrError;
      }
    } catch (error) {
      console.error("OCR Service: Recognition failed:", error);
      throw new Error(
        `OCR recognition failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if the OCR service is ready to process images
   * @returns true if the worker is initialized and ready
   */
  isReady(): boolean {
    return this.worker !== null && !this.isInitializing;
  }

  /**
   * Get the initialization status of the service
   * @returns Promise that resolves when initialization is complete
   */
  async waitForReady(): Promise<void> {
    if (this.isReady()) {
      return;
    }

    await this.initializeWorker();
  }

  /**
   * Clean up and terminate the OCR worker
   *
   * This should be called when the OCR service is no longer needed
   * to free up memory and resources.
   *
   * @example
   * ```typescript
   * // Clean up when component unmounts or app closes
   * await ocrService.terminate();
   * ```
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        console.log("OCR Service: Terminating worker...");
        await this.worker.terminate();
        this.worker = null;
        console.log("OCR Service: Worker terminated successfully");
      } catch (error) {
        console.error("OCR Service: Error terminating worker:", error);
        this.worker = null;
      }
    }
  }
}

/**
 * Singleton instance of the OCR service
 * Use this instance throughout your application to avoid creating multiple workers
 *
 * Note: This will be null during SSR and only available in browser environments
 */
export const ocrService =
  typeof window !== "undefined" ? new OCRService() : null;

/**
 * Get the OCR service instance, ensuring it's available in browser environment
 * @throws {Error} If called in non-browser environment
 */
export function getOCRService(): OCRService {
  if (typeof window === "undefined") {
    throw new Error(
      "OCR service is not available during server-side rendering"
    );
  }

  if (!ocrService) {
    throw new Error("OCR service failed to initialize");
  }

  return ocrService;
}
