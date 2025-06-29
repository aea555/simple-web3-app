import { useEffect } from "react";
import { fetchUserFiles } from "@/lib/chain";
import { SolanaProgramContext, UserFile } from "@/lib/types";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import toast from "react-hot-toast";
import { getUniquePerformanceMetrics } from "@/lib/metrics";
import { MetadataMetrics } from "@/lib/metrics";

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

      performance.mark("metadata:fetch:start");

      try {
        const files = await fetchUserFiles(solana.program, wallet.publicKey);
        setUserFiles(files);
      } catch (err) {
        console.error("Failed to fetch user files:", err);
        setError("Failed to load your files. Please try again.");
        toast.error("Failed to load your files.");
      } finally {
        performance.mark("metadata:fetch:end");
        performance.measure(
          MetadataMetrics.FetchUserFiles,
          "metadata:fetch:start",
          "metadata:fetch:end"
        );
        console.log("📊 Metadata fetch performance:");
        console.table(getUniquePerformanceMetrics());
        setLoading(false);
      }
    };

    loadUserFiles();
  }, [wallet?.publicKey?.toBase58(), solana]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!wallet?.publicKey || !solana) {
        toast.error("Wallet not connected or Solana program unavailable");
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [wallet?.publicKey?.toBase58(), solana]);
}
