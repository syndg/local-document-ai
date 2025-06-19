# Document Classification Service

This service provides AI-powered document classification capabilities using a Document Image Transformer (DiT) model.

## Overview

The Classification Service uses the `Xenova/dit-base-finetuned-rvlcdip` model from Hugging Face to classify documents directly from their image data. This model is specifically trained to classify various document types commonly found in business and personal workflows.

## Features

- **Direct Image Classification**: Analyzes document images without requiring text extraction
- **PDF Support**: Automatically renders the first page of PDF documents to images for classification
- **Zero Setup**: Model is loaded automatically from Hugging Face CDN
- **Browser Caching**: Models are cached locally for subsequent uses
- **High Accuracy**: Uses a state-of-the-art Document Image Transformer model
- **Multiple Document Types**: Can classify various document categories

## Supported Document Types

The model can classify documents into categories such as:

- Invoice
- Letter
- Form
- Email
- Advertisement
- Report
- Resume
- Scientific publication
- Specification
- File folder
- News article
- Budget
- Presentation
- Questionnaire
- Handwritten note
- Memo

## Technical Details

### Model Information

- **Model**: `Xenova/dit-base-finetuned-rvlcdip`
- **Task**: Image Classification
- **Framework**: Transformers.js (@xenova/transformers)
- **Input**: Document images (Blob or ArrayBuffer) and PDF files
- **Output**: Category label with confidence score
- **PDF Processing**: Uses PDF.js to render first page to image format

### Architecture

The service uses a singleton pattern to ensure efficient model loading and reuse:

```typescript
const result = await classificationService.classify(imageData);
console.log(`Document Type: ${result.category}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
```

### Browser Compatibility

- Requires a modern browser with WebAssembly support
- Model files are cached using browser storage
- First-time usage requires internet connection for model download

## Usage

The service is automatically integrated into the document management interface:

1. Upload an image document or PDF file
2. Right-click on the document or use the actions menu
3. Select "Classify Document"
4. For PDFs, the first page is automatically rendered to an image
5. View the classification results in the modal

### Supported File Types

- **Images**: JPEG, PNG, and other standard image formats
- **PDFs**: All PDF documents (first page is used for classification)

## Performance Notes

- **First Use**: Initial model download may take a few seconds
- **Subsequent Uses**: Classification is near-instantaneous using cached model
- **Model Size**: Approximately 87MB (downloads once per browser)
- **Processing Time**: Typically 1-3 seconds for classification

## Error Handling

The service includes comprehensive error handling for:

- Network connectivity issues during model download
- Invalid image formats
- Browser compatibility problems
- Memory constraints

## Development

### Testing

Test the classification service with various document types to ensure accuracy across different use cases.

### Browser Developer Tools

Monitor the Network tab during first use to observe model download from `huggingface.co` URLs.

### Performance Monitoring

Use browser performance tools to monitor memory usage and processing times during classification.
