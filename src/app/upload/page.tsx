"use client";

import { useEffect, useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  fetchFile, // Keep this for text files
  fetchRawFile, // Import this for binary files
  uploadEncryptedAESKeyToIPFS,
  uploadFile,
} from "@/utils/ipfs";
import {
  encryptAESKeyWithRSA,
  fetchRSAKey,
  generateRSAKeyPair,
} from "@/utils/cryptography";
import type { CID } from "multiformats/cid";
import { getProgram, getProgramId } from "@project/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak_256 } from "js-sha3";
import {
  storePrivateKey,
  getPrivateKey,
  downloadPrivateKeyPem,
  importPrivateKeyFromPem,
  isValidPrivateKeyPem,
} from "@/utils/store";

export default function Upload() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<CID | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null); // URL for displaying the file
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState<boolean>(false);

  useEffect(() => {
    getPrivateKey().then((key) => setHasPrivateKey(!!key));
  }, []);

  async function handleRegisterRsaKey() {
    if (!publicKey || !anchorWallet) return;

    // Check if a private key already exists in IndexedDB
    const existingKey = await getPrivateKey();
    if (existingKey) {
      setStatus("🔐 RSA private key already exists in your browser.");
      return;
    }

    try {
      // Set status to indicate process has started
      setStatus("🔐 Generating and registering RSA key...");

      // Setup Solana connection and Anchor provider
      const connection = new Connection("https://api.devnet.solana.com");
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = getProgram(provider);

      // Generate RSA key pair (2048-bit) in browser
      // This key will be used to encrypt/decrypt AES keys for files
      const { publicKeyPem, privateKey } = await generateRSAKeyPair();

      // Store the private key securely in indexed-db
      await storePrivateKey(privateKey);
      setHasPrivateKey(true);

      // Store the public key on-chain (as a string) in the UserRSAKey PDA
      const tx = await program.methods
        .storeRsaKey(publicKeyPem)
        .accounts({
          user: publicKey, // payer and signer
        })
        .remainingAccounts([
          {
            pubkey: SystemProgram.programId, // needed for init
            isSigner: false,
            isWritable: false,
          },
        ])
        .rpc();

      // Confirm registration
      console.log("RSA key stored! Tx:", tx);
      setStatus("✅ RSA key registered!");
    } catch (err: any) {
      console.error(err);
      setError(
        "❌ RSA key registration failed: " + (err.message || err.toString())
      );
      setStatus(null);
    }
  }

  async function handleUpload() {
    if (!file || !publicKey || !anchorWallet) return;

    setStatus("📤 Uploading file to IPFS...");
    setError(null);

    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(connection, anchorWallet, {});
    const program = getProgram(provider);
    const programId = getProgramId("devnet");

    try {
      // 1. Fetch user's RSA public key from Solana
      const { raw: rsaPem } = await fetchRSAKey(publicKey, programId, program);

      // 2. Generate AES key
      const aesKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );

      // 3. Upload file encrypted with AES key to IPFS
      const { cid, encryptedKey: rawAESKey } = await uploadFile(file, aesKey);
      setCid(cid);

      // 4. Encrypt the AES key with RSA
      const encryptedAESKey = await encryptAESKeyWithRSA(rsaPem, rawAESKey);
      const encryptedAESKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(encryptedAESKey))
      );

      // Store encryptedAESKeyBase64 oon IPFS
      const keyCid = await uploadEncryptedAESKeyToIPFS(encryptedAESKeyBase64);
      setStatus(`🔐 Encrypted AES key uploaded. keyCID: ${keyCid}`);

      setStatus("📦 Storing file metadata on-chain...");

      // 5. Store file metadata on-chain
      const cidHash = Buffer.from(keccak_256.arrayBuffer(cid.toString()));
      const [fileMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("file_metadata"), cidHash],
        programId
      );

      const tx = await program.methods
        .storeFileMetadata(cid.toString(), keyCid, true)
        .accounts({
          fileMetadata: fileMetadataPDA,
          uploader: publicKey,
        })
        .remainingAccounts([
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
        ])
        .rpc();

      setStatus(`✅ Upload complete! Transaction ID: ${tx}`);
    } catch (err: any) {
      console.error(err);
      setError("❌ Upload failed: " + (err.message || err.toString()));
      setStatus(null);
    }
  }

 async function handleFetch() {
    if (!cid || !file) return; // Ensure 'file' is available

    try {
      const rawData = await fetchRawFile(cid);
      const blob = new Blob([rawData], { type: file.type }); // Use the file's type
      const url = URL.createObjectURL(blob);
      setFileUrl(url); // Store the Blob URL for display
    } catch (error) {
      console.error("Error fetching file:", error);
      setError("Failed to fetch file.");
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {publicKey ? (
        <p className="text-sm text-gray-600">
          Connected Wallet: {publicKey.toBase58().substring(0, 10).trimEnd() + "..."}
        </p>
      ) : (
        <p className="text-sm text-red-600">Connect Wallet</p>
      )}

      {/* Key Management Section */}
      <div className="flex flex-col gap-4">
        {!hasPrivateKey ? (
          <>
            {/* Register RSA Key */}
            <button
              onClick={handleRegisterRsaKey}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              Register RSA Key
            </button>

            <span className="text-center font-bold text-white">OR</span>

            {/* Import Private Key (styled like button) */}
            <label className="cursor-pointer bg-rose-700 hover:bg-rose-800 text-white py-2 px-4 rounded text-center">
              Import RSA Private Key (.pem)
              <input
                type="file"
                accept=".pem"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const text = await file.text();

                  // ✅ Validate PEM format
                  if (!isValidPrivateKeyPem(text)) {
                    setError(
                      "❌ Invalid PEM format. Please upload a valid RSA private key."
                    );
                    return;
                  }

                  try {
                    // Parse and import the RSA private key
                    const importedKey = await importPrivateKeyFromPem(text);
                    await storePrivateKey(importedKey);
                    setHasPrivateKey(true);
                    setStatus("✅ Private key imported successfully!");
                  } catch (err) {
                    setError(
                      "❌ Failed to import private key: " +
                        (err as Error).message
                    );
                  }
                }}
                className="hidden"
              />
            </label>
          </>
        ) : (
          <button
            onClick={async () => {
              const key = await getPrivateKey();
              if (key) {
                await downloadPrivateKeyPem(key);
              } else {
                alert("No private key found in this browser.");
              }
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded"
          >
            Download Private Key
          </button>
        )}
      </div>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 w-full"
      />

      <button
        onClick={handleUpload}
        disabled={!file}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        Upload
      </button>

      {status && <p className="text-blue-500">{status}</p>}
      {cid && (
        <div className="mt-4">
          <p className="text-green-600 break-all">📁 CID: {cid.toString()}</p>
          <button
            onClick={handleFetch}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded mt-2"
          >
            Display File
          </button>
        </div>
      )}
      {error && <p className="text-red-500">{error}</p>}

      {/* Display the file if a URL is available */}
      {fileUrl && (
        <div className="mt-4">
          {/* You might need to adjust this based on the actual file type. */}
          <img src={fileUrl} alt="Uploaded File" className="max-w-full" />
        </div>
      )}
    </div>
  );
}