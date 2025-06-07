"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  fetchFileMetadataByCID,
  shareFileWithUser,
  getRSAKeyByPubkey,
} from "@/utils/chain";
import { fetchAESKeyFromKeyCid, fetchAndDecryptFile } from "@/utils/ipfs";
import { saveAs } from "file-saver";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { ellipsify } from "@/components/ui/ui-layout";
import toast from "react-hot-toast";
import { UserFile } from "@/utils/types";
import { useW3 } from "@/context/w3Context";
import { PublicKey } from "@solana/web3.js";
import Hero from "@/components/ui/Hero";
import WalletStatus from "@/components/account/WalletStatus";
import DecryptByCID from "@/components/fetch/DecryptByCID";
import ListFiles from "@/components/fetch/ListFiles";
import GlobalErrorDisplay from "@/components/error/globalErrorDisplay";
import GlobalModal from "@/components/ui/GlobalModal";
import fetchUseEffect from "@/utils/ui-utils/fetch/fetchUseEffect";
import fileMemo from "@/utils/ui-utils/fetch/fileMemo";
import { decryptAESKey } from "@/utils/cryptography";
import { promptAndLoadPrivateKey } from "@/utils/store";

export default function FetchPage() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [fileCidInput, setFileCidInput] = useState("");
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all"); // 'all', 'today', 'last7days', 'last30days'
  const [sortKey, setSortKey] = useState<string>("timestamp"); // 'timestamp', 'cid' (for name)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // 'desc', 'asc'
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const { client } = useW3();
  const solana = useSolanaProgram(anchorWallet);

  fetchUseEffect({
    publicKey,
    anchorWallet,
    solana,
    setUserFiles,
    setLoading,
    setError,
    toast,
  });

  // Memoized and sorted files array based on filters and sort options
  const sortedAndFilteredFiles = fileMemo({
    userFiles,
    timeFilter,
    sortKey,
    sortOrder,
  });

  async function handleDecrypt(metadata: any) {
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
      setError(
        "❌ Failed to decrypt file: " + (err.message || "Unknown error")
      );
      toast.error("❌ Decryption failed: " + (err.message || "Unknown error"), {
        id: "decryptToast",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualFetch() {
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
      await handleDecrypt(metadata);
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

  async function handleShare(file: UserFile) {
    setSelectedFile(file);
    setShowModal(true);
  }

  async function submitShare() {
    if (!solana || !anchorWallet || !selectedFile || !recipientAddress) return;
    try {
      const aesKey = await fetchAESKeyFromKeyCid(selectedFile.keyCid);
      const recipientPubkey = new PublicKey(recipientAddress);
      const recipientRsaKey = await getRSAKeyByPubkey(
        solana.program,
        recipientPubkey
      );
      if (!recipientPubkey) {
        throw new Error("Invalid recipient public key.");
      }
      if (!recipientRsaKey) {
        throw new Error("Recipient does not have an RSA key registered.");
      }
      const { privateKey } = await promptAndLoadPrivateKey(); 
      const decryptedAesKey = await decryptAESKey(aesKey, privateKey);
      const raw = await crypto.subtle.exportKey("raw", decryptedAesKey);
      await shareFileWithUser({
        program: solana.program,
        sharer: anchorWallet,
        fileCid: selectedFile.cid,
        aesKeyRaw: raw,
        recipientPubkey: recipientAddress,
        recipientRsaPublicKeyPem: recipientRsaKey,
        client: client,
      });
      toast.success("File shared successfully!");
    } catch (err) {
      console.error("Sharing failed:", err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown error";

      toast.error("Sharing failed: " + errorMessage);
    } finally {
      setShowModal(false);
      setRecipientAddress("");
      setSelectedFile(null);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      {/* Top Section: Left and Right Columns for AppHero and Decrypt by CID */}
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        {/* Left Column: Title */}
        <Hero
          title="Access Your Encrypted Files"
          subtitle="Retrieve and decrypt your private data stored on IPFS."
        />

        {/* Main Content for Decrypt by CID */}
        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          {/* Wallet Connection Status */}
          <WalletStatus publicKey={publicKey} />

          {/* Decrypt by CID Section */}
          <DecryptByCID
            fileCidInput={fileCidInput}
            setFileCidInput={setFileCidInput}
            loading={loading}
            publicKey={publicKey}
            handleManualFetch={handleManualFetch}
          />
        </div>
      </div>

      {/* Uploaded Files Section*/}
      <ListFiles
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        loading={loading}
        userFiles={userFiles}
        publicKey={publicKey}
        sortedAndFilteredFiles={sortedAndFilteredFiles}
        handleShare={handleShare}
        toast={toast}
        anchorWallet={anchorWallet}
        solana={solana}
        setError={setError}
        setLoading={setLoading}
      />

      {/* Global Error Display */}
      <GlobalErrorDisplay error={error} />

      {/* Share File Modal */}
      <GlobalModal
        showModal={showModal}
        setShowModal={setShowModal}
        title="Share File"
        inputValueString={recipientAddress}
        inputPlaceholder="Recipient wallet address"
        setInputValString={setRecipientAddress}
        submitFunc={submitShare}
        submitButtonText="Share File"
      />
    </div>
  );
}
function importRsaPrivateKey(myRsaPrivateKeyPem: any) {
  throw new Error("Function not implemented.");
}

