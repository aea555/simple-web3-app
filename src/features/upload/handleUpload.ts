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
    // 1. Fetch RSA Public Key from Chain
    toast.loading("Fetching RSA key from blockchain...", {
      id: "uploadToast",
    });
    const rsaKey = await fetchRSAKey(anchorWallet.publicKey, programId, program);
    if (!rsaKey) {
      setError("RSA key not found. Please register your RSA key first.");
      toast.error("RSA key not found. Please register your RSA key first.", {
        id: "uploadToast",
      });
      setLoading(false);
      return;
    }
    toast.success("RSA key fetched.", { id: "uploadToast" });

    // 2. Generate AES Key & Encrypt File
    toast.loading("Encrypting file and uploading to IPFS...", {
      id: "uploadToast",
    });
    const aesKey = await generateAESKey();
    const { cid: fileCid, encryptedKey: rawAESKey } = await uploadFile(
      file,
      aesKey,
      client
    );
    setCid(CID.parse(fileCid.toString()));
    toast.success("File encrypted and uploaded to IPFS!", {
      id: "uploadToast",
    });

    // 3. Encrypt AES Key with RSA and Upload to IPFS
    toast.loading("Encrypting AES key and uploading to IPFS...", {
      id: "uploadToast",
    });
    const keyCid = await uploadEncryptedAESKey(rsaKey.raw, rawAESKey, client);
    toast.success(`Encrypted AES key uploaded. Key CID: ${ellipsify(keyCid)}`, {
      id: "uploadToast",
    });

    // 4. Store File Metadata On-Chain
    toast.loading("Storing file metadata on-chain...", { id: "uploadToast" });
    await storeFileMetadata(
      program,
      fileCid.toString(),
      keyCid,
      anchorWallet.publicKey,
      programId
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
    setLoading(false);
  }
}
