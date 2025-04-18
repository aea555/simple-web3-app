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

export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
  );
}

export async function encryptAESKey(aesKey: CryptoKey, rsaPublicKey: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      rsaPublicKey,
      rawKey
  );

  return Buffer.from(new Uint8Array(encryptedKey)).toString("base64");
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

