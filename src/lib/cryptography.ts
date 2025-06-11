import { PublicKey } from "@solana/web3.js";

/**
 * Encrypts a raw AES key using an RSA public key (in PEM format),
 * then encodes the result in base64 for easy JSON transport.
 */
export async function encryptAESKeyBase64(
  rsaPem: string,
  rawAESKey: ArrayBuffer
): Promise<string> {
  const encryptedAESKey = await encryptAESKeyWithRSA(rsaPem, rawAESKey); // Encrypt AES key with RSA public key
  return btoa(String.fromCharCode(...new Uint8Array(encryptedAESKey))); // Convert to base64
}

/**
 * Encrypts a file using AES-GCM and returns the encrypted data and IV used.
 */
export async function encryptFile(
  file: File,
  aesKey: CryptoKey
): Promise<{ encryptedData: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate a random IV
  const fileBuffer = await file.arrayBuffer(); // Read file into ArrayBuffer
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer
  ); // Encrypt using AES-GCM
  return { encryptedData: new Uint8Array(encrypted), iv }; // Return result and IV
}

/**
 * Converts a PEM-encoded key to binary ArrayBuffer format.
 */
export function convertPemToBinary(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""); // Remove header/footer and newlines
  const binStr = atob(b64); // Decode base64
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i); // Convert to bytes
  }
  return bytes.buffer; // Return ArrayBuffer
}

/**
 * Converts a binary key to a PEM-encoded string for export.
 */
export function convertBinaryToPem(buffer: ArrayBuffer, label: string): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer))); // Convert to base64
  const formatted = base64.match(/.{1,64}/g)?.join("\n"); // Format into 64-character lines
  return `-----BEGIN ${label}-----\n${formatted}\n-----END ${label}-----`; // Add PEM headers
}

/**
 * Encrypts a raw AES key using an RSA public key provided in PEM format.
 */
export async function encryptAESKeyWithRSA(
  publicKeyPem: string,
  rawAESKey: ArrayBuffer
): Promise<ArrayBuffer> {
  const importedRSAPubKey = await crypto.subtle.importKey(
    "spki",
    convertPemToBinary(publicKeyPem), // Convert PEM to binary
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  // Ensure input is a CryptoKey
  const aesCryptoKey = await crypto.subtle.importKey(
    "raw",
    rawAESKey,
    { name: "AES-GCM" },
    true,
    ["encrypt"]
  );

  // Then export back to raw before encrypting with RSA
  const aesKeyBuffer = await crypto.subtle.exportKey("raw", aesCryptoKey);

  return crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedRSAPubKey,
    aesKeyBuffer
  );
}

/**
 * Fetches the user's RSA public key from the blockchain and converts it to a CryptoKey.
 */
export async function fetchRSAKey(
  userPublicKey: any,
  programId: any,
  program: any
): Promise<{ raw: string; cryptoKey: CryptoKey } | null> {
  const [userRsaPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_rsa"), userPublicKey.toBuffer()], // Derive PDA
    programId
  );
  try {
    const account = await program.account.userRsaKey.fetch(userRsaPDA); // Fetch account
    const pem = account.rsaKey as string;
    const cryptoKey = await window.crypto.subtle.importKey(
      "spki",
      convertPemToBinary(pem), // Convert PEM to CryptoKey
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
    return { raw: pem, cryptoKey }; // Return both forms
  } catch (err) {
    console.warn("⚠️ RSA Key not found for user:", err);
    return null;
  }
}

/**
 * Generates a 256-bit AES-GCM key.
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, // AES 256-bit
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Decrypts an AES key using the user's RSA private key.
 */
export async function decryptAESKey(
  encryptedAESKey: ArrayBuffer,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const decryptedKeyBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedAESKey // Decrypt AES key
  );
  return await crypto.subtle.importKey(
    "raw",
    decryptedKeyBuffer,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );
}

/**
 * Generates an RSA-OAEP keypair (2048-bit), returning the public key as PEM and private key as CryptoKey.
 */
export async function generateRSAKeyPair(): Promise<{
  publicKeyPem: string;
  privateKey: CryptoKey;
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // Standard exponent
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey); // Export public key
  const pem = convertBinaryToPem(spki, "PUBLIC KEY"); // Format as PEM
  return {
    publicKeyPem: pem,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Derives an AES-GCM key from a password using PBKDF2 with SHA-256 and a salt.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password); // Encode password
  const safeSalt = new Uint8Array(new ArrayBuffer(salt.length));
  safeSalt.set(salt); // Defensive copy
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: safeSalt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an RSA private key with a password-derived AES key.
 * Returns the ciphertext along with IV and salt used.
 */
export async function encryptPrivateKeyWithPassword(
  privateKey: CryptoKey,
  password: string
): Promise<{
  cipherText: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
}> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey); // Export as PKCS8
  const salt = crypto.getRandomValues(new Uint8Array(16)); // Generate salt
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate IV
  const aesKey = await deriveKeyFromPassword(password, salt); // Derive AES key
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    pkcs8
  );
  return {
    cipherText: new Uint8Array(encrypted), // Encrypted data
    iv,
    salt,
  };
}

/**
 * Decrypts an RSA private key encrypted with AES-GCM and a password-derived key.
 */
export async function decryptPrivateKeyWithPassword(
  cipherText: Uint8Array,
  password: string,
  iv: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  const aesKey = await deriveKeyFromPassword(password, new Uint8Array(salt)); // Derive key from password
  const safeIv = new Uint8Array([...iv]); // Defensive copy
  const safeCipher = new Uint8Array([...cipherText]); // Defensive copy
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: safeIv },
    aesKey,
    safeCipher // Decrypt private key
  );
  return await crypto.subtle.importKey(
    "pkcs8",
    decrypted,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}
