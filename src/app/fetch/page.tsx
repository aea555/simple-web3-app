"use client";

import { useState, useEffect } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { fetchUserFiles, fetchFileMetadataByCID } from "@/utils/chain";
import { fetchAndDecryptFile } from "@/utils/ipfs";
import { saveAs } from "file-saver";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { SolanaProgramContext } from "@/utils/types";
import { AppHero, ellipsify } from "@/components/ui/ui-layout";
import toast from "react-hot-toast";
import Link from "next/link";

export default function FetchPage() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [fileCidInput, setFileCidInput] = useState("");
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const solana = useSolanaProgram(anchorWallet);

  useEffect(() => {
    const loadUserFiles = async () => {
      if (!publicKey || !anchorWallet || !solana) {
        setUserFiles([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const files = await fetchUserFiles(solana.program, publicKey);
        files.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setUserFiles(files);
      } catch (err) {
        console.error("Failed to fetch user files:", err);
        setError("Failed to load your files. Please try again.");
        toast.error("Failed to load your files.");
      } finally {
        setLoading(false);
      }
    };

    loadUserFiles();
  }, [publicKey, anchorWallet, solana]);

  async function handleDecrypt(metadata: any) {
    if (!publicKey || !anchorWallet || !solana) {
      setError("Please connect your wallet first.");
      toast.error("Please connect your wallet to decrypt files.");
      return;
    }

    setLoading(true);
    setError(null);
    toast.loading("🔓 Decrypting file...", { id: 'decryptToast' });

    try {
      const blob = await fetchAndDecryptFile(metadata);
      const filename = `decrypted-${ellipsify(metadata.cid, 8)}.bin`;
      saveAs(blob, filename);
      toast.success("✅ File decrypted and downloaded!", { id: 'decryptToast' });
    } catch (err: any) {
      console.error("Decryption failed:", err);
      setError("❌ Failed to decrypt file: " + (err.message || "Unknown error"));
      toast.error("❌ Decryption failed: " + (err.message || "Unknown error"), { id: 'decryptToast' });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualFetch() {
    if (!fileCidInput.trim()) {
      setError("Please enter a file CID.");
      toast.error("Please enter a file CID.");
      return;
    }
    if (!publicKey || !anchorWallet) {
      setError("Please connect your wallet first.");
      toast.error("Please connect your wallet to fetch files.");
      return;
    }
    if (!solana) {
      setError("Solana program not initialized. Please try again.");
      toast.error("Solana program not initialized.");
      return;
    }

    setLoading(true);
    setError(null);
    toast.loading("📥 Fetching metadata...", { id: 'fetchMetadataToast' });

    try {
      const metadata = await fetchFileMetadataByCID(
        solana.program,
        solana.programId,
        fileCidInput.trim()
      );
      toast.success("Metadata fetched. Proceeding to decrypt...", { id: 'fetchMetadataToast' });
      await handleDecrypt(metadata);
      setFileCidInput('');
    } catch (err: any) {
      console.error("Manual fetch failed:", err);
      setError("❌ Failed to fetch file by CID: " + (err.message || "Unknown error"));
      toast.error("❌ Failed to fetch file: " + (err.message || "Unknown error"), { id: 'fetchMetadataToast' });
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("CID copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy CID:", err);
      toast.error("Failed to copy CID.");
    });
  };

  return (
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      {/* Top Section: Left and Right Columns for AppHero and Decrypt by CID */}
      {/* Added `items-stretch` to make columns equal height */}
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        {/* Left Column: Title */}
        {/* Added `flex` and `items-center justify-center` to vertically and horizontally center AppHero within its column height */}
        <div className="lg:w-1/2 flex items-center justify-center lg:justify-end mb-0 lg:pr-8 lg:mb-0">
          <AppHero
            className="mb-0"
            title="Access Your Encrypted Files"
            subtitle="Retrieve and decrypt your private data stored on IPFS."
          />
        </div>

        {/* Right Column: Main Content for Decrypt by CID */}
        {/* Added `flex flex-col justify-center` to vertically center content within this column */}
        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          {/* Wallet Connection Status */}
          <div className="text-center mb-4">
            {publicKey ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Connected Wallet: <span className="font-semibold text-violet-600 dark:text-violet-400">{ellipsify(publicKey.toBase58())}</span>
              </p>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">Please connect your Solana wallet to access files.</p>
            )}
          </div>

          {/* Decrypt by CID Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Decrypt by File CID</h2>
            <input
              type="text"
              placeholder="Enter full file CID (e.g., bafybeia...)"
              value={fileCidInput}
              onChange={(e) => setFileCidInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-violet-500 focus:border-violet-500 transition duration-200"
              disabled={loading || !publicKey}
            />
            <button
              onClick={handleManualFetch}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
              disabled={loading || !fileCidInput.trim() || !publicKey}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-sm mr-2"></span> Processing...
                </span>
              ) : (
                "Decrypt File by CID"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Your Uploaded Files Section (Full Width) */}
      <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mt-8 mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Uploaded Files</h2>
        {loading && (
          <div className="text-center py-4">
            <span className="loading loading-spinner loading-md text-violet-600"></span>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading your files...</p>
          </div>
        )}
        {!loading && userFiles.length === 0 && publicKey && (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">No files uploaded yet. Go to the <Link href="/upload" className="text-violet-600 hover:underline">Upload page</Link> to get started!</p>
        )}
        {!loading && !publicKey && (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">Connect your wallet to see your uploaded files.</p>
        )}
        <div className="space-y-3">
          {userFiles.map((file) => (
            <div
              key={file.pubkey.toBase58()}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 mb-2 sm:mb-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                  CID: <span className="font-mono text-violet-600 dark:text-violet-400">{file.cid}</span>
                  <button
                    onClick={() => copyToClipboard(file.cid)}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition duration-200"
                    aria-label="Copy CID"
                  >
                    Copy
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Uploaded: {new Date(file.timestamp * 1000).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDecrypt(file)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="loading loading-spinner loading-xs mr-1"></span> Decrypting...
                  </span>
                ) : (
                  "Decrypt & Download"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="w-full max-w-4xl p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700 mt-6 mx-auto">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}