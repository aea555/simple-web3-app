import { PublicKey } from "@solana/web3.js";

export async function encryptFile(file: File, aesKey: CryptoKey): Promise<{ encryptedData: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV
  const fileBuffer = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      fileBuffer
  );

  return { encryptedData: new Uint8Array(encrypted), iv };
}

export function convertPemToBinary(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export function convertBinaryToPem(buffer: ArrayBuffer, label: string): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const formatted = base64.match(/.{1,64}/g)?.join("\n");
  return `-----BEGIN ${label}-----\n${formatted}\n-----END ${label}-----`;
}

export async function encryptAESKeyWithRSA(publicKeyPem: string, rawAESKey: ArrayBuffer): Promise<ArrayBuffer> {  
  const importedRSAPubKey = await crypto.subtle.importKey(
    "spki", 
    convertPemToBinary(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  return crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    importedRSAPubKey,
    rawAESKey
  );
}

export async function fetchRSAKey(
  userPublicKey: any,
  programId: any,
  program: any
): Promise<{ raw: string, cryptoKey: CryptoKey } | null> {
  // Derive PDA
  const [userRsaPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_rsa"), userPublicKey.toBuffer()],
    programId
  );

  try {
    // Fetch account data
    const account = await program.account.userRsaKey.fetch(userRsaPDA);
    const pem = account.rsaKey as string;

    // Import the RSA key into Web Crypto API
    const cryptoKey = await window.crypto.subtle.importKey(
      "spki",
      convertPemToBinary(pem),
      { name: "RSA-OAEP", hash: "SHA-256" },
      true, 
      ["encrypt"]
    );

    return { raw: pem, cryptoKey };
  } catch (err) {
    console.warn("⚠️ RSA Key not found for user:", err);
    return null;
  }
  
}

export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function decryptAESKey(encryptedAESKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const decryptedKeyBuffer = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      Buffer.from(encryptedAESKey, "base64")
  );

  return await crypto.subtle.importKey(
      "raw",
      decryptedKeyBuffer,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
  );
}

export async function generateRSAKeyPair(): Promise<{ publicKeyPem: string, privateKey: CryptoKey }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pem = convertBinaryToPem(spki, "PUBLIC KEY");

  return {
    publicKeyPem: pem,
    privateKey: keyPair.privateKey,
  };
}