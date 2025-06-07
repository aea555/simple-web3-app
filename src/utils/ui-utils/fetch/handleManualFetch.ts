import { fetchFileMetadataByCID } from "@/utils/chain";
import { SolanaProgramContext } from "@/utils/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { SetStateAction } from "react";
import handleDecrypt from "./handleDecrypt";

type handleManualFetchProps = {
  fileCidInput: string;
  setError: (value: SetStateAction<string | null>) => void;
  toast: any;
  publicKey: PublicKey | null;
  anchorWallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setLoading: (value: SetStateAction<boolean>) => void;
  setFileCidInput: (value: SetStateAction<string>) => void;
};

export default async function handleManualFetch({fileCidInput, setError, toast, publicKey, anchorWallet, solana, setLoading, setFileCidInput}: handleManualFetchProps) {
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
  toast.loading("📥 Fetching metadata...", { id: "fetchMetadataToast" });

  try {
    const metadata = await fetchFileMetadataByCID(
      solana.program,
      solana.programId,
      fileCidInput.trim()
    );
    toast.success("Metadata fetched. Proceeding to decrypt...", {
      id: "fetchMetadataToast",
    });
    await handleDecrypt({metadata, publicKey, anchorWallet, solana, setLoading, setError, toast});
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
    setLoading(false);
  }
}