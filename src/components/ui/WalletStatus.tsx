import { PublicKey } from "@solana/web3.js";
import { ellipsify } from "../ui/ui-layout";
import toast from "react-hot-toast";

type WalletStatusProps = {
  publicKey: PublicKey | undefined;
};

export default function WalletStatus({ publicKey }: WalletStatusProps) {
  if (!publicKey) {
    toast.error("❗ Please connect your wallet.", {
      id: "wallet-warning", 
    });
    return;
  } else {
    toast.dismiss("wallet-warning");
  }
  return (
    <>
      {/* Wallet Connection Status */}
      <div className="text-center mb-4">
        {publicKey ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Connected Wallet:{" "}
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {ellipsify(publicKey.toBase58())}
            </span>
          </p>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            Please connect your Solana wallet to upload files.
          </p>
        )}
      </div>
    </>
  );
}
