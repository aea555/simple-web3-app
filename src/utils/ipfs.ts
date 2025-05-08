import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import type { CID } from 'multiformats/cid';
import { encryptFile, encryptAESKeyWithRSA, decryptAESKey, generateAESKey } from './cryptography';
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

export async function uploadFile(
  file: File,
  aesKey: CryptoKey
): Promise<{ cid: CID; encryptedKey: ArrayBuffer }> {
  try {
    const { fs } = await getHeliaAndFS();

    const fileBuffer = await file.arrayBuffer();
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileBuffer);
    const encryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
    encryptedBuffer.set(iv, 0);
    encryptedBuffer.set(new Uint8Array(encrypted), iv.length);

    const cid = await fs.addBytes(encryptedBuffer);
    const exportedKey = await crypto.subtle.exportKey('raw', aesKey);

    return { cid, encryptedKey: exportedKey };
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw new Error('Failed to upload file to IPFS.');
  }
}

export async function fetchAndDecryptFile(
  cid: CID,
  encryptedAESKey: string,
  iv: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    const { fs } = await getHeliaAndFS();
    const encryptedFileStream = fs.cat(cid);
    const encryptedFile = await asyncIterableToArrayBuffer(encryptedFileStream);

    const aesKey = await decryptAESKey(encryptedAESKey, privateKey);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: Buffer.from(iv, 'base64') },
      aesKey,
      encryptedFile
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Error fetching and decrypting file:', error);
    throw new Error('Failed to fetch and decrypt file from IPFS.');
  }
}

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

export async function uploadEncryptedAESKeyToIPFS(encryptedKeyBase64: string): Promise<string> {
  try {
    const { fs } = await getHeliaAndFS();

    const keyJson = JSON.stringify({
      encrypted_aes_key: encryptedKeyBase64,
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