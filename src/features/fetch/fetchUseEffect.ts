import { useEffect } from "react";
import { fetchUserFiles } from "@/lib/chain";
import { SolanaProgramContext, UserFile } from "@/lib/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
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
    if (!wallet?.publicKey || !solana) return;

    const loadUserFiles = async () => {
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

  // Secondary effect to show toast after 10 seconds if not initialized
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!wallet?.publicKey || !solana) {
        toast.error("Wallet not connected or Solana program unavailable");
      }
    }, 10000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [wallet?.publicKey?.toBase58(), solana]);
}
