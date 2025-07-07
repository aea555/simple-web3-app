"use client";

import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  fetchFileMetadataByCID,
  shareFileWithUser,
  getRSAKeyByPubkey,
  deleteFileMetadata,
} from "@/lib/chain";
import { fetchAESKeyFromKeyCid } from "@/lib/ipfs";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import toast from "react-hot-toast";
import { UserFile } from "@/lib/types";
import { useW3 } from "@/providers/w3Context";
import { PublicKey } from "@solana/web3.js";
import Hero from "@/components/ui/Hero";
import WalletStatus from "@/components/ui/WalletStatus";
import DecryptByCID from "@/components/fetch/DecryptByCID";
import ListFiles from "@/components/fetch/ListFiles";
import GlobalErrorDisplay from "@/components/ui/globalErrorDisplay";
import GlobalModal from "@/components/ui/GlobalModal";
import fetchUseEffect from "@/features/fetch/fetchUseEffect";
import fileMemo from "@/features/fetch/fileMemo";
import { decryptAESKey } from "@/lib/cryptography";
import { promptAndLoadPrivateKey } from "@/lib/store";
import handleDecrypt from "@/features/fetch/handleDecrypt";
import usePageLoadMetrics from "@/hooks/usePageLoadMetrics";
import {
  DeletionMetrics,
  getUniquePerformanceMetrics,
  ManualFetchMetrics,
  ShareMetrics,
} from "@/lib/metrics";

export default function FetchPage() {
  usePageLoadMetrics();
  const wallet = useAnchorWallet();
  const [fileCidInput, setFileCidInput] = useState("");
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all"); // 'all', 'today', 'last7days', 'last30days'
  const [sortKey, setSortKey] = useState<string>("timestamp"); // 'timestamp', 'cid' (for name)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc"); // 'desc', 'asc'
  const [showModal, setShowModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [selectedCids, setSelectedCids] = useState<string[]>([]);
  const [selectedSingleCid, setSelectedSingleCid] = useState<string | null>(
    null
  );
  const { client } = useW3();
  const solana = useSolanaProgram(wallet);

  fetchUseEffect({
    wallet,
    solana,
    setUserFiles,
    setLoading,
    setError,
  });

  // Memoized and sorted files array based on filters and sort options
  const sortedAndFilteredFiles = fileMemo({
    userFiles,
    timeFilter,
    sortKey,
    sortOrder,
  });

  async function handleManualFetch() {
    performance.mark("manualFetch:fetchMetadata:start");
    if (!fileCidInput.trim()) {
      setError("Please enter a file CID.");
      toast.error("Please enter a file CID.");
      return;
    }
    if (!wallet || !wallet.publicKey) {
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
      performance.mark("manualFetch:fetchMetadata:end");
      performance.measure(
        ManualFetchMetrics.FetchFileMetadata,
        "manualFetch:fetchMetadata:start",
        "manualFetch:fetchMetadata:end"
      );
      toast.success("Metadata fetched. Proceeding to decrypt...", {
        id: "fetchMetadataToast",
      });
      await handleDecrypt({ metadata, wallet, solana, setLoading, setError });
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

      const unique = getUniquePerformanceMetrics();
      console.table(unique);
      setLoading(false);
    }
  }

  async function handleShare(file: UserFile) {
    setSelectedFile(file);
    setShowModal(true);
  }

  async function submitShare() {
    const toastId = toast.loading("Sharing file...");
    performance.mark("share:start");
    if (!solana || !wallet || !selectedFile || !recipientAddress) return;
    try {
      setShowModal(false);
      toast.loading("Fetching AES Key...", { id: toastId });
      const aesKey = await fetchAESKeyFromKeyCid(selectedFile.keyCid);
      toast.success("✅ AES Key fetched.", { id: toastId });
      const recipientPubkey = new PublicKey(recipientAddress);
      performance.mark("share:fetchRecipient:start");
      toast.loading("Getting RSA Key by Public Key", { id: toastId });
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
      toast.success("✅ RSA Key obtained.", { id: toastId });
      performance.mark("share:fetchRecipient:end");
      performance.measure(
        ShareMetrics.FetchRecipientRSA,
        "share:fetchRecipient:start",
        "share:fetchRecipient:end"
      );
      toast.loading("Loading up your private key...", { id: toastId });
      const { privateKey } = await promptAndLoadPrivateKey(
        wallet.publicKey.toBase58()
      );
      toast.success("✅ Private key loaded", { id: toastId });
      performance.mark("share:decryptAES:start");
      toast.loading("Decrypting AES Key...", { id: toastId });
      const decryptedAesKey = await decryptAESKey(aesKey, privateKey);
      const raw = await crypto.subtle.exportKey("raw", decryptedAesKey);
      performance.mark("share:decryptAES:end");
      performance.measure(
        ShareMetrics.DecryptAES,
        "share:decryptAES:start",
        "share:decryptAES:end"
      );
      toast.success("✅ AES Key decrypted.", { id: toastId });
      performance.mark("share:register:start");
      toast.loading("Sharing the file with the wallet address...", { id: toastId });
      await shareFileWithUser({
        program: solana.program,
        sharer: wallet,
        fileCid: selectedFile.cid,
        aesKeyRaw: raw,
        recipientPubkey: recipientAddress,
        recipientRsaPublicKeyPem: recipientRsaKey,
        extension: selectedFile.extension || "bin",
        client: client,
      });
      performance.mark("share:register:end");
      performance.measure(
        ShareMetrics.RegisterShare,
        "share:register:start",
        "share:register:end"
      );
      toast.success("✅ File shared successfully!", { id: toastId });
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
      setRecipientAddress("");
      setSelectedFile(null);
      performance.mark("share:end");
      performance.measure(ShareMetrics.Total, "share:start", "share:end");
      console.table(getUniquePerformanceMetrics());
    }
  }

  async function handleDelete(cid: string) {
    performance.mark("delete:single:start");
    if (!solana || !wallet) return;
    const confirmed = confirm(
      "Are you sure you want to delete this file? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setShowSingleDeleteModal(false);
      await deleteFileMetadata(solana.program, cid, wallet.publicKey);
      performance.mark("delete:single:end");
      performance.measure(
        DeletionMetrics.Single,
        "delete:single:start",
        "delete:single:end"
      );
      console.table(getUniquePerformanceMetrics());
      toast.success("File deleted successfully.");
      setUserFiles((prev) => prev.filter((f) => f.cid !== cid));
    } catch (err) {
      console.error(err);
      toast.error(`Failed to delete file. Error message: ${err}`);
    }
  }

  async function handleBulkDelete() {
    performance.mark("delete:bulk:start");
    if (!wallet || !solana) return;

    const confirmed = confirm(
      "Are you sure you want to delete the selected files? This action cannot be undone."
    );
    if (!confirmed) return;

    setShowBulkDeleteModal(false);
    toast.loading("Deleting files...", { id: "bulkDelete" });

    try {
      for (const cid of selectedCids) {
        try {
          await deleteFileMetadata(solana.program, cid, wallet.publicKey);
        } catch (e) {
          console.warn("Couldn't delete file:", cid);
        }
      }
      performance.mark("delete:bulk:end");
      performance.measure(
        DeletionMetrics.Bulk,
        "delete:bulk:start",
        "delete:bulk:end"
      );
      console.table(getUniquePerformanceMetrics());
      setUserFiles((prev) => prev.filter((f) => !selectedCids.includes(f.cid)));
      setSelectedCids([]);
      toast.success("Deleted selected files", { id: "bulkDelete" });
    } catch (err) {
      toast.error("Failed to delete files: " + (err as Error).message, {
        id: "bulkDelete",
      });
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
          <WalletStatus publicKey={wallet?.publicKey} />

          {/* Decrypt by CID Section */}
          <DecryptByCID
            fileCidInput={fileCidInput}
            setFileCidInput={setFileCidInput}
            loading={loading}
            publicKey={wallet?.publicKey}
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
        sortedAndFilteredFiles={sortedAndFilteredFiles}
        handleShare={handleShare}
        wallet={wallet}
        solana={solana}
        setError={setError}
        setLoading={setLoading}
        selectedCids={selectedCids}
        setSelectedSingleCid={setSelectedSingleCid}
        setSelectedCids={setSelectedCids}
        handleDelete={handleDelete}
        setShowModal={setShowBulkDeleteModal}
        setShowModal2={setShowSingleDeleteModal}
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

      {/* Bulk Delete Modal */}
      <GlobalModal
        showModal={showBulkDeleteModal}
        setShowModal={setShowBulkDeleteModal}
        title="Confirm Deletion"
        inputPlaceholder="This action cannot be undone."
        setInputValString={() => {}}
        submitFunc={handleBulkDelete}
        submitButtonText="Delete"
        inputDisabled={true}
      />

      {/* Bulk Delete Modal */}
      <GlobalModal
        showModal={showSingleDeleteModal}
        setShowModal={setShowSingleDeleteModal}
        title="Confirm Deletion"
        inputPlaceholder="This action cannot be undone."
        setInputValString={() => {}}
        submitFunc={async () => {
          if (selectedSingleCid) await handleDelete(selectedSingleCid);
        }}
        submitButtonText="Delete"
        inputDisabled={true}
      />
    </div>
  );
}
