import { ellipsify } from "@/components/ui/ui-layout";
import { fetchAndDecryptFile } from "@/lib/ipfs";
import { SolanaProgramContext } from "@/lib/types"
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

type handleDecryptProps = {
  metadata: any;
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

  setLoading(true);
  setError(null);
  toast.loading("🔓 Decrypting file...", { id: "decryptToast" });

  try {
    const blob = await fetchAndDecryptFile(metadata, wallet.publicKey.toBase58());
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
