import { FilePlus2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EmptyStateProps {
  /** Callback function to trigger file upload */
  onUpload: () => void;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
}

/**
 * EmptyState component displayed when no documents are present
 * @param props - Component props containing upload handler and loading state
 * @returns JSX element containing the empty state UI
 */
export function EmptyState({ onUpload, isUploading }: EmptyStateProps) {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <FilePlus2 size={40} className="text-gray-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            No Documents Yet
          </CardTitle>
          <CardDescription className="text-gray-600">
            Upload your first document to get started with AI-powered document
            processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onUpload}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <Upload size={20} />
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
          <p className="text-xs text-gray-500 mt-4">
            Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, TIFF, BMP
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
