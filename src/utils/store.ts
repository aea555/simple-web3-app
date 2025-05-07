/* 
  -Using IndexedDB via idb-keyval for storing the private key.
*/

import { set, get } from "idb-keyval";
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
export async function exportPrivateKeyToPem(privateKey: CryptoKey): Promise<string> {
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