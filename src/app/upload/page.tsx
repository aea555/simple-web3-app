"use client";

import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { CID } from "multiformats/cid";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { useW3 } from "@/providers/w3Context";
import GlobalErrorDisplay from "@/components/ui/globalErrorDisplay";
import FileUpload from "@/components/upload/FileUpload";
import RsaKeyManagement from "@/components/keymanagement/RsaKeyManagement";
import WalletStatus from "@/components/ui/WalletStatus";
import Hero from "@/components/ui/Hero";
import handleRegisterRsaKey from "@/features/upload/handleRegisterRsaKey";
import handleUpload from "@/features/upload/handleUpload";
import handlePrivateKeyDownload from "@/features/upload/handlePrivateKeyDownload";
import handleImportWrapper from "@/features/common/handleImportWrapper";
import { hasEncryptedPrivateKey } from "@/lib/store";
import usePageLoadMetrics from "@/hooks/usePageLoadMetrics";

export default function UploadPage() {
  usePageLoadMetrics();
  const wallet = useAnchorWallet();
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<CID | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Unified loading state
  const [error, setError] = useState<string | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState<boolean>(false);
  const solana = useSolanaProgram(wallet);
  const { client } = useW3();

  useEffect(() => {
    if (!wallet?.publicKey) return;
  
    hasEncryptedPrivateKey(wallet.publicKey.toBase58()).then(setHasPrivateKey);
  }, [wallet?.publicKey?.toBase58()]);

  return (
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      {/* Top Section: Left and Right Columns for AppHero and Main Content */}
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        <Hero
          title="Upload Encrypted Files"
          subtitle="Encrypt and store your files securely on IPFS, with metadata on Solana."
        />

        {/* Right Column: Main Content (Wallet Status, RSA Key Management, File Upload) */}
        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          <WalletStatus publicKey={wallet?.publicKey} />

          <RsaKeyManagement
            loading={loading}
            publicKey={wallet?.publicKey}
            hasPrivateKey={hasPrivateKey}
            handleImportWrapper={(e) =>
              handleImportWrapper({
                e,
                setLoading,
                setError,
                setHasPrivateKey,
                walletAddress: wallet?.publicKey.toBase58(),
              })
            }
            handlePrivateKeyDownload={() =>
              handlePrivateKeyDownload({ setLoading, setError, walletAddress: wallet?.publicKey.toBase58(),})
            }
            handleRegisterRsaKey={() =>
              handleRegisterRsaKey({
                wallet,
                setError,
                setLoading,
                solana,
                setHasPrivateKey,
              })
            }
          />

          <FileUpload
            setFile={setFile}
            handleUpload={() =>
              handleUpload({
                anchorWallet: wallet,
                setError,
                setLoading,
                solana,
                file,
                setCid,
                client,
              })
            }
            file={file}
            loading={loading}
            hasPrivateKey={hasPrivateKey}
            cid={cid}
            publicKey={wallet?.publicKey}
          />

          <GlobalErrorDisplay error={error} />
        </div>
      </div>
    </div>
  );
}
