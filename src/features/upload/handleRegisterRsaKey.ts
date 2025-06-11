import { AnchorWallet } from "@solana/wallet-adapter-react";
import { SetStateAction } from "react";
import { SolanaProgramContext } from "@/lib/types"
import {
  hasEncryptedPrivateKey,
  promptPassword,
  storeEncryptedPrivateKey,
} from "@/lib/store";
import {
  encryptPrivateKeyWithPassword,
  generateRSAKeyPair,
} from "@/lib/cryptography"
import { registerRSAKeyOnChain } from "@/lib/chain"
import toast from "react-hot-toast";

type handleRegisterRsaKeyProps = {
  wallet: AnchorWallet | undefined;
  setError: (value: SetStateAction<string | null>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  solana: SolanaProgramContext | undefined;
  setHasPrivateKey: (value: SetStateAction<boolean>) => void;
};

export default async function handleRegisterRsaKey({
  wallet,
  setError,
  setLoading,
  solana,
  setHasPrivateKey
}: handleRegisterRsaKeyProps) {
  if (!wallet || !wallet.publicKey) {
    setError("Please connect your wallet first.");
    toast.error("Please connect your wallet to register an RSA key.");
    return;
  }

  setLoading(true);
  setError(null);
  toast.loading("🔐 Generating and registering RSA key...", {
    id: "rsaKeyToast",
  });

  if (!solana) {
    setError("Solana program failed to initialize!");
    toast.error("Solana program not initialized.");
    setLoading(false);
    return;
  }

  const { program } = solana;

  try {
    const alreadyStored = await hasEncryptedPrivateKey(wallet.publicKey.toBase58());
    if (alreadyStored) {
      toast.success("🔐 RSA private key already exists in your browser.", {
        id: "rsaKeyToast",
      });
      setLoading(false);
      return;
    }

    const { publicKeyPem, privateKey } = await generateRSAKeyPair();
    const password = promptPassword(
      "Set a password to protect your private key (DO NOT forget it!)"
    );

    if (!password) {
      setError("Password is required to protect your private key.");
      toast.error("Password is required to protect your private key.", {
        id: "rsaKeyToast",
      });
      setLoading(false);
      return;
    }

    const { cipherText, iv, salt } = await encryptPrivateKeyWithPassword(
      privateKey,
      password
    );

    await storeEncryptedPrivateKey(wallet.publicKey.toBase58(), cipherText, iv, salt);
    setHasPrivateKey(true);

    const tx = await registerRSAKeyOnChain(wallet.publicKey, publicKeyPem, program);
    console.log("RSA key stored! Tx:", tx);
    toast.success("✅ RSA key registered successfully!", {
      id: "rsaKeyToast",
    });
  } catch (err: any) {
    console.error(err);
    setError(
      "❌ RSA key registration failed: " + (err.message || err.toString())
    );
    toast.error(
      "❌ RSA key registration failed: " + (err.message || err.toString()),
      { id: "rsaKeyToast" }
    );
  } finally {
    setLoading(false);
  }
}
