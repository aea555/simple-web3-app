import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getProgram, getProgramId, RsaStorage } from "@project/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";

export async function asyncIterableToArrayBuffer(asyncIterable: AsyncIterable<Uint8Array>): Promise<ArrayBuffer> {
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

export async function importRSAPublicKeyFromSolana(user: PublicKey, prog: Program<RsaStorage>): Promise<CryptoKey> {
  const [userRsaPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_rsa"), user.toBuffer()],
    getProgramId("devnet")
  );

  const account = await prog.account.userRsaKey.fetch(userRsaPDA);
  const base64Key = account.rsaKey;

  const binaryKey = Buffer.from(base64Key, "base64");

  return await crypto.subtle.importKey(
    "spki",
    binaryKey.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}