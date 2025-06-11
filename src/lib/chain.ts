import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { RsaStorage } from "@project/anchor";
import { keccak_256 } from "js-sha3";
import { hexToBytes } from "@noble/hashes/utils";
import {
  encryptAndUploadSharedAESKey,
} from "./ipfs";
import { create } from "@web3-storage/w3up-client";

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
  const rawAccounts = await program.provider.connection.getProgramAccounts(
    program.programId,
    {
      filters: [{ dataSize: expectedSize }],
    }
  );

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
      console.warn(
        "Skipping invalid FileMetadata account:",
        raw.pubkey.toBase58()
      );
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

  const fileMetadata = await program.account.fileMetadata.fetch(
    fileMetadataPDA
  );

  return {
    pubkey: fileMetadataPDA,
    ...fileMetadata,
  };
}

/**
 * Store metadata of an uploaded file on-chain using the file's CID.
 *
 * Derives a PDA using the keccak-256 hash of the CID and stores:
 * - The CID of the file stored on IPFS
 * - The CID of the encrypted AES key JSON file
 * - A flag indicating if the file is public (set to true by default)
 *
 * @param program - The Anchor program instance
 * @param cid - The IPFS CID of the encrypted file
 * @param keyCid - The IPFS CID of the encrypted AES key JSON
 * @param uploader - The uploader's wallet public key
 * @param programId - The deployed Solana program ID
 * @returns The PDA of the stored FileMetadata account
 */
export async function storeFileMetadata(
  program: Program<RsaStorage>,
  cid: string,
  keyCid: string,
  uploader: PublicKey,
  programId: PublicKey
) {
  const cidHash = Buffer.from(keccak_256.arrayBuffer(cid));

  const [fileMetadataPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("file_metadata"), cidHash],
    programId
  );

  await program.methods
    .storeFileMetadata(cid, keyCid, true)
    .accounts({
      fileMetadata: fileMetadataPDA,
      uploader,
    })
    .remainingAccounts([
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ])
    .rpc();

  return fileMetadataPDA;
}

/**
 * Register a user's RSA public key on-chain by storing it in a UserRSAKey account.
 *
 * This key is used to encrypt AES keys for files uploaded by the user. The key
 * is stored under the user's public key and will be used to later fetch and verify
 * file access permissions securely.
 *
 * @param publicKey - The user's wallet public key
 * @param publicKeyPem - PEM-encoded RSA public key string
 * @param program - The Anchor program instance
 * @returns The transaction signature of the registration call
 */
export async function registerRSAKeyOnChain(
  publicKey: PublicKey,
  publicKeyPem: string,
  program: Program<RsaStorage>
) {
  return await program.methods
    .storeRsaKey(publicKeyPem)
    .accounts({
      user: publicKey,
    })
    .remainingAccounts([
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ])
    .rpc();
}

/**
 * Fetches the RSA public key registered for a given user's wallet public key.
 */
export async function getRSAKeyByPubkey(
  program: Program<RsaStorage>,
  userPubkey: PublicKey
): Promise<string | null> {
  try {
    const [rsaPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_rsa"), userPubkey.toBuffer()],
      program.programId
    );

    const rsaKeyAccount = await program.account.userRsaKey.fetch(rsaPDA);
    return rsaKeyAccount.rsaKey;
  } catch (err) {
    console.warn(
      "Could not fetch RSA key for user:",
      userPubkey.toBase58(),
      err
    );
    return null;
  }
}

/**
 * Shares access to a file by uploading a new AES key encrypted for another user,
 * and writing a SharedAccess account on-chain.
 */
export async function shareFileWithUser(options: {
  program: Program<RsaStorage>;
  sharer: any;
  fileCid: string;
  aesKeyRaw: ArrayBuffer;
  recipientPubkey: string; // base58 string
  recipientRsaPublicKeyPem: string;
  client: Awaited<ReturnType<typeof create>>;
}) {
  const {
    program,
    sharer,
    fileCid,
    aesKeyRaw,
    recipientPubkey,
    recipientRsaPublicKeyPem,
    client,
  } = options;

  // Step 1: Encrypt the AES key for the recipient and upload it to IPFS
  const sharedKeyCid = await encryptAndUploadSharedAESKey(
    aesKeyRaw,
    recipientRsaPublicKeyPem,
    client
  );

  // Step 2: Call the smart contract to create a SharedAccess entry
  const hashHex = keccak_256(fileCid); // string (hex)
  const hashBytes = hexToBytes(hashHex); // Uint8Array
  const hashedCid = Buffer.from(hashBytes); // ✅ final 32-byte seed

  const [sharedAccessPda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("shared_access"),
      hashedCid,
      new PublicKey(recipientPubkey).toBuffer(),
    ],
    program.programId
  );
  const accounts = {
    sharer: sharer.publicKey,
    sharedWith: new PublicKey(recipientPubkey),
    sharedAccess: sharedAccessPda,
    systemProgram: SystemProgram.programId,
  };

  if (!sharer || typeof sharer.signTransaction !== "function") {
    throw new Error("❌ Invalid sharer: wallet must support signTransaction");
  }

  await program.methods
    .shareFileAccess(fileCid, sharedKeyCid)
    .accounts(accounts)
    .rpc();

  return sharedAccessPda;
}

/**
 * Fetches all shared access entries for the given user.
 *
 * @param program - The Anchor program instance
 * @param userPubKey - The user's wallet public key
 * @returns List of shared access entries for the user
 */
export async function listSharedFiles(
  program: Program<RsaStorage>,
  userPubkey: PublicKey
) {
  const allEntries = await program.account.sharedAccess.all();
  const sharedAccessAccounts = allEntries.filter(
    (entry) => entry.account.sharedWith.toBase58() === userPubkey.toBase58()
  );

  return sharedAccessAccounts.map((entry) => ({
    cid: entry.account.cid,
    sharedKeyCid: entry.account.sharedKeyCid,
    sharedBy: entry.account.sharedBy,
    timestamp: entry.account.timestamp,
  }));
}
