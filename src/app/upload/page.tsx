"use client";

import { useEffect, useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  fetchFile,
  fetchRawFile,
  uploadEncryptedAESKeyToIPFS,
  uploadFile,
} from "@/utils/ipfs";
import {
  encryptAESKeyWithRSA,
  fetchRSAKey,
  generateRSAKeyPair,
  decryptAESKey,
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
  const [keyCid, setKeyCid] = useState<string | null>(null); // Store keyCid
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState<boolean>(false);
  const [fileType, setFileType] = useState<string | null>(null);

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
    
    // Store the file type for later use when displaying
    setFileType(file.type);

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

      // Store encryptedAESKeyBase64 on IPFS
      const keyCid = await uploadEncryptedAESKeyToIPFS(encryptedAESKeyBase64);
      setKeyCid(keyCid);
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
    if (!cid || !keyCid) {
      setError("Missing CID or key CID to fetch the file");
      return;
    }

    try {
      setStatus("🔍 Fetching encrypted file from IPFS...");
      
      // 1. Fetch the encrypted file
      const encryptedData = await fetchRawFile(cid);
      
      // 2. Fetch the encrypted AES key
      const encryptedKeyJson = await fetchFile(keyCid as any);
      const { encrypted_aes_key } = JSON.parse(encryptedKeyJson);
      
      // 3. Get the private key from storage
      const privateKey = await getPrivateKey();
      if (!privateKey) {
        setError("❌ No private key found. Cannot decrypt the file.");
        return;
      }
      
      // 4. Decrypt the AES key
      const encryptedKeyBytes = Uint8Array.from(atob(encrypted_aes_key), c => c.charCodeAt(0));
      const encryptedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBytes.buffer)));
      const aesKey = await decryptAESKey(encryptedKeyBase64, privateKey);
      
      // 5. Extract IV and encrypted data from the file
      const iv = new Uint8Array(encryptedData.slice(0, 12));
      const encryptedContent = new Uint8Array(encryptedData.slice(12));
      
      // 6. Decrypt the file content
      const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encryptedContent
      );
      
      // 7. Create a Blob with the correct MIME type
      const blob = new Blob([decryptedData], { type: fileType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      setFileUrl(url);
      setStatus("✅ File decrypted and ready to view!");
    } catch (error: any) {
      console.error("Error fetching and decrypting file:", error);
      setError("❌ Failed to fetch or decrypt file: " + (error.message || error.toString()));
    }
  }

  // Clean up URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

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

                  // Validate PEM format
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
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          setFile(selectedFile);
          if (selectedFile) {
            setFileType(selectedFile.type);
          }
        }}
        className="border p-2 w-full"
      />

      <button
        onClick={handleUpload}
        disabled={!file || !hasPrivateKey}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        Upload
      </button>

      {status && <p className="text-blue-500">{status}</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {cid && (
        <div className="mt-4">
          <p className="text-green-600 break-all">📁 CID: {cid.toString()}</p>
          {keyCid && (
            <p className="text-green-600 break-all">🔑 Key CID: {keyCid}</p>
          )}
          <button
            onClick={handleFetch}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded mt-2"
            disabled={!hasPrivateKey}
          >
            Decrypt & Display File
          </button>
        </div>
      )}

      {/* Display the file if a URL is available */}
      {fileUrl && (
        <div className="mt-4 p-2 border rounded">
          <h3 className="font-bold mb-2">Decrypted File:</h3>
          {fileType?.startsWith('image/') ? (
            <img src={fileUrl} alt="Decrypted File" className="max-w-full rounded" />
          ) : fileType?.startsWith('video/') ? (
            <video controls className="max-w-full rounded">
              <source src={fileUrl} type={fileType} />
              Your browser does not support the video tag.
            </video>
          ) : fileType?.startsWith('audio/') ? (
            <audio controls className="max-w-full">
              <source src={fileUrl} type={fileType} />
              Your browser does not support the audio tag.
            </audio>
          ) : fileType?.startsWith('text/') || fileType?.includes('json') ? (
            <div className="p-2 bg-gray-100 rounded overflow-auto max-h-60">
              <iframe src={fileUrl} className="w-full h-60" title="Text file"></iframe>
            </div>
          ) : (
            <div className="p-2 bg-gray-100 rounded text-center">
              <p>File ready for download</p>
              <a 
                href={fileUrl} 
                download={file?.name || "download"} 
                className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded inline-block mt-2"
              >
                Download File
              </a>
            </div>
          )}
        </div>  
      )}
    </div>
  );
}