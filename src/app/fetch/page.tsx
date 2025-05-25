"use client";

import { useState, useEffect } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchUserFiles, fetchFileMetadataByCID } from "@/utils/chain";
import { fetchAndDecryptFile } from "@/utils/ipfs";
import { saveAs } from "file-saver"; // for download
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { SolanaProgramContext } from "@/utils/types";

export default function FetchPage() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [fileCidInput, setFileCidInput] = useState("");
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const solana = useSolanaProgram(anchorWallet);

  useEffect(() => {
    if (!publicKey || !anchorWallet || !solana) return;
  
    (async () => {
      const { program, programId } = solana;
      const files = await fetchUserFiles(program, publicKey);
      setUserFiles(files);
    })();
  }, [publicKey, anchorWallet, solana]);

  async function handleDecrypt(metadata: any) {
    try {
      setStatus("🔓 Decrypting file...");
      const blob = await fetchAndDecryptFile(metadata);
      saveAs(blob, `decrypted-file-${metadata.cid.slice(0, 6)}.bin`);
      setStatus("✅ File decrypted and downloaded!");
      setError("");
    } catch (err) {
      console.error(err);
      setError("❌ Failed to decrypt file: " + (err as Error).message);
    }
  }

  async function handleManualFetch(solana: SolanaProgramContext | undefined) {
    if (!fileCidInput || !publicKey || !anchorWallet) {
      setError("❌ Missing input values!");
      return;
    }
    if (!solana) {
      setError("❌ Solana program failed to initialize!");
      return null;
    }

    try {
      setStatus("📥 Fetching metadata...");
      const metadata = await fetchFileMetadataByCID(
        solana.program,
        solana.programId,
        fileCidInput
      );
      await handleDecrypt(metadata);
    } catch (err) {
      console.error(err);
      setError("❌ Failed to fetch file: " + (err as Error).message);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {publicKey ? (
        <p className="text-sm text-gray-600">
          Connected Wallet: {publicKey.toBase58().substring(0, 10)}...
        </p>
      ) : (
        <p className="text-sm text-red-600">Connect Wallet</p>
      )}

      {/* Manual CID Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Decrypt by CID</label>
        <input
          type="text"
          placeholder="Enter file CID"
          value={fileCidInput}
          onChange={(e) => setFileCidInput(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          onClick={() => handleManualFetch(solana)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Decrypt File by CID
        </button>
      </div>

      {/* User File List */}
      <div className="space-y-4">
        <p className="font-medium text-white">Your Uploaded Files:</p>
        {userFiles.map((file) => (
          <div
            key={file.pubkey.toBase58()}
            className="border p-2 rounded bg-gray-50"
          >
            <p className="text-sm break-all text-gray-600">CID: {file.cid}</p>
            <p className="text-xs text-gray-500">
              Uploaded: {new Date(file.timestamp * 1000).toLocaleString()}
            </p>
            <button
              onClick={() => handleDecrypt(file)}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm"
            >
              Decrypt & Download
            </button>
          </div>
        ))}
      </div>

      {status && <p className="text-blue-500">{status}</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
