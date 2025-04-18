import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import type { CID } from 'multiformats/cid'
import { encryptFile, encryptAESKey, decryptAESKey, generateAESKey } from './cryptography';
import { asyncIterableToArrayBuffer } from './helpers';

async function initHelia() {
  const helia = await createHelia();
  const fs = unixfs(helia);
  return { helia, fs };
}

export async function uploadFile(file: File) {
  const { fs } = await initHelia();
  const buffer = await file.arrayBuffer();
  const cid = await fs.addBytes(new Uint8Array(buffer));
  console.log("File uploaded, CID:", cid.toString());
  return cid;
}

export async function uploadEncryptedFile(file: File, rsaPublicKey: CryptoKey) {
  const aesKey = await generateAESKey();
  const { encryptedData, iv } = await encryptFile(file, aesKey);
  const encryptedAESKey = await encryptAESKey(aesKey, rsaPublicKey);

  const { fs } = await initHelia();
  const fileCID = await fs.addBytes(encryptedData);

  return { fileCID: fileCID, encryptedAESKey, iv: Buffer.from(iv).toString("base64") };
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
