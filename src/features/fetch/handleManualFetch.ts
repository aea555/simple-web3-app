import { fetchFileMetadataByCID } from "@/lib/chain";
import { SolanaProgramContext } from "@/lib/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import handleDecrypt from "./handleDecrypt";
import toast from "react-hot-toast";
import { getUniquePerformanceMetrics } from "@/lib/metrics";
import { ManualFetchMetrics } from "@/lib/metrics";

type handleManualFetchProps = {
  fileCidInput: string;
  setError: (value: SetStateAction<string | null>) => void;
  anchorWallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setLoading: (value: SetStateAction<boolean>) => void;
  setFileCidInput: (value: SetStateAction<string>) => void;
};

export default async function handleManualFetch({
  fileCidInput,
  setError,
  anchorWallet,
  solana,
  setLoading,
  setFileCidInput,
}: handleManualFetchProps) {
  if (!fileCidInput.trim()) {
    setError("Please enter a file CID.");
    toast.error("Please enter a file CID.");
    return;
  }
  if (!anchorWallet || !anchorWallet.publicKey) {
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
  toast.loading("📥 Fetching metadata...", { id: "fetchMetadataToast" });

  performance.mark("manualFetch:start");

  try {
    performance.mark("manualFetch:metadata:start");
    const metadata = await fetchFileMetadataByCID(
      solana.program,
      solana.programId,
      fileCidInput.trim()
    );
    performance.mark("manualFetch:metadata:end");
    performance.measure(
      ManualFetchMetrics.FetchFileMetadata,
      "manualFetch:metadata:start",
      "manualFetch:metadata:end"
    );

    toast.success("Metadata fetched. Proceeding to decrypt...", {
      id: "fetchMetadataToast",
    });

    performance.mark("manualFetch:decrypt:start");
    await handleDecrypt({
      metadata,
      wallet: anchorWallet,
      solana,
      setLoading,
      setError,
    });
    performance.mark("manualFetch:decrypt:end");
    performance.measure(
      ManualFetchMetrics.DecryptFile,
      "manualFetch:decrypt:start",
      "manualFetch:decrypt:end"
    );

    setFileCidInput("");
  } catch (err: any) {
    console.error("Manual fetch failed:", err);
    setError(
      "❌ Failed to fetch file by CID: " + (err.message || "Unknown error")
    );
    toast.error(
      "❌ Failed to fetch file: " + (err.message || "Unknown error"),
      { id: "fetchMetadataToast" }
    );
  } finally {
    performance.mark("manualFetch:end");
    performance.measure(
      ManualFetchMetrics.Total,
      "manualFetch:start",
      "manualFetch:end"
    );

    console.log("📊 Manual Fetch performance metrics:");
    const metrics = getUniquePerformanceMetrics();
    console.table(metrics);

    setLoading(false);
  }
}
