import { fetchUserFiles } from "@/lib/chain";
import { SolanaProgramContext, UserFile } from "@/lib/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction, useEffect } from "react";
import toast from "react-hot-toast";

type fetchUseEffectProps = {
  wallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setUserFiles: (value: SetStateAction<UserFile[]>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  setError: (value: SetStateAction<string | null>) => void;
};

export default function fetchUseEffect({
  wallet,
  solana,
  setUserFiles,
  setLoading,
  setError,
}: fetchUseEffectProps) {
  useEffect(() => {
    const loadUserFiles = async () => {
      if (!wallet?.publicKey || !solana) {
        setUserFiles([]);
        toast.error("Wallet not connected or Solana program unavailable");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const files = await fetchUserFiles(solana.program, wallet.publicKey);
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
  }, [wallet?.publicKey?.toBase58(), solana]);
}

