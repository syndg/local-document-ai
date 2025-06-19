import { pipeline, ImageClassificationPipeline } from "@xenova/transformers";

export interface ClassificationResult {
  category: string;
  confidence: number;
}

/**
 * Service for classifying documents using a Document Image Transformer (DiT) model.
 * Uses the Xenova/dit-base-finetuned-rvlcdip model loaded from Hugging Face CDN.
 */
class ClassificationService {
  private classifier: ImageClassificationPipeline | null = null;
  private initializationPromise: Promise<ImageClassificationPipeline> | null =
    null;

  constructor() {
    // Initialization is lazy and happens on the first call to classify()
  }

  /**
   * Initializes the classification pipeline by loading the DiT model from Hugging Face CDN.
   * The model is cached in the browser for subsequent uses.
   * @returns Promise that resolves to the initialized pipeline
   */
  private async initialize(): Promise<ImageClassificationPipeline> {
    if (typeof window === "undefined") {
      throw new Error(
        "Classification service can only be used in the browser."
      );
    }

    if (!this.initializationPromise) {
      console.log(
        "Initializing Image Classification Service from Hugging Face CDN..."
      );
      // This single line does everything: resolves the URL, downloads, caches, and loads the model.
      this.initializationPromise = pipeline(
        "image-classification",
        "Xenova/dit-base-finetuned-rvlcdip"
      );
    }
    this.classifier = await this.initializationPromise;
    console.log("Image Classification Service initialized.");
    return this.classifier;
  }

  /**
   * Classifies a document directly from its image data.
   * @param image - The image data (Blob or ArrayBuffer)
   * @returns Promise that resolves to the predicted category and confidence score
   */
  public async classify(
    image: Blob | ArrayBuffer
  ): Promise<ClassificationResult> {
    const classifier = await this.initialize();

    // Convert to URL for the classifier
    let imageUrl: string;
    if (image instanceof ArrayBuffer) {
      const blob = new Blob([image], { type: "image/jpeg" }); // Default to JPEG if type unknown
      imageUrl = URL.createObjectURL(blob);
    } else {
      imageUrl = URL.createObjectURL(image);
    }

    try {
      const outputs = await classifier(imageUrl);
      // Clean up the URL
      URL.revokeObjectURL(imageUrl);

      // The output is an array of predictions, sorted by score.
      // e.g., [{ score: 0.99, label: 'invoice' }, { score: 0.001, label: 'letter' }]
      // Cast to proper type since @xenova/transformers has stricter typing
      const predictions = outputs as Array<{ label: string; score: number }>;
      const topPrediction = predictions[0];

      return {
        category: topPrediction.label,
        confidence: topPrediction.score,
      };
    } catch (error) {
      // Make sure to clean up the URL even if there's an error
      URL.revokeObjectURL(imageUrl);
      throw error;
    }
  }

  /**
   * Checks if the classification service is initialized.
   * @returns boolean indicating if the service is ready to use
   */
  public isInitialized(): boolean {
    return this.classifier !== null;
  }
}

// Export a singleton instance
export const classificationService = new ClassificationService();
