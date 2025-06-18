import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Image,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  File,
  Trash2,
  Download,
  Eye,
  MoreHorizontal,
  Cpu,
} from "lucide-react";
import { securityService, SecurityService } from "@/services/security/security";
import { OCRProcessingModal } from "./OCRProcessingModal";
import type { Document } from "@/types/database";

interface DocumentsTableProps {
  /** Array of documents to display */
  documents: Document[];
  /** Callback function to refresh the document list */
  onRefresh: () => void;
}

/**
 * DocumentsTable component that displays documents in a table format with dropdown actions
 * @param props - Component props containing documents array and refresh callback
 * @returns JSX element containing the documents table
 */
export function DocumentsTable({ documents, onRefresh }: DocumentsTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrDocument, setOcrDocument] = useState<Document | null>(null);
  const [ocrDocumentData, setOcrDocumentData] = useState<ArrayBuffer | null>(
    null
  );

  /**
   * Get the appropriate icon for a document based on its MIME type
   * @param type - MIME type of the document
   * @returns JSX element with the appropriate icon
   */
  const getDocumentIcon = (type: string) => {
    const iconProps = { size: 16, className: "text-gray-500" };

    switch (true) {
      case type.startsWith("image/"):
        return <Image {...iconProps} />;
      case type.includes("pdf") || type.includes("text"):
        return <FileText {...iconProps} />;
      case type.includes("spreadsheet") || type.includes("excel"):
        return <FileSpreadsheet {...iconProps} />;
      case type.startsWith("video/"):
        return <FileVideo {...iconProps} />;
      case type.startsWith("audio/"):
        return <FileAudio {...iconProps} />;
      default:
        return <File {...iconProps} />;
    }
  };

  /**
   * Format file size in bytes to human-readable format
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  /**
   * Format date to readable string
   * @param date - Date object to format
   * @returns Formatted date string
   */
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Truncate text to a maximum length with ellipsis
   * @param text - Text to truncate
   * @param maxLength - Maximum length before truncation
   * @returns Truncated text with ellipsis if needed
   */
  const truncateText = (text: string, maxLength: number = 25): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  /**
   * Handle document deletion confirmation - opens the alert dialog
   * @param document - Document to delete
   */
  const handleDeleteConfirm = (document: Document) => {
    setDocToDelete(document);
  };

  /**
   * Perform the actual document deletion after confirmation
   */
  const performDelete = async () => {
    if (!docToDelete) return;

    try {
      setIsDeleting(docToDelete.id);
      const { getDbService } = await import("@/services/database/database");
      const dbService = getDbService();
      const result = await dbService.deleteDocument(docToDelete.id);

      if (result.success) {
        // After successful deletion, refresh the list
        onRefresh();
      } else {
        console.error("Failed to delete document:", result.error);
        alert("Failed to delete document. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(null);
      setDocToDelete(null);
    }
  };

  /**
   * Handle document preview
   * @param document - Document to preview
   */
  const handlePreview = async (document: Document) => {
    try {
      // TODO: Replace with password from authenticated user session
      const tempPassword = "super-secret-password-for-now";

      let documentData: ArrayBuffer;

      // Check if the document has crypto metadata (encrypted)
      if (document.metadata.crypto) {
        // Decrypt the document data
        const salt = SecurityService.base64ToArray(
          document.metadata.crypto.salt
        );
        const iv = SecurityService.base64ToArray(document.metadata.crypto.iv);

        documentData = await securityService.decrypt(
          document.encryptedData,
          tempPassword,
          salt,
          iv
        );
      } else {
        // Legacy document (not encrypted)
        documentData = document.encryptedData;
      }

      // Create a blob from the decrypted document data
      const blob = new Blob([documentData], { type: document.type });
      const url = URL.createObjectURL(blob);

      // Open in a new window/tab for preview
      const newWindow = window.open(url, "_blank");

      if (!newWindow) {
        // If popup was blocked, show an alert
        alert("Please allow popups to preview documents");
        return;
      }

      // Clean up the URL after a delay to free memory
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000); // Clean up after 1 minute
    } catch (error) {
      console.error("Failed to preview document:", error);
      if (
        error instanceof Error &&
        error.message.includes("Invalid password")
      ) {
        alert("Failed to decrypt document. Please check your password.");
      } else {
        alert(
          "Failed to preview document. This file type may not be supported for preview."
        );
      }
    }
  };

  /**
   * Handle OCR processing
   * @param document - Document to process with OCR
   */
  const handleOCRProcess = async (document: Document) => {
    try {
      // TODO: Replace with password from authenticated user session
      const tempPassword = "super-secret-password-for-now";

      let documentData: ArrayBuffer;

      // Check if the document has crypto metadata (encrypted)
      if (document.metadata.crypto) {
        // Decrypt the document data
        const salt = SecurityService.base64ToArray(
          document.metadata.crypto.salt
        );
        const iv = SecurityService.base64ToArray(document.metadata.crypto.iv);

        documentData = await securityService.decrypt(
          document.encryptedData,
          tempPassword,
          salt,
          iv
        );
      } else {
        // Legacy document (not encrypted)
        documentData = document.encryptedData;
      }

      // Set the document and data for the OCR modal
      setOcrDocument(document);
      setOcrDocumentData(documentData);
      setOcrModalOpen(true);
    } catch (error) {
      console.error("Failed to prepare document for OCR:", error);
      if (
        error instanceof Error &&
        error.message.includes("Invalid password")
      ) {
        alert("Failed to decrypt document. Please check your password.");
      } else {
        alert(
          "Failed to prepare document for OCR processing. Please try again."
        );
      }
    }
  };

  /**
   * Handle closing the OCR modal
   */
  const handleOCRModalClose = () => {
    setOcrModalOpen(false);
    setOcrDocument(null);
    setOcrDocumentData(null);
  };

  /**
   * Handle document download
   * @param document - Document to download
   */
  const handleDownload = async (document: Document) => {
    try {
      // TODO: Replace with password from authenticated user session
      const tempPassword = "super-secret-password-for-now";

      let documentData: ArrayBuffer;

      // Check if the document has crypto metadata (encrypted)
      if (document.metadata.crypto) {
        // Decrypt the document data
        const salt = SecurityService.base64ToArray(
          document.metadata.crypto.salt
        );
        const iv = SecurityService.base64ToArray(document.metadata.crypto.iv);

        documentData = await securityService.decrypt(
          document.encryptedData,
          tempPassword,
          salt,
          iv
        );
      } else {
        // Legacy document (not encrypted)
        documentData = document.encryptedData;
      }

      // Create a blob from the decrypted document data and download
      const blob = new Blob([documentData], { type: document.type });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download document:", error);
      if (
        error instanceof Error &&
        error.message.includes("Invalid password")
      ) {
        alert("Failed to decrypt document. Please check your password.");
      } else {
        alert("Failed to download document. Please try again.");
      }
    }
  };

  return (
    <div className="border rounded-lg">
      <AlertDialog
        open={!!docToDelete}
        onOpenChange={() => setDocToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              document "{docToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performDelete}
              disabled={!!isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OCRProcessingModal
        isOpen={ocrModalOpen}
        onClose={handleOCRModalClose}
        document={ocrDocument}
        documentData={ocrDocumentData}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id} className="hover:bg-gray-50">
              <TableCell>{getDocumentIcon(document.type)}</TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900">{document.name}</span>
                  {document.metadata.extension && (
                    <span className="text-xs text-gray-500 uppercase">
                      {document.metadata.extension}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600" title={document.type}>
                  {truncateText(document.type)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {formatFileSize(document.size)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-gray-600">
                  {formatDate(document.modified)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handlePreview(document)}>
                      <Eye className="mr-2 h-4 w-4" />
                      <span>Preview</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Download</span>
                    </DropdownMenuItem>
                    {document.type.startsWith("image/") && (
                      <DropdownMenuItem
                        onClick={() => handleOCRProcess(document)}
                      >
                        <Cpu className="mr-2 h-4 w-4" />
                        <span>Extract Text</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteConfirm(document)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
