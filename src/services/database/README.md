# DatabaseService

The `DatabaseService` is a comprehensive TypeScript service that provides a robust interface for managing client-side data persistence using IndexedDB. It's built on top of the `idb` library to provide a clean, promise-based API for all database operations.

## Features

- **Type-Safe Operations**: Full TypeScript support with comprehensive type definitions
- **CRUD Operations**: Complete Create, Read, Update, Delete operations for all data types
- **Indexing Support**: Efficient querying using IndexedDB indexes
- **Audit Logging**: Automatic tracking of all database operations
- **Error Handling**: Comprehensive error handling with detailed error information
- **Performance Metrics**: Built-in timing and operation metadata
- **Pagination**: Support for efficient data pagination
- **Sorting**: Flexible sorting options for query results

## Database Schema

The database stores four main types of data:

1. **Documents**: Encrypted document files with metadata
2. **Processing Results**: AI/ML processing outcomes (OCR, classification, extraction)
3. **Templates**: Document processing templates and configurations
4. **Audit Logs**: Complete audit trail of all database operations

## Installation

The service is already configured and ready to use. The required dependencies are:

```bash
bun add idb
bun add -D vitest @vitest/ui jsdom fake-indexeddb @vitejs/plugin-react
```

## Usage

### Basic Import

```typescript
import { dbService } from "@/services/database";
```

### Document Operations

#### Adding a Document

```typescript
import { dbService } from "@/services/database";

const document = {
  id: crypto.randomUUID(),
  name: "important-contract.pdf",
  type: "application/pdf",
  encryptedData: new ArrayBuffer(1024), // Your encrypted document data
  metadata: {
    extension: "pdf",
    pageCount: 10,
    tags: ["contract", "legal"],
    customProperties: {
      department: "legal",
      priority: "high",
    },
  },
  created: new Date(),
  modified: new Date(),
  size: 1024000,
  hash: "sha256-hash-of-document",
};

const result = await dbService.addDocument(document);
if (result.success) {
  console.log(`Document added with ID: ${result.data}`);
} else {
  console.error(`Failed to add document: ${result.error}`);
}
```

#### Retrieving Documents

```typescript
// Get a specific document
const docResult = await dbService.getDocument("document-id");
if (docResult.success && docResult.data) {
  console.log(`Found document: ${docResult.data.name}`);
}

// Get all documents with pagination
const allDocs = await dbService.getAllDocuments({
  limit: 10,
  offset: 0,
  sortBy: "created",
  sortDirection: "desc",
});

// Get documents by type using index
const pdfDocs = await dbService.getDocumentsByType("application/pdf", {
  limit: 20,
});
```

#### Updating a Document

```typescript
const updatedDocument = {
  ...existingDocument,
  name: "updated-contract.pdf",
  metadata: {
    ...existingDocument.metadata,
    tags: [...existingDocument.metadata.tags, "updated"],
  },
};

const updateResult = await dbService.updateDocument(updatedDocument);
if (updateResult.success) {
  console.log("Document updated successfully");
}
```

#### Deleting a Document

```typescript
const deleteResult = await dbService.deleteDocument("document-id");
if (deleteResult.success) {
  console.log("Document deleted successfully");
}
```

### Processing Results Operations

#### Adding Processing Results

```typescript
const processingResult = {
  id: crypto.randomUUID(),
  documentId: "parent-document-id",
  processingType: "ocr",
  result: {
    text: "Extracted text content...",
    confidence: 0.95,
    language: "en",
    textBlocks: [
      {
        text: "Header text",
        bbox: { x: 10, y: 10, width: 200, height: 30 },
        confidence: 0.98,
      },
    ],
  },
  confidence: 0.95,
  created: new Date(),
  processingTime: 2500,
  algorithmVersion: "1.2.0",
  status: "success",
};

const result = await dbService.addProcessingResult(processingResult);
```

#### Retrieving Processing Results

```typescript
// Get all processing results for a document
const results = await dbService.getProcessingResultsByDocument("document-id", {
  limit: 10,
  sortBy: "created",
  sortDirection: "desc",
});
```

### Template Operations

#### Adding Templates

```typescript
const template = {
  id: crypto.randomUUID(),
  name: "Invoice Processing Template",
  description: "Template for processing invoice documents",
  documentType: "application/pdf",
  config: {
    processingRules: [
      {
        type: "ocr",
        parameters: { language: "en", dpi: 300 },
        order: 1,
      },
      {
        type: "extraction",
        parameters: { fields: ["total", "date", "vendor"] },
        order: 2,
      },
    ],
    extractionRules: [
      {
        fieldName: "total",
        pattern: "Total: \\$([0-9,\\.]+)",
        valueType: "number",
        required: true,
      },
    ],
  },
  created: new Date(),
  modified: new Date(),
  isActive: true,
  version: 1,
};

const result = await dbService.addTemplate(template);
```

#### Retrieving Active Templates

```typescript
const activeTemplates = await dbService.getActiveTemplates({
  limit: 50,
  sortBy: "name",
  sortDirection: "asc",
});
```

### Audit Log Operations

```typescript
// Get recent audit logs
const auditLogs = await dbService.getAuditLogs({
  limit: 100,
  offset: 0,
});

if (auditLogs.success) {
  auditLogs.data?.forEach((log) => {
    console.log(`${log.timestamp}: ${log.action} on ${log.resourceType}`);
  });
}
```

### Database Statistics

```typescript
const stats = await dbService.getDatabaseStats();
if (stats.success) {
  console.log(`Database contains:`);
  console.log(`- ${stats.data?.documentCount} documents`);
  console.log(`- ${stats.data?.totalSize} bytes of data`);
  console.log(`- ${stats.data?.processingResultCount} processing results`);
  console.log(`- ${stats.data?.templateCount} templates`);
  console.log(`- ${stats.data?.auditLogCount} audit log entries`);
}
```

### Utility Operations

```typescript
// Clear all data (useful for testing or reset)
const clearResult = await dbService.clearAllData();

// Close database connection
await dbService.close();
```

## Error Handling

All database operations return a `DatabaseOperationResult` object that includes:

```typescript
interface DatabaseOperationResult<T = any> {
  success: boolean; // Whether the operation succeeded
  data?: T; // The result data (if successful)
  error?: string; // Error message (if failed)
  metadata?: {
    duration?: number; // Operation duration in milliseconds
    recordsAffected?: number; // Number of records affected
  };
}
```

Always check the `success` field before accessing `data`:

```typescript
const result = await dbService.getDocument("some-id");
if (result.success) {
  // Safe to access result.data
  console.log(result.data?.name);
} else {
  // Handle error
  console.error(result.error);
}
```

## Performance Considerations

- **Indexes**: The service automatically uses appropriate indexes for efficient querying
- **Pagination**: Always use pagination for large result sets to maintain performance
- **Batch Operations**: For multiple operations, consider grouping them to reduce overhead
- **Connection Management**: The service uses a singleton pattern to manage database connections efficiently

## Testing

The service includes comprehensive unit tests. Run tests with:

```bash
bun run test
```

The tests use `fake-indexeddb` to mock IndexedDB operations in the Node.js environment.

## Database Structure

### Object Stores

1. **documents**: Stores document records with indexes on type, created, modified, size, and name
2. **processedResults**: Stores processing results with indexes on documentId, created, processingType, status, and confidence
3. **templates**: Stores templates with indexes on name, type, isActive, created, and version
4. **auditLogs**: Stores audit logs with indexes on timestamp, userHash, action, resourceType, and result

### Indexes

Each object store has multiple indexes to support efficient querying:

- Documents can be quickly filtered by type, creation date, modification date, size, or name
- Processing results can be efficiently queried by document, processing type, or status
- Templates can be filtered by active status, type, or creation date
- Audit logs can be searched by timestamp, user, action type, or resource type

## Security Considerations

- **Data Encryption**: Document data should be encrypted before storing in the `encryptedData` field
- **User Privacy**: User identifiers are hashed in audit logs for privacy
- **Data Integrity**: Document hashes are stored for integrity verification
- **Access Control**: Implement appropriate access controls in your application layer

## Migration and Versioning

The database uses version 1. Future schema changes should:

1. Increment the `DB_VERSION` constant
2. Add migration logic in the `upgrade` callback
3. Test migrations thoroughly with existing data

## API Reference

For complete API documentation, see the TypeScript definitions in the source code. All methods are fully documented with JSDoc comments.
