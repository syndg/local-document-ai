import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Copy,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { getOCRService, type OCRResult } from "@/services/ocr/ocr";
import type { Document } from "@/types/database";

interface OCRProcessingModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Document to process */
  document: Document | null;
  /** Decrypted document data */
  documentData: ArrayBuffer | null;
}

/**
 * OCRProcessingModal - Modal component for processing documents with OCR
 *
 * This component handles the complete OCR workflow:
 * 1. Shows processing progress with a progress bar
 * 2. Displays extracted text in a textarea
 * 3. Provides actions to copy or download the extracted text
 * 4. Shows confidence scores and processing metrics
 *
 * The OCR processing runs entirely in the browser using WebAssembly,
 * maintaining the privacy-first architecture of the application.
 */
export function OCRProcessingModal({
  isOpen,
  onClose,
  document,
  documentData,
}: OCRProcessingModalProps) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes or document changes
  useEffect(() => {
    if (!isOpen || !document) {
      setProgress(0);
      setIsProcessing(false);
      setResult(null);
      setError(null);
    }
  }, [isOpen, document]);

  // Start OCR processing when modal opens with valid data
  useEffect(() => {
    if (
      isOpen &&
      document &&
      documentData &&
      !isProcessing &&
      !result &&
      !error
    ) {
      startOCRProcessing();
    }
  }, [isOpen, document, documentData, isProcessing, result, error]);

  /**
   * Start the OCR processing workflow
   */
  const startOCRProcessing = async () => {
    if (!document || !documentData) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Check if the document is an image type
      const isImageType = document.type.startsWith("image/");

      if (!isImageType) {
        throw new Error("OCR only supports image files (PNG, JPEG, GIF, etc.)");
      }

      console.log(`Starting OCR processing for document: ${document.name}`);

      // Create a blob from the decrypted data
      const blob = new Blob([documentData], { type: document.type });

      // Process the image with OCR
      const ocrService = getOCRService();
      const ocrResult = await ocrService.recognize(blob, (progressValue) => {
        setProgress(progressValue);
      });

      console.log(ocrResult);

      setResult(ocrResult);
      console.log(
        `OCR completed successfully. Extracted ${ocrResult.text.length} characters with ${ocrResult.confidence}% confidence`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error("OCR processing failed:", err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Copy extracted text to clipboard
   */
  const handleCopyText = async () => {
    if (!result?.text) return;

    try {
      await navigator.clipboard.writeText(result.text);
      // You could add a toast notification here
      console.log("Text copied to clipboard");
    } catch (err) {
      console.error("Failed to copy text:", err);
      // Fallback: create a temporary textarea for copying
      const textarea = window.document.createElement("textarea");
      textarea.value = result.text;
      window.document.body.appendChild(textarea);
      textarea.select();
      window.document.execCommand("copy");
      window.document.body.removeChild(textarea);
    }
  };

  /**
   * Download extracted text as a .txt file
   */
  const handleDownloadText = () => {
    if (!result?.text || !document) return;

    const textBlob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(textBlob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.name}_extracted_text.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Format processing time for display
   */
  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  /**
   * Get confidence level color and label
   */
  const getConfidenceDisplay = (confidence: number) => {
    if (confidence >= 90) {
      return {
        color: "text-green-600",
        label: "High Confidence",
        icon: CheckCircle,
      };
    } else if (confidence >= 70) {
      return {
        color: "text-yellow-600",
        label: "Medium Confidence",
        icon: AlertCircle,
      };
    } else {
      return {
        color: "text-red-600",
        label: "Low Confidence",
        icon: AlertCircle,
      };
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extract Text - {document.name}
          </DialogTitle>
          <DialogDescription>
            Processing document with Optical Character Recognition (OCR)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Processing image... This may take a few moments.
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-gray-500 text-center">
                {progress}% complete
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success State */}
          {result && (
            <div className="space-y-4 flex-1 min-h-0 flex flex-col">
              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Characters</div>
                  <div className="text-lg font-semibold">
                    {result.text.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Confidence</div>
                  <div
                    className={`text-lg font-semibold ${
                      getConfidenceDisplay(result.confidence).color
                    }`}
                  >
                    {result.confidence.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Processing Time</div>
                  <div className="text-lg font-semibold">
                    {formatProcessingTime(result.processingTime)}
                  </div>
                </div>
              </div>

              {/* Confidence Alert */}
              {result.confidence < 70 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The confidence level for this extraction is relatively low (
                    {result.confidence.toFixed(1)}%). You may want to verify the
                    extracted text manually.
                  </AlertDescription>
                </Alert>
              )}

              {/* Extracted Text */}
              <div className="flex-1 min-h-0 flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Extracted Text
                </label>
                <Textarea
                  value={result.text}
                  readOnly
                  className="flex-1 min-h-[200px] max-h-[400px] resize-none font-mono text-sm overflow-y-auto"
                  placeholder="No text was extracted from the image..."
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          {result && (
            <>
              <Button variant="outline" onClick={handleCopyText}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
              <Button onClick={handleDownloadText}>
                <Download className="h-4 w-4 mr-2" />
                Download Text
              </Button>
            </>
          )}

          {error && (
            <Button onClick={startOCRProcessing} disabled={isProcessing}>
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
