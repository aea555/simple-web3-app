import { encryptPrivateKeyWithPassword } from "./cryptography";
import {
  importPrivateKeyFromPem,
  isValidPrivateKeyPem,
  storeEncryptedPrivateKey,
} from "./store";

export async function asyncIterableToArrayBuffer(
  asyncIterable: AsyncIterable<Uint8Array>
): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of asyncIterable) {
    chunks.push(chunk);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const mergedArray = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    mergedArray.set(chunk, offset);
    offset += chunk.length;
  }

  return mergedArray.buffer;
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function handlePrivateKeyImport(
  e: React.ChangeEvent<HTMLInputElement>,
  setHasPrivateKey: (value: boolean) => void,
  setStatus: (value: string | null) => void,
  setError: (value: string | null) => void
) {
  const file = e.target.files?.[0];
  if (!file) return;

  const text = await file.text();

  if (!isValidPrivateKeyPem(text)) {
    setError("❌ Invalid PEM format. Please upload a valid RSA private key.");
    return;
  }

  const password = prompt(
    "Set a password to protect your private key (this is NOT the original PEM password)"
  );
  if (!password) {
    setError("❌ Password is required to protect the private key.");
    return;
  }

  try {
    const importedKey = await importPrivateKeyFromPem(text);
    const { cipherText, iv, salt } = await encryptPrivateKeyWithPassword(
      importedKey,
      password
    );
    await storeEncryptedPrivateKey(cipherText, iv, salt);
    setHasPrivateKey(true);
    setStatus("✅ Private key imported and encrypted successfully!");
  } catch (err) {
    setError("❌ Failed to import private key: " + (err as Error).message);
  }
}
