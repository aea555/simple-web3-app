import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import type { CID } from 'multiformats/cid';
import { asyncIterableToArrayBuffer } from './helpers';

let heliaInstance: Awaited<ReturnType<typeof createHelia>> | null = null;
let fsInstance: ReturnType<typeof unixfs> | null = null;

async function getHeliaAndFS() {
  try {
    if (!heliaInstance) {
      heliaInstance = await createHelia();
      fsInstance = unixfs(heliaInstance);
    }
    return { helia: heliaInstance, fs: fsInstance! };
  } catch (error) {
    console.error('Error initializing Helia:', error);
    throw new Error('Failed to initialize IPFS.');
  }
}

/**
 * Uploads a file to IPFS after encrypting it with AES-GCM
 * @param file The file to upload
 * @param aesKey The AES key to encrypt the file with
 * @returns Object containing the CID and the exported AES key
 */
export async function uploadFile(
  file: File,
  aesKey: CryptoKey
): Promise<{ cid: CID; encryptedKey: ArrayBuffer }> {
  try {
    const { fs } = await getHeliaAndFS();

    // Read the file
    const fileBuffer = await file.arrayBuffer();
    
    // Generate a random IV (initialization vector)
    const iv = new Uint8Array(12); // 12 bytes for AES-GCM
    crypto.getRandomValues(iv);
    
    // Encrypt the file with AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, 
      aesKey, 
      fileBuffer
    );
    
    // Prepend the IV to the encrypted data
    const encryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
    encryptedBuffer.set(iv, 0);
    encryptedBuffer.set(new Uint8Array(encrypted), iv.length);

    // Upload to IPFS
    const cid = await fs.addBytes(encryptedBuffer);
    
    // Export the AES key for encryption with RSA
    const exportedKey = await crypto.subtle.exportKey('raw', aesKey);

    return { cid, encryptedKey: exportedKey };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload file to IPFS.');
  }
}

/**
 * Fetches and decrypts a file from IPFS
 * @param cid The CID of the encrypted file
 * @param encryptedAESKey The encrypted AES key
 * @param privateKey The RSA private key to decrypt the AES key
 * @returns ArrayBuffer containing decrypted file data
 */
export async function fetchAndDecryptFile(
  cid: CID,
  encryptedAESKey: ArrayBuffer,
  privateKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    const { fs } = await getHeliaAndFS();
    
    // Fetch the file from IPFS
    const encryptedFileStream = fs.cat(cid);
    const encryptedFileBuffer = await asyncIterableToArrayBuffer(encryptedFileStream);
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = encryptedFileBuffer.slice(0, 12);
    const encryptedData = encryptedFileBuffer.slice(12);
    
    // Import the AES key
    const aesKeyAlgo = { name: 'AES-GCM', length: 256 };
    const aesKey = await crypto.subtle.importKey(
      'raw',
      encryptedAESKey,
      aesKeyAlgo,
      false,
      ['decrypt']
    );
    
    // Decrypt the file
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedData
    );
    
    return decryptedData;
  } catch (error) {
    console.error('Error fetching and decrypting file:', error);
    throw new Error('Failed to fetch and decrypt file from IPFS.');
  }
}

/**
 * Fetches a text file from IPFS
 * @param cid The CID of the file
 * @returns String containing the file content
 */
export async function fetchFile(cid: CID): Promise<string> {
  try {
    const { fs } = await getHeliaAndFS();
    const stream = fs.cat(cid);
    let data = '';

    for await (const chunk of stream) {
      data += new TextDecoder().decode(chunk);
    }
    return data;
  } catch (error) {
    console.error('Error fetching file from IPFS:', error);
    throw new Error('Failed to fetch file from IPFS.');
  }
}

/**
 * Fetches a raw file from IPFS as an ArrayBuffer
 * @param cid The CID of the file
 * @returns ArrayBuffer containing the file content
 */
export async function fetchRawFile(cid: CID): Promise<ArrayBuffer> {
  try {
    const { fs } = await getHeliaAndFS();
    const stream = fs.cat(cid);
    return await asyncIterableToArrayBuffer(stream);
  } catch (error) {
    console.error('Error fetching raw file from IPFS:', error);
    throw new Error('Failed to fetch raw file from IPFS.');
  }
}

/**
 * Uploads an encrypted AES key to IPFS
 * @param encryptedKeyBase64 The encrypted AES key as a Base64 string
 * @returns String representing the CID of the uploaded key
 */
export async function uploadEncryptedAESKeyToIPFS(encryptedKeyBase64: string): Promise<string> {
  try {
    const { fs } = await getHeliaAndFS();

    const keyJson = JSON.stringify({
      encrypted_aes_key: encryptedKeyBase64,
      // Could add additional metadata here if needed
      timestamp: Date.now()
    });

    const bytes = new TextEncoder().encode(keyJson);
    const cid = await fs.addBytes(bytes);
    return cid.toString();
  } catch (error) {
    console.error('Error uploading encrypted AES key to IPFS:', error);
    throw new Error('Failed to upload encrypted AES key to IPFS.');
  }
}

// Optional: Function to shut down the Helia instance (if needed)
export async function shutdownHelia() {
  if (heliaInstance) {
    await heliaInstance.stop();
    heliaInstance = null;
    fsInstance = null;
    console.log('Helia instance stopped.');
  }
}