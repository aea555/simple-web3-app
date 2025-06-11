import { handlePrivateKeyImport } from "@/lib/helpers";
import { Dispatch, SetStateAction } from "react";
import toast from "react-hot-toast";

type handleImportWrapperProps = {
  e: React.ChangeEvent<HTMLInputElement>;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
  setHasPrivateKey: Dispatch<SetStateAction<boolean>>;
  walletAddress: string | undefined;
};

export default async function ({e, setLoading, setError, setHasPrivateKey, walletAddress}: handleImportWrapperProps) {
  if (!walletAddress) {
    toast.error("Wallet not connected");
    return;
  }
  setLoading(true);
  setError(null);
  toast.loading("Importing RSA private key...", { id: "importKeyToast" });
  try {
    await handlePrivateKeyImport(
      e,
      setHasPrivateKey,
      (msg) => toast.success(msg, { id: "importKeyToast" }),
      (msg) => toast.error(msg, { id: "importKeyToast" }),
      walletAddress
    );
  } catch (err: any) {
    console.error(err);
    setError(
      "❌ Private key import failed: " + (err.message || err.toString())
    );
    toast.error(
      "❌ Private key import failed: " + (err.message || err.toString()),
      { id: "importKeyToast" }
    );
  } finally {
    setLoading(false);
  }
}
