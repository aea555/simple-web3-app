/* 
  -Using IndexedDB via idb-keyval for storing the private key.
*/

import { set, get, del } from "idb-keyval";
import { convertPemToBinary } from "./cryptography";

/*
  - Store the private RSA key in browser (IndexedDB).
*/
export async function storePrivateKey(privateKey: CryptoKey) {
  await set("rsa-private-key", privateKey);
}

/*
  - Retrieve the private RSA key from browser storage.
*/
export async function getPrivateKey(): Promise<CryptoKey | undefined> {
  return await get("rsa-private-key");
}

/*
  - Export CryptoKey to PEM (PKCS8 format) for download.
*/
export async function exportPrivateKeyToPem(
  privateKey: CryptoKey
): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const lines = base64.match(/.{1,64}/g)?.join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

/*
  - Trigger download of the PEM string as a .pem file.
*/
export async function downloadPrivateKeyPem(privateKey: CryptoKey) {
  const pem = await exportPrivateKeyToPem(privateKey);
  const blob = new Blob([pem], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "private-key.pem";
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
