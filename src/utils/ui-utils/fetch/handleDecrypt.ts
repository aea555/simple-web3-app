import { ellipsify } from "@/components/ui/ui-layout";
import { fetchAndDecryptFile } from "@/utils/ipfs";
import { SolanaProgramContext, UserFile } from "@/utils/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { SetStateAction } from "react";
import { saveAs } from "file-saver";

type handleDecryptProps = {
  metadata: any;
  publicKey: PublicKey | null;
  anchorWallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
  toast: any;
};

export default async function handleDecrypt({
  metadata,
  publicKey,
  anchorWallet,
  solana,
  setLoading,
  setError,
  toast,
}: handleDecryptProps) {
  if (!publicKey || !anchorWallet || !solana) {
    setError("Please connect your wallet first.");
    toast.error("Please connect your wallet to decrypt files.");
    return;
  }

  setLoading(true);
  setError(null);
  toast.loading("🔓 Decrypting file...", { id: "decryptToast" });

  try {
    const blob = await fetchAndDecryptFile(metadata);
    const filename = `decrypted-${ellipsify(metadata.cid, 8)}.bin`;
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
    setLoading(false);
  }
}
