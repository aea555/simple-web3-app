'use client'

import { useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchFile, uploadEncryptedAESKeyToIPFS, uploadFile} from "@/utils/ipfs";
import { encryptAESKeyWithRSA, fetchRSAKey, generateRSAKeyPair } from "@/utils/cryptography";
import type { CID } from 'multiformats/cid'
import { getProgram, getProgramId } from "@project/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { keccak_256 } from "js-sha3";

export default function Upload() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<CID | null>(null);
  const [retrievedData, setRetrievedData] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegisterRsaKey() {
    if (!publicKey || !anchorWallet) return;
  
    setStatus("🔐 Generating and registering RSA key...");
    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(connection, anchorWallet, {});
    const program = getProgram(provider);
  
    const { publicKeyPem, privateKey } = await generateRSAKeyPair();
  
    // Save private key (for now store in memory, later move to secure storage)
    // For now, just window variable for testing
    (window as any).rsaPrivateKey = privateKey;

    try {
      const tx = await program.methods
        .storeRsaKey(publicKeyPem)
        .accounts({
          user: publicKey,
        })
        .remainingAccounts([
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          }
        ])
        .rpc();
  
      console.log("RSA key stored! Tx:", tx);
      setStatus("✅ RSA key registered!");
    } catch (err: any) {
      console.error(err);
      setError("❌ RSA key registration failed: " + (err.message || err.toString()));
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
    const programId = getProgramId("devnet")

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

      await program.methods
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

      setStatus("✅ Upload complete!");
    } catch (err: any) {
      console.error(err);
      setError("❌ Upload failed: " + (err.message || err.toString()));
      setStatus(null);
    }
  }
  
  async function handleFetch() {
    if (!cid) return;
    const data = await fetchFile(cid);
    setRetrievedData(data);
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
    {publicKey ? (
      <p className="text-sm text-gray-600">Connected Wallet: {publicKey.toBase58().substring(0,10).trimEnd() + '...'}</p>
    ) : (
      <p className="text-sm text-red-600">Connect Wallet</p>
    )}

    <button
      onClick={handleRegisterRsaKey}
      className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
    >
      Register RSA Key
    </button>

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
    {cid && <p className="text-green-600 break-all">📁 CID: {cid.toString()}</p>}
    {error && <p className="text-red-500">{error}</p>}
  </div>
  );
}
