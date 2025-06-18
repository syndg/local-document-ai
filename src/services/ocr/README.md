# OCR Service

A client-side Optical Character Recognition (OCR) service using Tesseract.js WebAssembly engine.

## Overview

The OCR Service provides powerful text extraction capabilities that run entirely in the browser, maintaining our privacy-first architecture by never sending data to external servers. Built on top of Tesseract.js, it leverages WebAssembly for high-performance optical character recognition.

**⚠️ Browser-Only Service**: This service only works in browser environments and is not available during server-side rendering (SSR). It automatically initializes when running in the browser.

## Features

- 🚀 **WebAssembly Performance**: Uses Tesseract.js compiled to WebAssembly for optimal speed
- 🔒 **Privacy-First**: All processing happens locally in the browser
- 📊 **Progress Tracking**: Real-time progress updates for long-running operations
- 🎯 **High Accuracy**: Powered by the mature Tesseract OCR engine
- 📱 **Multiple Formats**: Supports various image formats (PNG, JPEG, GIF, etc.)
- 💯 **Confidence Scoring**: Provides confidence metrics for extracted text
- 🔧 **Auto-cleanup**: Automatic worker management and resource cleanup

## Supported Languages

Currently configured for English text recognition. The underlying Tesseract engine supports 100+ languages.

## Usage

### Basic Text Extraction

```typescript
import { getOCRService } from "@/services/ocr/ocr";

// Extract text from an image file (browser only)
const ocrService = getOCRService();
const result = await ocrService.recognize(imageFile);
console.log("Extracted text:", result.text);
console.log("Confidence:", result.confidence);
```

### With Progress Tracking

```typescript
import { getOCRService } from "@/services/ocr/ocr";

const ocrService = getOCRService();
const result = await ocrService.recognize(imageFile, (progress) => {
  console.log(`Processing: ${progress}%`);
  // Update your UI progress bar here
});
```

### Complete Example with Error Handling

```typescript
import { getOCRService, OCRResult } from "@/services/ocr/ocr";

async function extractTextFromImage(imageFile: File): Promise<string | null> {
  try {
    // Get service instance (browser only)
    const ocrService = getOCRService();

    // Wait for service to be ready
    await ocrService.waitForReady();

    const result: OCRResult = await ocrService.recognize(
      imageFile,
      (progress) => {
        updateProgressBar(progress);
      }
    );

    // Check confidence level
    if (result.confidence < 60) {
      console.warn("Low confidence OCR result:", result.confidence);
    }

    return result.text;
  } catch (error) {
    console.error("OCR failed:", error);
    return null;
  }
}
```

## API Reference

### OCRService Class

#### Methods

##### `recognize(image, onProgress?): Promise<OCRResult>`

Extracts text from an image using OCR.

**Parameters:**

- `image: Tesseract.ImageLike` - Image data (File, ArrayBuffer, Blob, or image URL)
- `onProgress?: (progress: number) => void` - Optional progress callback (0-100)

**Returns:** `Promise<OCRResult>` - OCR result with extracted text and metadata

##### `isReady(): boolean`

Checks if the OCR service is ready to process images.

##### `waitForReady(): Promise<void>`

Waits for the service to be fully initialized.

##### `terminate(): Promise<void>`

Cleans up and terminates the OCR worker. Call this when done to free resources.

### OCRResult Interface

```typescript
interface OCRResult {
  text: string; // Extracted text
  confidence: number; // Confidence score (0-100)
  words: Array<{
    // Word-level details
    text: string;
    confidence: number;
    bbox: {
      // Bounding box coordinates
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  processingTime: number; // Processing time in milliseconds
}
```

## Best Practices

### Image Quality

For best OCR results:

- Use high-resolution images (300+ DPI recommended)
- Ensure good contrast between text and background
- Minimize image noise and artifacts
- Use images with clear, readable fonts

### Error Handling

Always wrap OCR operations in try-catch blocks:

```typescript
try {
  const result = await ocrService.recognize(image);
  // Handle result
} catch (error) {
  // Handle OCR failure
  console.error("OCR failed:", error);
}
```

### Confidence Thresholds

Use confidence scores to filter results:

```typescript
const result = await ocrService.recognize(image);

if (result.confidence >= 90) {
  // High confidence - likely accurate
} else if (result.confidence >= 70) {
  // Medium confidence - review recommended
} else {
  // Low confidence - manual verification needed
}
```

### Resource Management

The service uses a singleton pattern, but remember to clean up when appropriate:

```typescript
// In a React component
useEffect(() => {
  return () => {
    // Clean up when component unmounts
    ocrService.terminate();
  };
}, []);
```

## Performance Considerations

- **First Run**: Initial OCR may take longer as WebAssembly loads
- **Memory**: Each worker uses ~10-20MB of memory
- **Processing Time**: Varies by image size and complexity (typically 1-10 seconds)
- **Browser Support**: Requires modern browsers with WebAssembly support

## Limitations

- **Language**: Currently configured for English only
- **Text Types**: Works best with printed text, less accurate with handwriting
- **Image Quality**: Poor quality images will yield poor results
- **File Size**: Very large images may cause memory issues

## Troubleshooting

### Common Issues

1. **"OCR worker failed to initialize"**

   - Check browser WebAssembly support
   - Ensure network connectivity for initial download

2. **Low accuracy results**

   - Improve image quality and resolution
   - Ensure good contrast
   - Try image preprocessing

3. **Memory errors**
   - Reduce image size before processing
   - Call `terminate()` to free memory

### Debug Logging

The service includes comprehensive console logging:

- Worker initialization status
- Processing progress
- Results and timing information
- Error details

Check browser console for detailed information during development.

## Integration Examples

The OCR service is integrated into the document management system:

- **Document Processing**: Extract text from uploaded documents
- **Search Enhancement**: Make image-based documents searchable
- **Content Analysis**: Analyze document content programmatically

See `DocumentsTable.tsx` for a complete implementation example.
