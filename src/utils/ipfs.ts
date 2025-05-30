import { CID } from "multiformats/cid";
import { base64ToArrayBuffer } from "./helpers";
import { FileMetadata } from "./types";
import { initWeb3Client } from "./web3client";
import { AnyLink } from "@web3-storage/w3up-client/types";
import { decryptAESKey, encryptAESKeyBase64 } from "./cryptography";
import { getDecryptedPrivateKey, promptAndLoadPrivateKey } from "./store";

/**
 * Encrypts a file with AES-GCM, uploads it to Web3.Storage, and returns its CID + exported AES key.
 */
export async function uploadFile(
  file: File,
  aesKey: CryptoKey
): Promise<{ cid: AnyLink; encryptedKey: ArrayBuffer }> {
  // Read file into ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Generate random IV (12 bytes for AES-GCM)
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Encrypt file buffer using AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer
  );

  // Combine IV + encrypted content into one buffer
  const encryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
  encryptedBuffer.set(iv, 0);
  encryptedBuffer.set(new Uint8Array(encrypted), iv.length);

  // Upload to Web3.Storage using W3UP
  const client = await initWeb3Client();
  const encryptedFile = new File([encryptedBuffer], "encrypted.bin", {
    type: "application/octet-stream",
  });

  const cid = await client.uploadFile(encryptedFile); // returns AnyLink

  // Export raw AES key to encrypt with RSA later
  const exportedKey = await crypto.subtle.exportKey("raw", aesKey);

  return {
    cid,
    encryptedKey: exportedKey,
  };
}

/**
 * Fetch a raw binary file (Uint8Array) from Web3.Storage via IPFS gateway.
 * This is used for encrypted file content (not text), to avoid corruption.
 *
 * @param cid - IPFS CID of the file
 * @returns A combined Uint8Array representing the full binary file
 */
export async function fetchFileBinary(cid: CID): Promise<Uint8Array> {
  const cidStr = cid.toString();

  // Construct the Web3.Storage IPFS gateway URL
  const url = `https://${cidStr}.ipfs.w3s.link`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch file from gateway: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Fetch encrypted data + AES key from IPFS and decrypt both.
 */
export async function fetchAndDecryptFile(
  fileMeta: FileMetadata
): Promise<Blob> {
  // 1. Load user's private RSA key
  const { privateKey } = await promptAndLoadPrivateKey();
  if (!privateKey) throw new Error("Invalid password or corrupted key data.");

  // 2. Fetch encrypted AES key JSON from IPFS
  const keyCid = CID.parse(fileMeta.keyCid);
  const keyJsonRaw = await fetchFileBinary(keyCid);
  const keyJsonStr = new TextDecoder().decode(keyJsonRaw); // convert to UTF-8 string
  const keyJson = JSON.parse(keyJsonStr);
  const encryptedAESKeyBase64 = keyJson.encrypted_aes_key;

  // 3. Convert base64 AES key to ArrayBuffer
  const encryptedAESKeyBuffer = base64ToArrayBuffer(encryptedAESKeyBase64);

  // 4. Decrypt AES key
  const aesKey = await decryptAESKey(encryptedAESKeyBuffer, privateKey);

  // 5. Fetch the encrypted file (as Uint8Array) from IPFS
  const fileCid = CID.parse(fileMeta.cid);
  const encryptedBytes = await fetchFileBinary(fileCid);

  // 6. Split out IV and ciphertext
  const iv = encryptedBytes.slice(0, 12); // 12-byte IV for AES-GCM
  const ciphertext = encryptedBytes.slice(12);

  // 7. Decrypt file
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    ciphertext
  );

  // 8. Return result as a Blob (or string if it's a text file)
  return new Blob([decrypted]);
}

/**
 * Uploads a JSON file containing the RSA-encrypted AES key to Web3.Storage.
 *
 * @param encryptedKeyBase64 - AES key encrypted with RSA, base64 encoded
 * @returns CID string of the uploaded JSON file
 */
export async function uploadEncryptedAESKeyToIPFS(
  encryptedKeyBase64: string
): Promise<string> {
  const client = await initWeb3Client();

  const keyJson = JSON.stringify({
    encrypted_aes_key: encryptedKeyBase64,
  });

  const bytes = new TextEncoder().encode(keyJson);
  const file = new File([bytes], "encrypted-key.json", {
    type: "application/json",
  });

  const cid = await client.uploadFile(file);
  return cid.toString(); // for storing on-chain
}

export async function uploadEncryptedAESKey(
  publicKeyPem: string,
  rawAESKey: ArrayBuffer
): Promise<string> {
  const encryptedAESKeyBase64 = await encryptAESKeyBase64(
    publicKeyPem,
    rawAESKey
  );
  return await uploadEncryptedAESKeyToIPFS(encryptedAESKeyBase64);
}
