import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getProgramId, RsaStorage } from "@project/anchor";
import { keccak_256 } from "js-sha3";

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

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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

/**
 * Fetch all valid FileMetadata accounts uploaded by the current user,
 * using raw account filtering to avoid deserialization errors.
 *
 * @param program - The Anchor program instance
 * @param userPublicKey - The user's wallet public key
 * @returns List of file metadata uploaded by the user, sorted by timestamp (newest first)
 */
export async function fetchUserFiles(
  program: Program<RsaStorage>,
  userPublicKey: PublicKey
) {
  const expectedSize = 8 + 128 + 128 + 32 + 8 + 1; // 305 bytes

  // Fetch raw accounts with the exact data size for FileMetadata
  const rawAccounts = await program.provider.connection.getProgramAccounts(program.programId, {
    filters: [{ dataSize: expectedSize }],
  });

  const userFiles = [];

  for (const raw of rawAccounts) {
    try {
      // Attempt to deserialize the account using Anchor
      const account = await program.account.fileMetadata.fetch(raw.pubkey);

      // Filter by uploader
      if (account.uploader.toBase58() === userPublicKey.toBase58()) {
        userFiles.push({
          pubkey: raw.pubkey,
          ...account,
        });
      }
    } catch (e) {
      // Skip corrupted or mismatched accounts
      console.warn("Skipping invalid FileMetadata account:", raw.pubkey.toBase58());
    }
  }

  // Sort by timestamp descending
  return userFiles.sort(
    (a, b) => b.timestamp.toNumber() - a.timestamp.toNumber()
  );
}

/**
 * Fetch a single FileMetadata account by its CID.
 *
 * @param program - The Anchor program instance
 * @param programId - The deployed program ID
 * @param cid - The file CID (string from IPFS)
 * @returns The corresponding FileMetadata account
 */
export async function fetchFileMetadataByCID(
  program: Program<RsaStorage>,
  programId: PublicKey,
  cid: string
) {
  const cidHash = Buffer.from(keccak_256.arrayBuffer(cid));

  const [fileMetadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("file_metadata"), cidHash],
    programId
  );

  const fileMetadata = await program.account.fileMetadata.fetch(fileMetadataPDA);

  return {
    pubkey: fileMetadataPDA,
    ...fileMetadata,
  };
}