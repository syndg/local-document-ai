/**
 * SecurityService provides client-side cryptographic operations using the Web Crypto API.
 * Implements AES-GCM 256-bit encryption with PBKDF2 key derivation for secure document storage.
 */
export class SecurityService {
  private static readonly SALT_LENGTH = 16; // 16 bytes for salt
  private static readonly IV_LENGTH = 12; // 12 bytes for GCM IV
  private static readonly KEY_DERIVATION_ITERATIONS = 100000; // PBKDF2 iterations
  private static readonly ALGORITHM = "AES-GCM";
  private static readonly KEY_LENGTH = 256; // 256-bit AES key

  /**
   * Derives an AES-GCM encryption key from a password and salt using PBKDF2
   * @param password - The password to derive the key from
   * @param salt - The salt for key derivation
   * @returns Promise resolving to the derived CryptoKey
   * @private
   */
  private async _deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      throw new Error("Web Crypto API is not available in this environment");
    }

    // Import the password as a raw key
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Derive the AES-GCM key using PBKDF2
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: SecurityService.KEY_DERIVATION_ITERATIONS,
        hash: "SHA-256",
      },
      passwordKey,
      {
        name: SecurityService.ALGORITHM,
        length: SecurityService.KEY_LENGTH,
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts plaintext data using AES-GCM with a password-derived key
   * @param plaintext - The data to encrypt as ArrayBuffer
   * @param password - The password to use for encryption
   * @returns Promise resolving to an object containing ciphertext, salt, and IV
   */
  public async encrypt(
    plaintext: ArrayBuffer,
    password: string
  ): Promise<{
    ciphertext: ArrayBuffer;
    salt: Uint8Array;
    iv: Uint8Array;
  }> {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      throw new Error("Web Crypto API is not available in this environment");
    }

    if (!password || password.length === 0) {
      throw new Error("Password cannot be empty");
    }

    if (!plaintext || plaintext.byteLength === 0) {
      throw new Error("Plaintext cannot be empty");
    }

    // Generate random salt and IV
    const salt = window.crypto.getRandomValues(
      new Uint8Array(SecurityService.SALT_LENGTH)
    );
    const iv = window.crypto.getRandomValues(
      new Uint8Array(SecurityService.IV_LENGTH)
    );

    try {
      // Derive the encryption key
      const key = await this._deriveKey(password, salt);

      // Encrypt the plaintext
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: SecurityService.ALGORITHM,
          iv: iv,
        },
        key,
        plaintext
      );

      return {
        ciphertext,
        salt,
        iv,
      };
    } catch (error) {
      throw new Error(
        `Encryption failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Decrypts ciphertext using AES-GCM with a password-derived key
   * @param ciphertext - The encrypted data as ArrayBuffer
   * @param password - The password used for encryption
   * @param salt - The salt used for key derivation
   * @param iv - The initialization vector used for encryption
   * @returns Promise resolving to the decrypted ArrayBuffer
   */
  public async decrypt(
    ciphertext: ArrayBuffer,
    password: string,
    salt: Uint8Array,
    iv: Uint8Array
  ): Promise<ArrayBuffer> {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      throw new Error("Web Crypto API is not available in this environment");
    }

    if (!password || password.length === 0) {
      throw new Error("Password cannot be empty");
    }

    if (!ciphertext || ciphertext.byteLength === 0) {
      throw new Error("Ciphertext cannot be empty");
    }

    if (!salt || salt.length !== SecurityService.SALT_LENGTH) {
      throw new Error(`Salt must be ${SecurityService.SALT_LENGTH} bytes long`);
    }

    if (!iv || iv.length !== SecurityService.IV_LENGTH) {
      throw new Error(`IV must be ${SecurityService.IV_LENGTH} bytes long`);
    }

    try {
      // Derive the decryption key using the same salt
      const key = await this._deriveKey(password, salt);

      // Decrypt the ciphertext
      const plaintext = await window.crypto.subtle.decrypt(
        {
          name: SecurityService.ALGORITHM,
          iv: iv,
        },
        key,
        ciphertext
      );

      return plaintext;
    } catch (error) {
      // Check if it's likely a wrong password (common error from crypto.subtle.decrypt)
      if (error instanceof DOMException && error.name === "OperationError") {
        throw new Error(
          "Decryption failed: Invalid password or corrupted data"
        );
      }
      throw new Error(
        `Decryption failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Converts a Uint8Array to a Base64 string for storage
   * @param uint8Array - The Uint8Array to convert
   * @returns Base64 encoded string
   */
  public static arrayToBase64(uint8Array: Uint8Array): string {
    return btoa(String.fromCharCode(...uint8Array));
  }

  /**
   * Converts a Base64 string back to a Uint8Array
   * @param base64String - The Base64 string to convert
   * @returns Uint8Array
   */
  public static base64ToArray(base64String: string): Uint8Array {
    return new Uint8Array(
      atob(base64String)
        .split("")
        .map((char) => char.charCodeAt(0))
    );
  }
}

/**
 * Singleton instance of SecurityService for global use
 */
export const securityService = new SecurityService();
