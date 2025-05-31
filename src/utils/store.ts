/* 
  -Using IndexedDB via idb-keyval for storing the private key.
*/

import { set, get, del } from "idb-keyval";
import { convertPemToBinary, decryptPrivateKeyWithPassword, encryptPrivateKeyWithPassword } from "./cryptography";

/*
  - Store the private RSA key in browser (IndexedDB).
*/
export async function storeEncryptedPrivateKey(
  cipherText: Uint8Array,
  iv: Uint8Array,
  salt: Uint8Array
) {
  await set("rsa-private-key-ciphertext", cipherText);
  await set("rsa-private-key-iv", iv);
  await set("rsa-private-key-salt", salt);
}

/*
  - Retrieve the private RSA key from browser storage.
*/
export async function getDecryptedPrivateKey(password: string): Promise<CryptoKey | undefined> {
  const cipherText = await get<Uint8Array>("rsa-private-key-ciphertext");
  const iv = await get<Uint8Array>("rsa-private-key-iv");
  const salt = await get<Uint8Array>("rsa-private-key-salt");

  if (!cipherText || !iv || !salt) return undefined;

  try {
    return await decryptPrivateKeyWithPassword(cipherText, password, iv, salt);
  } catch (e) {
    console.error("❌ Failed to decrypt private key:", e);
    return undefined;
  }
}

/*
  - Check if there is an encrypted private key stored.
*/
export async function hasEncryptedPrivateKey(): Promise<boolean> {
  const cipherText = await get<Uint8Array>("rsa-private-key-ciphertext");
  const iv = await get<Uint8Array>("rsa-private-key-iv");
  const salt = await get<Uint8Array>("rsa-private-key-salt");

  return !!(cipherText && iv && salt);
}

/**
 * Prompts user for RSA key password and tries to decrypt it.
 * Throws if password is missing or decryption fails.
 */
export async function promptAndLoadPrivateKey(): Promise<{privateKey: CryptoKey, password: string}>{
  const password = prompt("Enter the password to unlock your private RSA key:");
  if (!password) throw new Error("Password is required to decrypt private key.");

  const privateKey = await getDecryptedPrivateKey(password);
  if (!privateKey) throw new Error("Invalid password or failed to decrypt private key.");

  return {privateKey, password};
}

export function promptPassword(message: string = "Enter your private key password"): string | null {
  const password = prompt(message);
  if (!password || password.trim() === "") return null;
  return password;
}

/*
  - Export CryptoKey to PEM (PKCS8 format) for download.
*/
export async function exportEncryptedPrivateKeyToPem(
  privateKey: CryptoKey,
  password: string
): Promise<string> {
  const { cipherText, iv, salt } = await encryptPrivateKeyWithPassword(privateKey, password);
  const payload = JSON.stringify({
    iv: Array.from(iv),
    salt: Array.from(salt),
    cipher: Array.from(cipherText)
  });
  const b64 = btoa(payload);
  const pemLines = b64.match(/.{1,64}/g)?.join("\n");
  return `-----BEGIN ENCRYPTED RSA PRIVATE KEY-----\n${pemLines}\n-----END ENCRYPTED RSA PRIVATE KEY-----`;
}

/*
  - Trigger download of the PEM string as a .pem file.
*/
export async function downloadEncryptedPrivateKeyPem(privateKey: CryptoKey, password: string) {
  const pem = await exportEncryptedPrivateKeyToPem(privateKey, password);
  const blob = new Blob([pem], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "encrypted-private-key.pem";
  a.click();
}

/*
  - Import a private key as a .pem file
*/
export async function importPrivateKeyFromPem(pem: string): Promise<CryptoKey> {
  const binary = convertPemToBinary(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/*
  - Validates basic structure of a PKCS#8 PEM RSA private key
*/
export function isValidPrivateKeyPem(pem: string): boolean {
  const lines = pem.trim().split("\n");
  return (
    lines[0]?.includes("BEGIN PRIVATE KEY") &&
    lines[lines.length - 1]?.includes("END PRIVATE KEY") &&
    lines.length >= 3 // At least header, body, footer
  );
}

/*
  - Store a delegation CAR file (as Uint8Array) and its expiration time (in seconds)
*/
export async function storeDelegation(bytes: Uint8Array, expiration: number) {
  await set("w3up-delegation", bytes);
  await set("w3up-delegation-exp", expiration);
}

/*
  - Retrieve the stored delegation CAR and expiration, or return undefined if not found.
*/
export async function getDelegation(): Promise<{ bytes: Uint8Array; exp: number } | undefined> {
  const bytes = await get<Uint8Array>("w3up-delegation");
  const exp = await get<number>("w3up-delegation-exp");
  if (!bytes || typeof exp !== "number") return undefined;
  return { bytes, exp };
}

/*
  - Remove delegation data from storage (e.g. when expired or invalid)
*/
export async function clearDelegation() {
  await del("w3up-delegation");
  await del("w3up-delegation-exp");
}
