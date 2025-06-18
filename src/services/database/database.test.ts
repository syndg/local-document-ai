import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "./database";
import type {
  Document,
  ProcessingResult,
  DocumentTemplate,
} from "../../types/database";

// Helper function to create test documents
const createTestDocument = (overrides: Partial<Document> = {}): Document => ({
  id: crypto.randomUUID(),
  name: "test-document.pdf",
  type: "application/pdf",
  encryptedData: new ArrayBuffer(1024),
  metadata: {
    extension: "pdf",
    pageCount: 5,
    tags: ["test", "document"],
    customProperties: {},
  },
  created: new Date(),
  modified: new Date(),
  size: 1024,
  hash: "abc123def456",
  ...overrides,
});

// Helper function to create test processing results
const createTestProcessingResult = (
  documentId: string,
  overrides: Partial<ProcessingResult> = {}
): ProcessingResult => ({
  id: crypto.randomUUID(),
  documentId,
  processingType: "ocr",
  result: {
    text: "Sample extracted text",
    confidence: 0.95,
    language: "en",
  },
  confidence: 0.95,
  created: new Date(),
  processingTime: 1500,
  algorithmVersion: "1.0.0",
  status: "success",
  ...overrides,
});

// Helper function to create test templates
const createTestTemplate = (
  overrides: Partial<DocumentTemplate> = {}
): DocumentTemplate => ({
  id: crypto.randomUUID(),
  name: "Test Template",
  description: "A test template for document processing",
  documentType: "application/pdf",
  config: {
    processingRules: [
      {
        type: "ocr",
        parameters: { language: "en" },
        order: 1,
      },
    ],
    extractionRules: [
      {
        fieldName: "title",
        pattern: "^Title: (.+)$",
        valueType: "string",
        required: true,
      },
    ],
  },
  created: new Date(),
  modified: new Date(),
  isActive: true,
  version: 1,
  ...overrides,
});

describe("DatabaseService", () => {
  let dbService: DatabaseService;

  beforeEach(async () => {
    // Create a new database service instance for each test
    dbService = new DatabaseService();

    // Clear any existing data
    await dbService.clearAllData();
  });

  afterEach(async () => {
    // Clean up after each test
    await dbService.clearAllData();
    await dbService.close();
  });

  describe("Database Initialization", () => {
    it("should initialize database correctly", async () => {
      const stats = await dbService.getDatabaseStats();
      expect(stats.success).toBe(true);
      expect(stats.data).toBeDefined();
      expect(stats.data?.documentCount).toBe(0);
      expect(stats.data?.version).toBe(1);
    });

    it("should create all required object stores", async () => {
      // Test that we can perform operations on all stores
      const testDoc = createTestDocument();
      const addResult = await dbService.addDocument(testDoc);
      expect(addResult.success).toBe(true);

      const testTemplate = createTestTemplate();
      const templateResult = await dbService.addTemplate(testTemplate);
      expect(templateResult.success).toBe(true);

      const testProcessingResult = createTestProcessingResult(testDoc.id);
      const processingResult = await dbService.addProcessingResult(
        testProcessingResult
      );
      expect(processingResult.success).toBe(true);
    });
  });

  describe("Documents Store", () => {
    describe("addDocument", () => {
      it("should add a document successfully", async () => {
        const testDoc = createTestDocument();
        const result = await dbService.addDocument(testDoc);

        expect(result.success).toBe(true);
        expect(result.data).toBe(testDoc.id);
        expect(result.metadata?.recordsAffected).toBe(1);
        expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
      });

      it("should create an audit log when adding a document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const auditLogs = await dbService.getAuditLogs({ limit: 1 });
        expect(auditLogs.success).toBe(true);
        expect(auditLogs.data).toHaveLength(1);
        expect(auditLogs.data![0].action).toBe("document_add");
        expect(auditLogs.data![0].resourceId).toBe(testDoc.id);
      });

      it("should handle duplicate document IDs", async () => {
        const testDoc = createTestDocument();

        // Add document first time
        const firstResult = await dbService.addDocument(testDoc);
        expect(firstResult.success).toBe(true);

        // Try to add same document again
        const secondResult = await dbService.addDocument(testDoc);
        expect(secondResult.success).toBe(false);
        expect(secondResult.error).toBeDefined();
      });
    });

    describe("getDocument", () => {
      it("should retrieve an existing document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const result = await dbService.getDocument(testDoc.id);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBe(testDoc.id);
        expect(result.data?.name).toBe(testDoc.name);
      });

      it("should return undefined for non-existent document", async () => {
        const result = await dbService.getDocument("non-existent-id");
        expect(result.success).toBe(true);
        expect(result.data).toBeUndefined();
        expect(result.metadata?.recordsAffected).toBe(0);
      });
    });

    describe("updateDocument", () => {
      it("should update an existing document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        // Add a small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updatedDoc = { ...testDoc, name: "updated-document.pdf" };
        const result = await dbService.updateDocument(updatedDoc);

        expect(result.success).toBe(true);
        expect(result.data).toBe(testDoc.id);

        // Verify the update
        const retrievedDoc = await dbService.getDocument(testDoc.id);
        expect(retrievedDoc.data?.name).toBe("updated-document.pdf");
        expect(retrievedDoc.data?.modified.getTime()).toBeGreaterThan(
          testDoc.modified.getTime()
        );
      });

      it("should create an audit log when updating a document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const updatedDoc = { ...testDoc, name: "updated-document.pdf" };
        await dbService.updateDocument(updatedDoc);

        const auditLogs = await dbService.getAuditLogs({ limit: 2 });
        expect(auditLogs.success).toBe(true);
        expect(auditLogs.data).toHaveLength(2);

        const updateLog = auditLogs.data!.find(
          (log) => log.action === "document_update"
        );
        expect(updateLog).toBeDefined();
        expect(updateLog?.resourceId).toBe(testDoc.id);
      });
    });

    describe("deleteDocument", () => {
      it("should delete an existing document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const result = await dbService.deleteDocument(testDoc.id);
        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(result.metadata?.recordsAffected).toBe(1);

        // Verify deletion
        const retrievedDoc = await dbService.getDocument(testDoc.id);
        expect(retrievedDoc.data).toBeUndefined();
      });

      it("should handle deletion of non-existent document", async () => {
        const result = await dbService.deleteDocument("non-existent-id");
        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(result.metadata?.recordsAffected).toBe(0);
      });

      it("should create an audit log when deleting a document", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);
        await dbService.deleteDocument(testDoc.id);

        const auditLogs = await dbService.getAuditLogs({ limit: 2 });
        expect(auditLogs.success).toBe(true);

        const deleteLog = auditLogs.data!.find(
          (log) => log.action === "document_delete"
        );
        expect(deleteLog).toBeDefined();
        expect(deleteLog?.resourceId).toBe(testDoc.id);
      });
    });

    describe("getAllDocuments", () => {
      it("should retrieve all documents", async () => {
        const docs = [
          createTestDocument({ name: "doc1.pdf" }),
          createTestDocument({ name: "doc2.pdf" }),
          createTestDocument({ name: "doc3.pdf" }),
        ];

        for (const doc of docs) {
          await dbService.addDocument(doc);
        }

        const result = await dbService.getAllDocuments();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(3);
        expect(result.metadata?.recordsAffected).toBe(3);
      });

      it("should support pagination", async () => {
        const docs = Array.from({ length: 5 }, (_, i) =>
          createTestDocument({ name: `doc${i + 1}.pdf` })
        );

        for (const doc of docs) {
          await dbService.addDocument(doc);
        }

        // Test limit
        const limitedResult = await dbService.getAllDocuments({ limit: 2 });
        expect(limitedResult.data).toHaveLength(2);

        // Test offset
        const offsetResult = await dbService.getAllDocuments({
          offset: 2,
          limit: 2,
        });
        expect(offsetResult.data).toHaveLength(2);
      });

      it("should support sorting", async () => {
        const docs = [
          createTestDocument({ name: "b-doc.pdf", size: 200 }),
          createTestDocument({ name: "a-doc.pdf", size: 100 }),
          createTestDocument({ name: "c-doc.pdf", size: 300 }),
        ];

        for (const doc of docs) {
          await dbService.addDocument(doc);
        }

        // Sort by name ascending
        const nameAscResult = await dbService.getAllDocuments({
          sortBy: "name",
          sortDirection: "asc",
        });
        expect(nameAscResult.data![0].name).toBe("a-doc.pdf");
        expect(nameAscResult.data![2].name).toBe("c-doc.pdf");

        // Sort by size descending
        const sizeDescResult = await dbService.getAllDocuments({
          sortBy: "size",
          sortDirection: "desc",
        });
        expect(sizeDescResult.data![0].size).toBe(300);
        expect(sizeDescResult.data![2].size).toBe(100);
      });
    });

    describe("getDocumentsByType", () => {
      it("should filter documents by type using index", async () => {
        const pdfDocs = [
          createTestDocument({ type: "application/pdf", name: "doc1.pdf" }),
          createTestDocument({ type: "application/pdf", name: "doc2.pdf" }),
        ];
        const imageDocs = [
          createTestDocument({ type: "image/jpeg", name: "image1.jpg" }),
        ];

        for (const doc of [...pdfDocs, ...imageDocs]) {
          await dbService.addDocument(doc);
        }

        const pdfResult = await dbService.getDocumentsByType("application/pdf");
        expect(pdfResult.success).toBe(true);
        expect(pdfResult.data).toHaveLength(2);
        expect(
          pdfResult.data!.every((doc) => doc.type === "application/pdf")
        ).toBe(true);

        const imageResult = await dbService.getDocumentsByType("image/jpeg");
        expect(imageResult.success).toBe(true);
        expect(imageResult.data).toHaveLength(1);
        expect(imageResult.data![0].type).toBe("image/jpeg");
      });
    });
  });

  describe("Processing Results Store", () => {
    describe("addProcessingResult", () => {
      it("should add a processing result successfully", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const processingResult = createTestProcessingResult(testDoc.id);
        const result = await dbService.addProcessingResult(processingResult);

        expect(result.success).toBe(true);
        expect(result.data).toBe(processingResult.id);
        expect(result.metadata?.recordsAffected).toBe(1);
      });

      it("should create an audit log when adding a processing result", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        const processingResult = createTestProcessingResult(testDoc.id);
        await dbService.addProcessingResult(processingResult);

        const auditLogs = await dbService.getAuditLogs({ limit: 2 });
        expect(auditLogs.success).toBe(true);

        const processingLog = auditLogs.data!.find(
          (log) => log.action === "processing_result_add"
        );
        expect(processingLog).toBeDefined();
        expect(processingLog?.resourceId).toBe(processingResult.id);
      });
    });

    describe("getProcessingResultsByDocument", () => {
      it("should retrieve processing results for a specific document", async () => {
        const testDoc1 = createTestDocument();
        const testDoc2 = createTestDocument();
        await dbService.addDocument(testDoc1);
        await dbService.addDocument(testDoc2);

        const results1 = [
          createTestProcessingResult(testDoc1.id, { processingType: "ocr" }),
          createTestProcessingResult(testDoc1.id, {
            processingType: "classification",
          }),
        ];
        const results2 = [
          createTestProcessingResult(testDoc2.id, { processingType: "ocr" }),
        ];

        for (const result of [...results1, ...results2]) {
          await dbService.addProcessingResult(result);
        }

        const doc1Results = await dbService.getProcessingResultsByDocument(
          testDoc1.id
        );
        expect(doc1Results.success).toBe(true);
        expect(doc1Results.data).toHaveLength(2);
        expect(
          doc1Results.data!.every((r) => r.documentId === testDoc1.id)
        ).toBe(true);

        const doc2Results = await dbService.getProcessingResultsByDocument(
          testDoc2.id
        );
        expect(doc2Results.success).toBe(true);
        expect(doc2Results.data).toHaveLength(1);
        expect(doc2Results.data![0].documentId).toBe(testDoc2.id);
      });
    });
  });

  describe("Templates Store", () => {
    describe("addTemplate", () => {
      it("should add a template successfully", async () => {
        const template = createTestTemplate();
        const result = await dbService.addTemplate(template);

        expect(result.success).toBe(true);
        expect(result.data).toBe(template.id);
        expect(result.metadata?.recordsAffected).toBe(1);
      });

      it("should create an audit log when adding a template", async () => {
        const template = createTestTemplate();
        await dbService.addTemplate(template);

        const auditLogs = await dbService.getAuditLogs({ limit: 1 });
        expect(auditLogs.success).toBe(true);
        expect(auditLogs.data).toHaveLength(1);
        expect(auditLogs.data![0].action).toBe("template_add");
        expect(auditLogs.data![0].resourceId).toBe(template.id);
      });
    });

    describe("getActiveTemplates", () => {
      it("should retrieve only active templates", async () => {
        const activeTemplates = [
          createTestTemplate({ name: "Active Template 1", isActive: true }),
          createTestTemplate({ name: "Active Template 2", isActive: true }),
        ];
        const inactiveTemplate = createTestTemplate({
          name: "Inactive Template",
          isActive: false,
        });

        for (const template of [...activeTemplates, inactiveTemplate]) {
          const addResult = await dbService.addTemplate(template);
          expect(addResult.success).toBe(true);
        }

        const result = await dbService.getActiveTemplates();
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data!.every((t) => t.isActive)).toBe(true);
      });
    });
  });

  describe("Audit Logs Store", () => {
    describe("getAuditLogs", () => {
      it("should retrieve audit logs sorted by timestamp descending", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);

        // Add a small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        await dbService.updateDocument({ ...testDoc, name: "updated.pdf" });

        const auditLogs = await dbService.getAuditLogs();
        expect(auditLogs.success).toBe(true);
        expect(auditLogs.data).toHaveLength(2);

        // Should be sorted by timestamp descending (newest first)
        expect(auditLogs.data![0].action).toBe("document_update");
        expect(auditLogs.data![1].action).toBe("document_add");
      });

      it("should support pagination for audit logs", async () => {
        const testDoc = createTestDocument();
        await dbService.addDocument(testDoc);
        await dbService.updateDocument({ ...testDoc, name: "updated.pdf" });
        await dbService.deleteDocument(testDoc.id);

        const limitedLogs = await dbService.getAuditLogs({ limit: 2 });
        expect(limitedLogs.success).toBe(true);
        expect(limitedLogs.data).toHaveLength(2);

        const offsetLogs = await dbService.getAuditLogs({
          offset: 1,
          limit: 2,
        });
        expect(offsetLogs.success).toBe(true);
        expect(offsetLogs.data).toHaveLength(2);
      });
    });
  });

  describe("Database Statistics", () => {
    it("should return accurate database statistics", async () => {
      // Add test data
      const docs = [
        createTestDocument({ size: 100 }),
        createTestDocument({ size: 200 }),
      ];
      const template = createTestTemplate();

      for (const doc of docs) {
        await dbService.addDocument(doc);
      }
      await dbService.addTemplate(template);

      const processingResult = createTestProcessingResult(docs[0].id);
      await dbService.addProcessingResult(processingResult);

      const stats = await dbService.getDatabaseStats();
      expect(stats.success).toBe(true);
      expect(stats.data?.documentCount).toBe(2);
      expect(stats.data?.totalSize).toBe(300);
      expect(stats.data?.templateCount).toBe(1);
      expect(stats.data?.processingResultCount).toBe(1);
      expect(stats.data?.auditLogCount).toBeGreaterThan(0); // Audit logs from operations above
      expect(stats.data?.version).toBe(1);
    });
  });

  describe("Database Utilities", () => {
    it("should clear all data successfully", async () => {
      // Add some test data
      const testDoc = createTestDocument();
      const template = createTestTemplate();

      await dbService.addDocument(testDoc);
      await dbService.addTemplate(template);

      // Verify data exists
      const beforeStats = await dbService.getDatabaseStats();
      expect(beforeStats.data?.documentCount).toBe(1);
      expect(beforeStats.data?.templateCount).toBe(1);

      // Clear all data
      const clearResult = await dbService.clearAllData();
      expect(clearResult.success).toBe(true);

      // Verify data is cleared
      const afterStats = await dbService.getDatabaseStats();
      expect(afterStats.data?.documentCount).toBe(0);
      expect(afterStats.data?.templateCount).toBe(0);
      expect(afterStats.data?.auditLogCount).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle database operation errors gracefully", async () => {
      // Close the database to force an error
      await dbService.close();

      const testDoc = createTestDocument();
      const result = await dbService.addDocument(testDoc);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metadata?.recordsAffected).toBe(0);
    });
  });
});
