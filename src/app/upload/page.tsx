'use client'

import { useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchFile, uploadEncryptedFile, uploadFile } from "@/utils/ipfs";
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

  async function handleUpload() {
    if (!file || !publicKey || !anchorWallet) return;
    
    setStatus("📤 Uploading file to IPFS...");
    setError(null);

    const connection = new Connection("https://api.devnet.solana.com");
    const provider = new AnchorProvider(connection, anchorWallet, {});
    const program = getProgram(provider);
  
    try {
      const cidObj = await uploadFile(file);
      const cidString = cidObj.toString();
      setCid(cidObj);
      setStatus("📦 Storing file metadata on-chain...");

      const cidHash = Buffer.from(keccak_256.arrayBuffer(cidString));

      const [fileMetadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("file_metadata"), cidHash],
        getProgramId("devnet")
      );

      await program.rpc.storeFileMetadata(cidString, true, {
        accounts: {
          fileMetadata: fileMetadataPDA,
          uploader: publicKey,
          systemProgram: SystemProgram.programId,
        },
      });

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
