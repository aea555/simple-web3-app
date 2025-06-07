import { fetchUserFiles } from "@/utils/chain";
import { SolanaProgramContext, UserFile } from "@/utils/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { SetStateAction, useEffect } from "react";

type fetchUseEffectProps = {
  publicKey: PublicKey | null;
  anchorWallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setUserFiles: (value: SetStateAction<UserFile[]>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
  toast: any;
};

export default function fetchUseEffect({
  publicKey,
  anchorWallet,
  solana,
  setUserFiles,
  setLoading,
  setError,
  toast,
}: fetchUseEffectProps) {
  useEffect(() => {
    const loadUserFiles = async () => {
      if (!publicKey || !anchorWallet || !solana) {
        setUserFiles([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Fetch files, initial sort is by timestamp (newest first)
        const files = await fetchUserFiles(solana.program, publicKey);
        setUserFiles(files);
      } catch (err) {
        console.error("Failed to fetch user files:", err);
        setError("Failed to load your files. Please try again.");
        toast.error("Failed to load your files.");
      } finally {
        setLoading(false);
      }
    };

    loadUserFiles();
  }, [publicKey, anchorWallet, solana]);
}
