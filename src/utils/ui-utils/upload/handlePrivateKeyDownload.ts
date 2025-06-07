import { SetStateAction } from "react";
import { downloadEncryptedPrivateKeyPem, promptAndLoadPrivateKey } from "../../store";

type handlePrivateKeyDownloadProps = {
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
  toast: any;
};

export default async function handlePrivateKeyDownload({setLoading, setError, toast}: handlePrivateKeyDownloadProps) {
  setLoading(true);
  setError(null);
  toast.loading("Preparing private key for download...", {
    id: "downloadKeyToast",
  });
  try {
    const { privateKey, password } = await promptAndLoadPrivateKey();
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