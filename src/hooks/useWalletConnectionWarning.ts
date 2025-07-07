import { useEffect } from "react";
import toast from "react-hot-toast";
import { AnchorWallet } from "@solana/wallet-adapter-react";

export function useWalletConnectionWarning(wallet: AnchorWallet | undefined) {
  useEffect(() => {
    if (!wallet?.publicKey) {
      toast.error("❗ Please connect your wallet.", {
        id: "wallet-warning", 
      });
    } else {
      toast.dismiss("wallet-warning");
    }
  }, [wallet?.publicKey?.toBase58()]);
}
