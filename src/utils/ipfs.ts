import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import type { CID } from 'multiformats/cid'
import { encryptFile, encryptAESKeyWithRSA, decryptAESKey, generateAESKey } from './cryptography';
import { asyncIterableToArrayBuffer } from './helpers';

async function initHelia() {
  const helia = await createHelia();
  const fs = unixfs(helia);
  return { helia, fs };
}

export async function uploadFile(file: File, aesKey: CryptoKey): Promise<{ cid: CID, encryptedKey: ArrayBuffer }> {
  const { fs } = await initHelia();

  const fileBuffer = await file.arrayBuffer();

  // Create random IV
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Encrypt file with AES
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer
  );

  // Combine IV + encrypted content
  const encryptedBuffer = new Uint8Array(iv.length + encrypted.byteLength);
  encryptedBuffer.set(iv, 0);
  encryptedBuffer.set(new Uint8Array(encrypted), iv.length);

  // Upload to IPFS
  const cid = await fs.addBytes(encryptedBuffer);

  // Export raw AES key to encrypt it later with RSA
  const exportedKey = await crypto.subtle.exportKey("raw", aesKey); 

  return {
    cid,
    encryptedKey: exportedKey 
  };
}

export async function fetchAndDecryptFile(cid: CID, encryptedAESKey: string, iv: string, privateKey: CryptoKey) {
  const { fs } = await initHelia();
  const encryptedFileStream = fs.cat(cid);
  const encryptedFile = await asyncIterableToArrayBuffer(encryptedFileStream);

  const aesKey = await decryptAESKey(encryptedAESKey, privateKey);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
    aesKey,
    encryptedFile
  );

  return new TextDecoder().decode(decrypted);
}

export async function fetchFile(cid: CID) {
  const { fs } = await initHelia();
  const stream = fs.cat(cid);
  let data = '';

  for await (const chunk of stream) {
    data += new TextDecoder().decode(chunk);
  }
  return data;
}

export async function uploadEncryptedAESKeyToIPFS(encryptedKeyBase64: string): Promise<string> {
  const { fs } = await initHelia();

  const keyJson = JSON.stringify({
    encrypted_aes_key: encryptedKeyBase64,
  });

  const bytes = new TextEncoder().encode(keyJson);
  const cid = await fs.addBytes(bytes);
  return cid.toString();
}
