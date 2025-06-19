"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, FileImage } from "lucide-react";
import {
  classificationService,
  ClassificationResult,
} from "@/services/classification/classification";
import { Document } from "@/types/database";
import { renderPdfPageToImage, isPdfFile } from "@/lib/pdf-utils";

interface ClassificationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Document record to classify */
  document: Document;
  /** Raw document data as ArrayBuffer */
  documentData: ArrayBuffer;
}

type ClassificationState = "idle" | "classifying" | "success" | "error";

/**
 * Modal component for document classification using AI.
 * Shows progress during classification and displays results.
 */
export function ClassificationModal({
  isOpen,
  onClose,
  document,
  documentData,
}: ClassificationModalProps) {
  const [state, setState] = useState<ClassificationState>("idle");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const classificationRef = useRef<boolean>(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setState("idle");
      setResult(null);
      setError(null);
      setProgress(0);
      classificationRef.current = false;
    }
  }, [isOpen]);

  // Start classification when modal opens with valid data
  useEffect(() => {
    if (
      isOpen &&
      documentData &&
      !classificationRef.current &&
      state === "idle"
    ) {
      startClassification();
    }
  }, [isOpen, documentData, state]);

  const startClassification = async () => {
    // Prevent multiple simultaneous classifications
    if (classificationRef.current) return;

    classificationRef.current = true;
    setState("classifying");
    setResult(null);
    setError(null);
    setProgress(0);

    // Simulate progress for better UX (similar to OCR service)
    let progressInterval: NodeJS.Timeout | null = null;
    let currentProgress = 0;

    progressInterval = setInterval(() => {
      currentProgress += Math.random() * 15; // Random increment
      if (currentProgress > 90) currentProgress = 90; // Cap at 90% until completion
      setProgress(Math.round(currentProgress));
    }, 150); // Update every 150ms

    try {
      console.log("Starting document classification...");

      // Add a small delay to ensure progress bar is visible
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Determine the image data for classification
      let imageForClassification: Blob | ArrayBuffer;

      if (isPdfFile(document.type)) {
        console.log("Processing PDF document - rendering first page to image");
        // Render the first page of the PDF to an image Blob
        imageForClassification = await renderPdfPageToImage(documentData);
      } else {
        console.log("Processing image document");
        // It's already an image
        imageForClassification = documentData;
      }

      const classificationResult = await classificationService.classify(
        imageForClassification
      );
      // console.log("Classification completed:", classificationResult);

      // Clear interval and smoothly transition to 100%
      if (progressInterval) {
        clearInterval(progressInterval);

        // Smoothly animate from current progress to 100%
        await new Promise((resolve) => {
          const finalProgress = 100;
          const animationDuration = 500; // 500ms for smooth completion
          const startTime = Date.now();
          const startProgress = currentProgress;

          const animateToComplete = () => {
            const elapsed = Date.now() - startTime;
            const progressPercentage = Math.min(elapsed / animationDuration, 1);

            // Ease-out animation for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progressPercentage, 3);
            const animatedProgress =
              startProgress + (finalProgress - startProgress) * easeOut;

            setProgress(Math.round(animatedProgress));

            if (progressPercentage < 1) {
              requestAnimationFrame(animateToComplete);
            } else {
              // Ensure we're exactly at 100%
              setProgress(100);
              // Brief pause to show completion
              setTimeout(resolve, 200);
            }
          };

          requestAnimationFrame(animateToComplete);
        });
      }

      setResult(classificationResult);
      setState("success");
    } catch (err) {
      // Clear interval on error
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      console.error("Classification failed:", err);
      setError(err instanceof Error ? err.message : "Classification failed");
      setState("error");
    } finally {
      classificationRef.current = false;
    }
  };

  const handleClose = () => {
    setState("idle");
    setResult(null);
    setError(null);
    setProgress(0);
    classificationRef.current = false;
    onClose();
  };

  const getStateIcon = () => {
    switch (state) {
      case "classifying":
        return <FileImage className="h-6 w-6 animate-pulse text-blue-500" />;
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <FileImage className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStateTitle = () => {
    switch (state) {
      case "classifying":
        return "Classifying Document...";
      case "success":
        return "Classification Complete";
      case "error":
        return "Classification Failed";
      default:
        return "Document Classification";
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStateIcon()}
            {getStateTitle()}
          </DialogTitle>
          <DialogDescription>
            {state === "classifying"
              ? "Using AI to analyze and classify your document..."
              : `Classification results for "${document.name}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {state === "classifying" && (
            <div className="space-y-3">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Loading AI model and analyzing document... {progress}%
              </p>
            </div>
          )}

          {state === "success" && result && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Document classification completed successfully!
                </AlertDescription>
              </Alert>

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Document Type:
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCategory(result.category)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Confidence:
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatConfidence(result.confidence)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
            {state === "error" && (
              <Button onClick={startClassification} variant="default">
                Retry
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
