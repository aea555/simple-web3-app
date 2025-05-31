import { decryptPrivateKeyWithPassword } from "./cryptography";
import {
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

  const pemText = await file.text();

  if (
    !pemText.includes("BEGIN ENCRYPTED RSA PRIVATE KEY") ||
    !pemText.includes("END ENCRYPTED RSA PRIVATE KEY")
  ) {
    setError("❌ Invalid encrypted PEM format.");
    return;
  }

  try {
    const password = prompt("Enter the password used to encrypt this key:");
    if (!password) throw new Error("Missing password");

    const b64 = pemText.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const decoded = JSON.parse(atob(b64));

    const privateKey = await decryptPrivateKeyWithPassword(
      new Uint8Array(decoded.cipher),
      password,
      new Uint8Array(decoded.iv),
      new Uint8Array(decoded.salt)
    );

    await storeEncryptedPrivateKey(
      new Uint8Array(decoded.cipher),
      new Uint8Array(decoded.iv),
      new Uint8Array(decoded.salt)
    );

    setHasPrivateKey(true);
    setStatus("✅ Encrypted private key imported successfully!");
  } catch (err) {
    setError("❌ Failed to import encrypted private key: " + (err as Error).message);
  }
}

