import { SetStateAction } from "react";
import { downloadEncryptedPrivateKeyPem, promptAndLoadPrivateKey } from "@/lib/store"
import toast from "react-hot-toast";

type handlePrivateKeyDownloadProps = {
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
  walletAddress: string | undefined;
};

export default async function handlePrivateKeyDownload({setLoading, setError, walletAddress}: handlePrivateKeyDownloadProps) {
  if (!walletAddress) {
    toast.error("Wallet not connected");
    return;
  }
  setLoading(true);
  setError(null);
  toast.loading("Preparing private key for download...", {
    id: "downloadKeyToast",
  });
  try {
    const { privateKey, password } = await promptAndLoadPrivateKey(walletAddress);
    if (!privateKey)
      throw new Error("Private key not found or wrong password.");

    await downloadEncryptedPrivateKeyPem(privateKey, password);
    toast.success("✅ Encrypted PEM file downloaded.", {
      id: "downloadKeyToast",
    });
  } catch (err: any) {
    console.error(err);
    setError(
      "❌ Private key download failed: No private key found in this browser or password was incorrect."
    );
    toast.error("❌ Private key download failed.", {
      id: "downloadKeyToast",
    });
  } finally {
    setLoading(false);
  }
}