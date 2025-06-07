"use client";

import { useState } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";

import { CID } from "multiformats/cid";
import {
  hasEncryptedPrivateKey,
} from "@/utils/store";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import toast from "react-hot-toast"; // Import toast for notifications
import { useW3 } from "@/context/w3Context";
import GlobalErrorDisplay from "@/components/error/globalErrorDisplay";
import FileUpload from "@/components/upload/FileUpload";
import RsaKeyManagement from "@/components/keymanagement/RsaKeyManagement";
import WalletStatus from "@/components/account/WalletStatus";
import Hero from "@/components/ui/Hero";
import handleRegisterRsaKey from "@/utils/ui-utils/upload/handleRegisterRsaKey";
import handleUpload from "@/utils/ui-utils/upload/handleUpload";
import handlePrivateKeyDownload from "@/utils/ui-utils/upload/handlePrivateKeyDownload";
import handleImportWrapper from "@/utils/ui-utils/common/handleImportWrapper";
import uploadUseEffect from "@/utils/ui-utils/upload/uploadUseEffect";

export default function UploadPage() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<CID | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Unified loading state
  const [error, setError] = useState<string | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState<boolean>(false);
  const solana = useSolanaProgram(anchorWallet);
  const { client } = useW3();

  uploadUseEffect({ hasEncryptedPrivateKey, setHasPrivateKey });

  return (
    // Main container with full width, centered content, and responsive padding
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      {/* Top Section: Left and Right Columns for AppHero and Main Content */}
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        <Hero
          title="Upload Encrypted Files"
          subtitle="Encrypt and store your files securely on IPFS, with metadata on Solana."
        />

        {/* Right Column: Main Content (Wallet Status, RSA Key Management, File Upload) */}
        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          <WalletStatus publicKey={publicKey} />

          <RsaKeyManagement
            loading={loading}
            publicKey={publicKey}
            hasPrivateKey={hasPrivateKey}
            handleImportWrapper={(e) =>
              handleImportWrapper({
                e,
                setLoading,
                setError,
                setHasPrivateKey,
                toast,
              })
            }
            handlePrivateKeyDownload={() =>
              handlePrivateKeyDownload({ setLoading, setError, toast })
            }
            handleRegisterRsaKey={() =>
              handleRegisterRsaKey({
                publicKey,
                anchorWallet,
                setError,
                setLoading,
                toast,
                solana,
                setHasPrivateKey,
              })
            }
          />

          <FileUpload
            setFile={setFile}
            handleUpload={() =>
              handleUpload({
                publicKey,
                anchorWallet,
                setError,
                setLoading,
                toast,
                solana,
                file,
                setCid,
                client,
              })
            }
            file={file}
            loading={loading}
            publicKey={publicKey}
            hasPrivateKey={hasPrivateKey}
            cid={cid}
          />

          <GlobalErrorDisplay error={error} />
        </div>
      </div>
    </div>
  );
}
