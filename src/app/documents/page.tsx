"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { EmptyState } from "@/components/documents/EmptyState";
import { useDatabase } from "@/hooks/use-database";
import { securityService, SecurityService } from "@/services/security/security";
import type { Document } from "@/types/database";

/**
 * Documents page component that displays a list of documents and handles file uploads
 * @returns JSX element containing the documents interface
 */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbService = useDatabase();

  /**
   * Fetch all documents from the database on component mount
   */
  useEffect(() => {
    if (dbService) {
      fetchDocuments();
    }
  }, [dbService]);

  /**
   * Fetch documents from the database and update state
   */
  const fetchDocuments = async () => {
    if (!dbService) return;

    try {
      setIsLoading(true);
      const result = await dbService.getAllDocuments();
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle file upload process
   * @param event - File input change event
   */
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // TODO: Replace with password from authenticated user session
      const tempPassword = "super-secret-password-for-now";

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Create a simple hash of the original file content (before encryption)
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Encrypt the document data
      const encryptedPayload = await securityService.encrypt(
        arrayBuffer,
        tempPassword
      );

      // Create document object with encrypted data
      const newDocument: Document = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || "application/octet-stream",
        encryptedData: encryptedPayload.ciphertext,
        size: file.size,
        hash: hashHex,
        created: new Date(),
        modified: new Date(),
        metadata: {
          extension: file.name.split(".").pop()?.toLowerCase(),
          tags: [],
          customProperties: {},
          crypto: {
            iv: SecurityService.arrayToBase64(encryptedPayload.iv),
            salt: SecurityService.arrayToBase64(encryptedPayload.salt),
          },
        },
      };

      // Save to database
      if (!dbService) {
        alert("Database not available. Please refresh the page.");
        return;
      }

      const result = await dbService.addDocument(newDocument);
      if (result.success) {
        // Refresh the document list
        await fetchDocuments();

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        console.error("Failed to save document:", result.error);
        alert("Failed to upload document. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Trigger file input click
   */
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-2">
              Manage and process your documents with AI-powered tools
            </p>
          </div>
          {documents.length > 0 && (
            <Button
              onClick={triggerFileUpload}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload size={20} />
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.tiff,.bmp"
      />

      {/* Content */}
      {documents.length === 0 ? (
        <EmptyState onUpload={triggerFileUpload} isUploading={isUploading} />
      ) : (
        <DocumentsTable documents={documents} onRefresh={fetchDocuments} />
      )}
    </div>
  );
}
