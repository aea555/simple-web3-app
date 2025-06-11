"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AnchorWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { listSharedFiles } from "@/lib/chain";
import { fetchAndDecryptSharedFile } from "@/lib/ipfs";
import { promptAndLoadPrivateKey } from "@/lib/store";
import { AppHero } from "@/components/ui/ui-layout";

export default function SharedFilesPage() {
  const wallet = useAnchorWallet();
  const { program } = useSolanaProgram(wallet) ?? {};
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!program || !wallet?.publicKey) return;

    (async () => {
      try {
        setLoading(true);
        const files = await listSharedFiles(program, wallet.publicKey);
        setSharedFiles(files);
      } catch (err) {
        console.error("Error listing shared files:", err);
        toast.error("Failed to fetch shared files");
      } finally {
        setLoading(false);
      }
    })();
  }, [program, wallet]);

  async function handleDecrypt(file: any, wallet: AnchorWallet | undefined) {
    const toastId = toast.loading("Decrypting file...");
    if (!wallet) {
      toast.error("Wallet not connected");
      return;
    }
    
    try {
      const { privateKey } = await promptAndLoadPrivateKey(wallet.publicKey.toBase58());
      const blob = await fetchAndDecryptSharedFile({
        cid: file.cid,
        sharedKeyCid: file.sharedKeyCid,
        privateKey,
      });
  
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shared-${file.cid}`;
      link.click();
  
      toast.success("✅ File decrypted & downloaded", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Failed to decrypt file: " + (err.message || err.toString()), {
        id: toastId,
      });
    }
  }  
  
  return (
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        <div className="lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-8 mb-8 lg:mb-0">
          <AppHero
            title="Shared With You"
            subtitle="Files securely shared with your account. Decrypt and download them here."
            className="mb-0"
          />
        </div>

        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0">
          {loading ? (
            <div className="text-center text-gray-600 dark:text-gray-300">Loading shared files...</div>
          ) : sharedFiles.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">No files have been shared with you yet.</div>
          ) : (
            <ul className="space-y-4">
              {sharedFiles.map((file, idx) => (
                <li key={idx} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm">
                  <div className="font-mono break-all text-sm mb-2">
                    <strong>CID:</strong> {file.cid}
                  </div>
                  <button
                    onClick={() => handleDecrypt(file, wallet)}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-md transition"
                  >
                    🔓 Decrypt & Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}