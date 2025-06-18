import { openDB, type IDBPDatabase } from "idb";
import type {
  DocProcessingSuiteDB,
  Document,
  ProcessingResult,
  DocumentTemplate,
  AuditLog,
  DatabaseOperationResult,
  QueryOptions,
  DatabaseStats,
} from "../../types/database";

const DB_NAME = "DocProcessingSuite";
const DB_VERSION = 1;

/**
 * DatabaseService class providing a comprehensive interface for IndexedDB operations
 * This service handles all CRUD operations for documents, processing results, templates, and audit logs
 */
class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<DocProcessingSuiteDB>> | null = null;

  constructor() {
    // Only initialize on client side
    if (typeof window !== "undefined") {
      this.dbPromise = this.initializeDatabase();
    }
  }

  /**
   * Ensure database is initialized before use
   */
  private async ensureInitialized(): Promise<
    IDBPDatabase<DocProcessingSuiteDB>
  > {
    if (typeof window === "undefined") {
      throw new Error("DatabaseService can only be used on the client side");
    }

    if (!this.dbPromise) {
      this.dbPromise = this.initializeDatabase();
    }

    return this.dbPromise;
  }

  /**
   * Initialize the IndexedDB database with all object stores and indexes
   * @returns Promise that resolves to the database instance
   */
  private async initializeDatabase(): Promise<
    IDBPDatabase<DocProcessingSuiteDB>
  > {
    return openDB<DocProcessingSuiteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create documents object store
        if (!db.objectStoreNames.contains("documents")) {
          const documentsStore = db.createObjectStore("documents", {
            keyPath: "id",
          });
          documentsStore.createIndex("byType", "type");
          documentsStore.createIndex("byCreated", "created");
          documentsStore.createIndex("byModified", "modified");
          documentsStore.createIndex("bySize", "size");
          documentsStore.createIndex("byName", "name");
        }

        // Create processedResults object store
        if (!db.objectStoreNames.contains("processedResults")) {
          const resultsStore = db.createObjectStore("processedResults", {
            keyPath: "id",
          });
          resultsStore.createIndex("byDocumentId", "documentId");
          resultsStore.createIndex("byCreated", "created");
          resultsStore.createIndex("byProcessingType", "processingType");
          resultsStore.createIndex("byStatus", "status");
          resultsStore.createIndex("byConfidence", "confidence");
        }

        // Create templates object store
        if (!db.objectStoreNames.contains("templates")) {
          const templatesStore = db.createObjectStore("templates", {
            keyPath: "id",
          });
          templatesStore.createIndex("byName", "name");
          templatesStore.createIndex("byType", "documentType");
          templatesStore.createIndex("byIsActive", "isActive");
          templatesStore.createIndex("byCreated", "created");
          templatesStore.createIndex("byVersion", "version");
        }

        // Create auditLogs object store
        if (!db.objectStoreNames.contains("auditLogs")) {
          const auditStore = db.createObjectStore("auditLogs", {
            keyPath: "id",
            autoIncrement: true,
          });
          auditStore.createIndex("byTimestamp", "timestamp");
          auditStore.createIndex("byUserHash", "userHash");
          auditStore.createIndex("byAction", "action");
          auditStore.createIndex("byResourceType", "resourceType");
          auditStore.createIndex("byResult", "result");
        }
      },
    });
  }

  // === DOCUMENTS STORE METHODS ===

  /**
   * Add a new document to the database
   * @param doc Document to add
   * @returns Promise that resolves to the document ID
   */
  public async addDocument(
    doc: Document
  ): Promise<DatabaseOperationResult<string>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      await db.add("documents", doc);

      // Log the action
      await this.addAuditLog({
        timestamp: new Date(),
        userHash: "system", // You'll want to replace this with actual user hash
        action: "document_add",
        resourceType: "document",
        resourceId: doc.id,
        result: "success",
        details: { name: doc.name, type: doc.type, size: doc.size },
      });

      return {
        success: true,
        data: doc.id,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Retrieve a document by ID
   * @param id Document ID
   * @returns Promise that resolves to the document or undefined
   */
  public async getDocument(
    id: string
  ): Promise<DatabaseOperationResult<Document>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      const document = await db.get("documents", id);

      return {
        success: true,
        data: document,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: document ? 1 : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Update an existing document
   * @param doc Updated document data
   * @returns Promise that resolves to the operation result
   */
  public async updateDocument(
    doc: Document
  ): Promise<DatabaseOperationResult<string>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      doc.modified = new Date();
      await db.put("documents", doc);

      // Log the action
      await this.addAuditLog({
        timestamp: new Date(),
        userHash: "system",
        action: "document_update",
        resourceType: "document",
        resourceId: doc.id,
        result: "success",
        details: { name: doc.name, type: doc.type },
      });

      return {
        success: true,
        data: doc.id,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Delete a document by ID
   * @param id Document ID to delete
   * @returns Promise that resolves to the operation result
   */
  public async deleteDocument(
    id: string
  ): Promise<DatabaseOperationResult<boolean>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();

      // Get document details before deletion for audit log
      const doc = await db.get("documents", id);

      await db.delete("documents", id);

      // Log the action
      if (doc) {
        await this.addAuditLog({
          timestamp: new Date(),
          userHash: "system",
          action: "document_delete",
          resourceType: "document",
          resourceId: id,
          result: "success",
          details: { name: doc.name, type: doc.type },
        });
      }

      return {
        success: true,
        data: true,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: doc ? 1 : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Get all documents with optional filtering and pagination
   * @param options Query options for filtering and pagination
   * @returns Promise that resolves to an array of documents
   */
  public async getAllDocuments(
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<Document[]>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      let documents: Document[];

      if (options?.useIndex) {
        try {
          const index = db
            .transaction("documents")
            .objectStore("documents")
            .index(options.useIndex as any);
          documents = await index.getAll();
        } catch {
          // Fallback to getting all documents if index doesn't exist
          documents = await db.getAll("documents");
        }
      } else {
        documents = await db.getAll("documents");
      }

      // Apply sorting if specified
      if (options?.sortBy) {
        documents.sort((a, b) => {
          const aVal = (a as any)[options.sortBy!];
          const bVal = (b as any)[options.sortBy!];
          const direction = options.sortDirection === "desc" ? -1 : 1;

          if (aVal < bVal) return -1 * direction;
          if (aVal > bVal) return 1 * direction;
          return 0;
        });
      }

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      if (limit) {
        documents = documents.slice(offset, offset + limit);
      } else if (offset > 0) {
        documents = documents.slice(offset);
      }

      return {
        success: true,
        data: documents,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: documents.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Get documents by type using the byType index
   * @param type Document type to filter by
   * @param options Query options
   * @returns Promise that resolves to an array of documents
   */
  public async getDocumentsByType(
    type: string,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<Document[]>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      const index = db
        .transaction("documents")
        .objectStore("documents")
        .index("byType");
      let documents = await index.getAll(type);

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      if (limit) {
        documents = documents.slice(offset, offset + limit);
      } else if (offset > 0) {
        documents = documents.slice(offset);
      }

      return {
        success: true,
        data: documents,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: documents.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  // === PROCESSING RESULTS STORE METHODS ===

  /**
   * Add a processing result to the database
   * @param result Processing result to add
   * @returns Promise that resolves to the result ID
   */
  public async addProcessingResult(
    result: ProcessingResult
  ): Promise<DatabaseOperationResult<string>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      await db.add("processedResults", result);

      // Log the action
      await this.addAuditLog({
        timestamp: new Date(),
        userHash: "system",
        action: "processing_result_add",
        resourceType: "processing_result",
        resourceId: result.id,
        result: "success",
        details: {
          documentId: result.documentId,
          processingType: result.processingType,
          status: result.status,
          confidence: result.confidence,
        },
      });

      return {
        success: true,
        data: result.id,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Get processing results for a specific document
   * @param documentId Document ID to get results for
   * @param options Query options
   * @returns Promise that resolves to an array of processing results
   */
  public async getProcessingResultsByDocument(
    documentId: string,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<ProcessingResult[]>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      const index = db
        .transaction("processedResults")
        .objectStore("processedResults")
        .index("byDocumentId");
      let results = await index.getAll(documentId);

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      if (limit) {
        results = results.slice(offset, offset + limit);
      } else if (offset > 0) {
        results = results.slice(offset);
      }

      return {
        success: true,
        data: results,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  // === TEMPLATES STORE METHODS ===

  /**
   * Add a document template to the database
   * @param template Template to add
   * @returns Promise that resolves to the template ID
   */
  public async addTemplate(
    template: DocumentTemplate
  ): Promise<DatabaseOperationResult<string>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      await db.add("templates", template);

      // Log the action
      await this.addAuditLog({
        timestamp: new Date(),
        userHash: "system",
        action: "template_add",
        resourceType: "template",
        resourceId: template.id,
        result: "success",
        details: {
          name: template.name,
          documentType: template.documentType,
          version: template.version,
        },
      });

      return {
        success: true,
        data: template.id,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Get all active templates
   * @param options Query options
   * @returns Promise that resolves to an array of active templates
   */
  public async getActiveTemplates(
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<DocumentTemplate[]>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();

      // Get all templates and filter client-side due to boolean indexing issues
      const allTemplates = await db.getAll("templates");
      let templates = allTemplates.filter(
        (template) => template.isActive === true
      );

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      if (limit) {
        templates = templates.slice(offset, offset + limit);
      } else if (offset > 0) {
        templates = templates.slice(offset);
      }

      return {
        success: true,
        data: templates,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: templates.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : `Unknown error: ${String(error)}`,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  // === AUDIT LOGS STORE METHODS ===

  /**
   * Add an audit log entry to the database
   * @param log Audit log entry to add
   * @returns Promise that resolves to the log ID
   */
  public async addAuditLog(
    log: Omit<AuditLog, "id">
  ): Promise<DatabaseOperationResult<number>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      const id = await db.add("auditLogs", log as AuditLog);

      return {
        success: true,
        data: id,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Get audit logs with optional filtering
   * @param options Query options
   * @returns Promise that resolves to an array of audit logs
   */
  public async getAuditLogs(
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<AuditLog[]>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();
      let logs: AuditLog[];

      if (options?.useIndex) {
        try {
          const index = db
            .transaction("auditLogs")
            .objectStore("auditLogs")
            .index(options.useIndex as any);
          logs = await index.getAll();
        } catch {
          // Fallback to getting all logs if index doesn't exist
          logs = await db.getAll("auditLogs");
        }
      } else {
        logs = await db.getAll("auditLogs");
      }

      // Sort by timestamp descending by default
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit;

      if (limit) {
        logs = logs.slice(offset, offset + limit);
      } else if (offset > 0) {
        logs = logs.slice(offset);
      }

      return {
        success: true,
        data: logs,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: logs.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  // === DATABASE UTILITY METHODS ===

  /**
   * Get database statistics
   * @returns Promise that resolves to database statistics
   */
  public async getDatabaseStats(): Promise<
    DatabaseOperationResult<DatabaseStats>
  > {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();

      const documentCount = await db.count("documents");
      const processingResultCount = await db.count("processedResults");
      const templateCount = await db.count("templates");
      const auditLogCount = await db.count("auditLogs");

      // Calculate total size of all documents
      const documents = await db.getAll("documents");
      const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

      const stats: DatabaseStats = {
        documentCount,
        totalSize,
        processingResultCount,
        templateCount,
        auditLogCount,
        version: DB_VERSION,
        lastUpdated: new Date(),
      };

      return {
        success: true,
        data: stats,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Clear all data from the database (useful for testing)
   * @returns Promise that resolves to the operation result
   */
  public async clearAllData(): Promise<DatabaseOperationResult<boolean>> {
    const startTime = Date.now();
    try {
      const db = await this.ensureInitialized();

      await db.clear("documents");
      await db.clear("processedResults");
      await db.clear("templates");
      await db.clear("auditLogs");

      return {
        success: true,
        data: true,
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0, // We don't know how many records were cleared
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        metadata: {
          duration: Date.now() - startTime,
          recordsAffected: 0,
        },
      };
    }
  }

  /**
   * Close the database connection
   * @returns Promise that resolves when the database is closed
   */
  public async close(): Promise<void> {
    const db = await this.ensureInitialized();
    db.close();
  }
}

// Create a function to get the database service instance safely
let dbServiceInstance: DatabaseService | null = null;

export const getDbService = (): DatabaseService => {
  if (typeof window === "undefined") {
    throw new Error("Database service can only be used on the client side");
  }

  if (!dbServiceInstance) {
    dbServiceInstance = new DatabaseService();
  }

  return dbServiceInstance;
};

// For compatibility, export dbService but with proper client-side check
export const dbService =
  typeof window !== "undefined" ? getDbService() : (null as any);

// Export the class for testing purposes
export { DatabaseService };
