"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AnchorWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { listSharedFiles } from "@/lib/chain";
import { fetchAndDecryptSharedFile } from "@/lib/ipfs";
import { promptAndLoadPrivateKey } from "@/lib/store";
import { AppHero, ellipsify } from "@/components/ui/ui-layout";
import usePageLoadMetrics from "@/hooks/usePageLoadMetrics";
import { getUniquePerformanceMetrics, SharedPageMetrics } from "@/lib/metrics";
import saveAs from "file-saver";

export default function SharedFilesPage() {
  usePageLoadMetrics();
  const wallet = useAnchorWallet();
  const { program } = useSolanaProgram(wallet) ?? {};
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!program || !wallet?.publicKey) return;

    (async () => {
      performance.mark("shared:list:start");
      try {
        setLoading(true);
        const files = await listSharedFiles(program, wallet.publicKey);
        setSharedFiles(files);
      } catch (err) {
        console.error("Error listing shared files:", err);
        toast.error("Failed to fetch shared files");
      } finally {
        setLoading(false);
        performance.mark("shared:list:end");
        performance.measure(
          SharedPageMetrics.ListSharedFiles,
          "shared:list:start",
          "shared:list:end"
        );
        console.log("📊 Performance for shared file fetch:");
        console.table(getUniquePerformanceMetrics());
      }
    })();
  }, [program, wallet]);

  async function handleDecrypt(file: any, wallet: AnchorWallet | undefined) {
    const toastId = toast.loading("Decrypting file...");
    if (!wallet) {
      toast.error("Wallet not connected");
      return;
    }

    performance.mark("shared:decrypt:start");

    try {
      const { privateKey } = await promptAndLoadPrivateKey(
        wallet.publicKey.toBase58()
      );

      toast.success("Private key loaded up", { id: toastId });

      toast.loading("🔓 Fetching and decrypting the shared file...", { id: toastId });

      const blob = await fetchAndDecryptSharedFile({
        cid: file.cid,
        sharedKeyCid: file.sharedKeyCid,
        privateKey,
      });

      toast.success("✅ Shared file fetched and decrypted", { id: toastId });

      const filename = `decrypted-${ellipsify(file.cid, 8)}.${
        file.extension || "bin"
      }`;
      saveAs(blob, filename);

      toast.success("✅ File decrypted & downloaded", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(
        "❌ Failed to decrypt file: " + (err.message || err.toString()),
        {
          id: toastId,
        }
      );
    } finally {
      performance.mark("shared:decrypt:end");
      performance.measure(
        SharedPageMetrics.DecryptSharedFile,
        "shared:decrypt:start",
        "shared:decrypt:end"
      );
      console.log("📊 Performance for shared file decryption:");
      console.table(getUniquePerformanceMetrics());
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
            <div className="text-center text-gray-600 dark:text-gray-300">
              Loading shared files...
            </div>
          ) : sharedFiles.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              No files have been shared with you yet.
            </div>
          ) : (
            <ul className="space-y-4">
              {sharedFiles.map((file, idx) => (
                <li
                  key={idx}
                  className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg shadow-sm"
                >
                  <div className="font-mono break-all text-sm mb-2">
                    <strong>CID:</strong> {file.cid}
                  </div>
                  <button
                    onClick={() => {handleDecrypt(file, wallet); console.log("Shared file metadata:", file)}}
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
