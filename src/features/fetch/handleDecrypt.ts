import { ellipsify } from "@/components/ui/ui-layout";
import { fetchAndDecryptFile } from "@/lib/ipfs";
import { SolanaProgramContext, UserFile } from "@/lib/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { getUniquePerformanceMetrics } from "@/lib/metrics";
import { DownloadMetrics } from "@/lib/metrics";

type handleDecryptProps = {
  metadata: UserFile;
  wallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
};

export default async function handleDecrypt({
  metadata,
  wallet,
  solana,
  setLoading,
  setError,
}: handleDecryptProps) {
  if (!wallet || !wallet.publicKey || !solana) {
    setError("Please connect your wallet first.");
    toast.error("Please connect your wallet to decrypt files.");
    return;
  }

  console.log("METADATA AT HANDLE DECRYPT:", metadata);

  setLoading(true);
  setError(null);
  toast.loading("🔓 Decrypting file...", { id: "decryptToast" });

  performance.mark("download:start");

  try {
    performance.mark("download:ipfs:start");

    const blob = await fetchAndDecryptFile(metadata, wallet.publicKey.toBase58());

    performance.mark("download:ipfs:end");
    performance.measure(
      DownloadMetrics.FetchFromIPFS,
      "download:ipfs:start",
      "download:ipfs:end"
    );

    const filename = `decrypted-${ellipsify(metadata.cid, 8)}.${metadata.extension || "bin"}`;
    saveAs(blob, filename);

    toast.success("✅ File decrypted and downloaded!", {
      id: "decryptToast",
    });
  } catch (err: any) {
    console.error("Decryption failed:", err);
    setError("❌ Failed to decrypt file: " + (err.message || "Unknown error"));
    toast.error("❌ Decryption failed: " + (err.message || "Unknown error"), {
      id: "decryptToast",
    });
  } finally {
    performance.mark("download:end");
    performance.measure(DownloadMetrics.Total, "download:start", "download:end");

    console.log("📊 Decryption performance metrics:");
    console.table(getUniquePerformanceMetrics());

    setLoading(false);
  }
}
