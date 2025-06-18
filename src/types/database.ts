import type { DBSchema } from "idb";

/**
 * Document interface representing a stored document in the database
 */
export interface Document {
  /** Unique identifier (UUID) for the document */
  id: string;
  /** Human-readable name of the document */
  name: string;
  /** MIME type or document type (e.g., 'application/pdf', 'image/jpeg') */
  type: string;
  /** Encrypted document data stored as ArrayBuffer */
  encryptedData: ArrayBuffer;
  /** Additional metadata about the document */
  metadata: DocumentMetadata;
  /** Timestamp when the document was created */
  created: Date;
  /** Timestamp when the document was last modified */
  modified: Date;
  /** Size of the original document in bytes */
  size: number;
  /** Hash of the original document for integrity verification */
  hash: string;
}

/**
 * Metadata interface for documents
 */
export interface DocumentMetadata {
  /** Original file extension */
  extension?: string;
  /** Number of pages (for PDFs, multi-page documents) */
  pageCount?: number;
  /** Document dimensions for images */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Tags associated with the document */
  tags?: string[];
  /** Custom properties */
  customProperties?: Record<string, any>;
  /** Cryptographic materials for encrypted documents */
  crypto?: {
    /** Initialization Vector stored as Base64 string */
    iv: string;
    /** Salt for key derivation stored as Base64 string */
    salt: string;
  };
}

/**
 * Processing result interface for AI/ML processing outcomes
 */
export interface ProcessingResult {
  /** Unique identifier for the processing result */
  id: string;
  /** ID of the document this result belongs to */
  documentId: string;
  /** Type of processing performed (e.g., 'ocr', 'classification', 'extraction') */
  processingType: string;
  /** The actual result data from processing */
  result: ProcessingResultData;
  /** Confidence score of the processing (0-1) */
  confidence: number;
  /** Timestamp when processing was completed */
  created: Date;
  /** Processing duration in milliseconds */
  processingTime: number;
  /** Version of the processing algorithm used */
  algorithmVersion: string;
  /** Processing status */
  status: "success" | "failed" | "partial";
  /** Error message if processing failed */
  error?: string;
}

/**
 * Processing result data union type for different processing types
 */
export type ProcessingResultData =
  | OCRResult
  | ClassificationResult
  | ExtractionResult
  | Record<string, any>;

/**
 * OCR (Optical Character Recognition) result
 */
export interface OCRResult {
  /** Extracted text content */
  text: string;
  /** Text blocks with positioning information */
  textBlocks?: TextBlock[];
  /** Detected language */
  language?: string;
  /** Overall confidence score */
  confidence: number;
}

/**
 * Text block with positioning information
 */
export interface TextBlock {
  /** Text content of the block */
  text: string;
  /** Bounding box coordinates */
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Confidence score for this block */
  confidence: number;
}

/**
 * Classification result
 */
export interface ClassificationResult {
  /** Predicted category/class */
  category: string;
  /** Confidence score for the prediction */
  confidence: number;
  /** Alternative predictions with scores */
  alternatives?: Array<{
    category: string;
    confidence: number;
  }>;
}

/**
 * Data extraction result
 */
export interface ExtractionResult {
  /** Extracted fields with their values */
  fields: Record<string, any>;
  /** Confidence scores for each field */
  fieldConfidences?: Record<string, number>;
  /** Structured data extracted from the document */
  structuredData?: any;
}

/**
 * Document template interface for document processing templates
 */
export interface DocumentTemplate {
  /** Unique identifier for the template */
  id: string;
  /** Human-readable name of the template */
  name: string;
  /** Description of what this template is used for */
  description: string;
  /** Document type this template applies to */
  documentType: string;
  /** Template configuration and rules */
  config: TemplateConfig;
  /** Timestamp when template was created */
  created: Date;
  /** Timestamp when template was last modified */
  modified: Date;
  /** Whether the template is active */
  isActive: boolean;
  /** Version number of the template */
  version: number;
}

/**
 * Template configuration interface
 */
export interface TemplateConfig {
  /** Processing rules for the template */
  processingRules: ProcessingRule[];
  /** Field extraction rules */
  extractionRules?: ExtractionRule[];
  /** Validation rules */
  validationRules?: ValidationRule[];
  /** Output format configuration */
  outputFormat?: OutputFormatConfig;
}

/**
 * Processing rule interface
 */
export interface ProcessingRule {
  /** Type of processing to apply */
  type: string;
  /** Parameters for the processing */
  parameters: Record<string, any>;
  /** Order in which to apply this rule */
  order: number;
}

/**
 * Extraction rule interface
 */
export interface ExtractionRule {
  /** Field name to extract */
  fieldName: string;
  /** Pattern or method to use for extraction */
  pattern: string;
  /** Type of the expected value */
  valueType: "string" | "number" | "date" | "boolean";
  /** Whether this field is required */
  required: boolean;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  /** Field to validate */
  field: string;
  /** Validation type */
  type: "required" | "format" | "range" | "custom";
  /** Validation parameters */
  parameters: Record<string, any>;
}

/**
 * Output format configuration
 */
export interface OutputFormatConfig {
  /** Format type (json, xml, csv, etc.) */
  format: string;
  /** Schema for the output */
  schema?: Record<string, any>;
  /** Custom formatting options */
  options?: Record<string, any>;
}

/**
 * Audit log interface for tracking user actions and system events
 */
export interface AuditLog {
  /** Auto-incremented unique identifier */
  id?: number;
  /** Timestamp of the action */
  timestamp: Date;
  /** Hashed user identifier for privacy */
  userHash: string;
  /** Action that was performed */
  action: string;
  /** Resource type that was affected */
  resourceType: string;
  /** ID of the resource that was affected */
  resourceId?: string;
  /** Additional details about the action */
  details?: Record<string, any>;
  /** IP address hash for security tracking */
  ipHash?: string;
  /** User agent information */
  userAgent?: string;
  /** Result of the action (success, failed, etc.) */
  result: "success" | "failed" | "pending";
  /** Error message if action failed */
  error?: string;
}

/**
 * Main database schema interface defining all object stores
 */
export interface DocProcessingSuiteDB extends DBSchema {
  [key: string]: any;
  /** Documents object store */
  documents: {
    key: string;
    value: Document;
    indexes: {
      byType: string;
      byCreated: Date;
      byModified: Date;
      bySize: number;
      byName: string;
    };
  };

  /** Processing results object store */
  processedResults: {
    key: string;
    value: ProcessingResult;
    indexes: {
      byDocumentId: string;
      byCreated: Date;
      byProcessingType: string;
      byStatus: string;
      byConfidence: number;
    };
  };

  /** Templates object store */
  templates: {
    key: string;
    value: DocumentTemplate;
    indexes: {
      byName: string;
      byType: string;
      byIsActive: boolean;
      byCreated: Date;
      byVersion: number;
    };
  };

  /** Audit logs object store */
  auditLogs: {
    key: number;
    value: AuditLog;
    indexes: {
      byTimestamp: Date;
      byUserHash: string;
      byAction: string;
      byResourceType: string;
      byResult: string;
    };
  };
}

/**
 * Database operation result interface
 */
export interface DatabaseOperationResult<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  /** The result data if successful */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Additional metadata about the operation */
  metadata?: {
    /** Time taken for the operation in milliseconds */
    duration?: number;
    /** Number of records affected */
    recordsAffected?: number;
  };
}

/**
 * Query options interface for database queries
 */
export interface QueryOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Index to use for the query */
  useIndex?: string;
}

/**
 * Database statistics interface
 */
export interface DatabaseStats {
  /** Total number of documents */
  documentCount: number;
  /** Total size of all documents in bytes */
  totalSize: number;
  /** Number of processing results */
  processingResultCount: number;
  /** Number of templates */
  templateCount: number;
  /** Number of audit log entries */
  auditLogCount: number;
  /** Database version */
  version: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}
