import { ellipsify } from "@/components/ui/ui-layout";
import { fetchRSAKey, generateAESKey } from "@/lib/cryptography";
import { uploadEncryptedAESKey, uploadFile } from "@/lib/ipfs";
import { storeFileMetadata } from "@/lib/chain";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import { CID, Version } from "multiformats";
import { SolanaProgramContext } from "@/lib/types";
import { Client } from "@web3-storage/w3up-client";
import toast from "react-hot-toast";
import { getUniquePerformanceMetrics, UploadMetrics } from "@/lib/metrics";

type handleUploadProps = {
  anchorWallet: AnchorWallet | undefined;
  setError: (value: SetStateAction<string | null>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  solana: SolanaProgramContext | undefined;
  file: File | null;
  setCid: (
    value: SetStateAction<CID<unknown, number, number, Version> | null>
  ) => void;
  client: Client;
};

export default async function handleUpload({
  anchorWallet,
  setError,
  setLoading,
  solana,
  file,
  setCid,
  client,
}: handleUploadProps) {
  if (!file) {
    setError("Please select a file to upload.");
    toast.error("Please select a file to upload.");
    return;
  }
  if (!anchorWallet || !anchorWallet.publicKey) {
    setError("Please connect your wallet first.");
    toast.error("Please connect your wallet to upload files.");
    return;
  }

  performance.mark("upload:start");

  setLoading(true);
  setError(null);
  setCid(null);
  toast.loading("📤 Starting file upload...", { id: "uploadToast" });

  if (!solana) {
    setError("Solana program failed to initialize!");
    toast.error("Solana program not initialized.");
    setLoading(false);
    return;
  }

  const { program, programId } = solana;

  try {
    // 1. Fetch RSA Public Key
    toast.loading("Fetching RSA key from blockchain...", { id: "uploadToast" });
    performance.mark("upload:fetchRSA:start");

    const rsaKey = await fetchRSAKey(anchorWallet.publicKey, programId, program);
    if (!rsaKey) {
      setError("RSA key not found. Please register your RSA key first.");
      toast.error("RSA key not found. Please register your RSA key first.", {
        id: "uploadToast",
      });
      setLoading(false);
      return;
    }

    performance.mark("upload:fetchRSA:end");
    performance.measure(
      UploadMetrics.FetchRSAKey,
      "upload:fetchRSA:start",
      "upload:fetchRSA:end"
    );
    toast.success("RSA key fetched.", { id: "uploadToast" });

    // 2. Generate AES Key & Upload File
    toast.loading("Encrypting file and uploading to IPFS...", { id: "uploadToast" });
    performance.mark("upload:file:start");

    const aesKey = await generateAESKey();
    const { cid: fileCid, encryptedKey: rawAESKey } = await uploadFile(
      file,
      aesKey,
      client
    );
    setCid(CID.parse(fileCid.toString()));

    performance.mark("upload:file:end");
    performance.measure(
      UploadMetrics.EncryptAndUploadFile,
      "upload:file:start",
      "upload:file:end"
    );
    toast.success("File encrypted and uploaded to IPFS!", {
      id: "uploadToast",
    });

    // 3. Upload AES Key Encrypted with RSA
    toast.loading("Encrypting AES key and uploading to IPFS...", { id: "uploadToast" });
    performance.mark("upload:aesKey:start");

    const keyCid = await uploadEncryptedAESKey(rsaKey.raw, rawAESKey, client);

    performance.mark("upload:aesKey:end");
    performance.measure(
      UploadMetrics.EncryptAndUploadAESKey,
      "upload:aesKey:start",
      "upload:aesKey:end"
    );
    toast.success(`Encrypted AES key uploaded. Key CID: ${ellipsify(keyCid)}`, {
      id: "uploadToast",
    });

    // 4. Store Metadata On-Chain
    toast.loading("Storing file metadata on-chain...", { id: "uploadToast" });
    performance.mark("upload:storeMetadata:start");

    const extension = file.name.split('.').pop() || "bin"; // Default to "bin" if no extension

    await storeFileMetadata(
      program,
      fileCid.toString(),
      keyCid,
      anchorWallet.publicKey,
      programId,
      extension
    );

    performance.mark("upload:storeMetadata:end");
    performance.measure(
      UploadMetrics.StoreMetadata,
      "upload:storeMetadata:start",
      "upload:storeMetadata:end"
    );

    toast.success("✅ Upload complete! Metadata stored on-chain.", {
      id: "uploadToast",
    });
  } catch (err: any) {
    console.error("Upload failed:", err);
    setError("❌ Upload failed: " + (err.message || err.toString()));
    toast.error("❌ Upload failed: " + (err.message || err.toString()), {
      id: "uploadToast",
    });
  } finally {
    performance.mark("upload:end");
    performance.measure(UploadMetrics.Total, "upload:start", "upload:end");
    console.log("📊 Upload performance metrics:");
    console.table(getUniquePerformanceMetrics());
    setLoading(false);
  }
}
