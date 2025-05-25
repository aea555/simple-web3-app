"use client";

import {
  useEffect,
  useState,
} from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { uploadEncryptedAESKey, uploadFile } from "@/utils/ipfs";
import {
  encryptPrivateKeyWithPassword,
  fetchRSAKey,
  generateAESKey,
  generateRSAKeyPair,
} from "@/utils/cryptography";
import { CID } from "multiformats/cid";
import {
  downloadPrivateKeyPem,
  hasEncryptedPrivateKey,
  promptAndLoadPrivateKey,
  promptPassword,
  storeEncryptedPrivateKey,
} from "@/utils/store";
import { registerRSAKeyOnChain, storeFileMetadata } from "@/utils/chain";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { handlePrivateKeyImport } from "@/utils/helpers";
import { SolanaProgramContext } from "@/utils/types";

export default function Upload() {
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<CID | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPrivateKey, setHasPrivateKey] = useState<boolean>(false);
  const solana = useSolanaProgram(anchorWallet);

  useEffect(() => {
    hasEncryptedPrivateKey().then(setHasPrivateKey);
  }, []);

  async function handleRegisterRsaKey(solana: SolanaProgramContext | undefined) {
    if (!publicKey || !anchorWallet) return;

    // Check if a private key already exists in IndexedDB
    const alreadyStored = await hasEncryptedPrivateKey();
    if (alreadyStored) {
      setStatus("🔐 RSA private key already exists in your browser.");
      return;
    }

    if (!solana) {
      setError("❌ Solana program failed to initialize!");
      return null;
    }

    const { program, programId } = solana;

    try {
      // Set status to indicate process has started
      setStatus("🔐 Generating and registering RSA key...");

      // Generate RSA key pair (2048-bit) in browser
      // This key will be used to encrypt/decrypt AES keys for files
      const { publicKeyPem, privateKey } = await generateRSAKeyPair();

      // Store the private key in indexed-db
      const password = promptPassword(
        "Set a password to protect your private key (DO NOT forget it!)"
      );
      if (!password) {
        setError("❌ Password is required to protect your private key.");
        return;
      }

      const { cipherText, iv, salt } = await encryptPrivateKeyWithPassword(
        privateKey,
        password
      );

      await storeEncryptedPrivateKey(cipherText, iv, salt);
      setHasPrivateKey(true);

      // Store the public key on-chain (as a string) in the UserRSAKey PDA
      const tx = await registerRSAKeyOnChain(publicKey, publicKeyPem, program);

      // Confirm registration
      console.log("RSA key stored! Tx:", tx);
      setStatus("✅ RSA key registered!");
    } catch (err: any) {
      console.error(err);
      setError(
        "❌ RSA key registration failed: " + (err.message || err.toString())
      );
      setStatus(null);
    }
  }

  async function handleUpload(solana: SolanaProgramContext | undefined) {
    if (!file || !publicKey || !anchorWallet) return;

    setStatus("📤 Uploading file to IPFS...");
    setError(null);

    if (!solana) {
      setError("❌ Solana program failed to initialize!");
      return null;
    }

    const { program, programId } = solana;

    try {
      const rsaKey = await fetchRSAKey(publicKey, programId, program);
      if (!rsaKey) {
        setError("❌ RSA key not found. Please register your RSA key first.");
        return;
      }

      const aesKey = await generateAESKey();
      const { cid, encryptedKey: rawAESKey } = await uploadFile(file, aesKey);
      setCid(CID.parse(cid.toString()));

      const keyCid = await uploadEncryptedAESKey(rsaKey.raw, rawAESKey);
      setStatus(`🔐 Encrypted AES key uploaded. keyCID: ${keyCid}`);

      setStatus("📦 Storing file metadata on-chain...");
      await storeFileMetadata(
        program,
        cid.toString(),
        keyCid,
        publicKey,
        programId
      );

      setStatus("✅ Upload complete!");
    } catch (err: any) {
      console.error(err);
      setError("❌ Upload failed: " + (err.message || err.toString()));
      setStatus(null);
    }
  }

  async function handlePrivateKeyDownload() {
    try {
      const key = await promptAndLoadPrivateKey();
      if (key) 
        await downloadPrivateKeyPem(key);
      else
        throw new Error;
    }
    catch (err: any) {
      console.error(err);
      setError(
        "❌ Private key download failed: No private key found in this browser or you entered the wrong password.")
      setStatus(null);
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {publicKey ? (
        <p className="text-sm text-gray-600">
          Connected Wallet:{" "}
          {publicKey.toBase58().substring(0, 10).trimEnd() + "..."}
        </p>
      ) : (
        <p className="text-sm text-red-600">Connect Wallet</p>
      )}

      {/* Key Management Section */}
      <div className="flex flex-col gap-4">
        {!hasPrivateKey ? (
          <>
            {/* Register RSA Key */}
            <button
              onClick={() => handleRegisterRsaKey(solana)}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              Register RSA Key
            </button>

            <span className="text-center font-bold text-white">OR</span>

            {/* Import Private Key (styled like button) */}
            <label className="cursor-pointer bg-rose-700 hover:bg-rose-800 text-white py-2 px-4 rounded text-center">
              Import RSA Private Key (.pem)
              <input
                type="file"
                accept=".pem"
                onChange={(e) =>
                  handlePrivateKeyImport(
                    e,
                    setHasPrivateKey,
                    setStatus,
                    setError
                  )
                }
                className="hidden"
              />
            </label>
          </>
        ) : (
          <button
            onClick={handlePrivateKeyDownload}
            className="bg-violet-600 hover:bg-violet-700 text-white py-2 px-4 rounded"
          >
            Download Private Key
          </button>
        )}
      </div>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2 w-full"
      />

      <button
        onClick={() => handleUpload(solana)}
        disabled={!file}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        Upload
      </button>

      {status && <p className="text-blue-500">{status}</p>}
      {cid && (
        <p className="text-green-600 break-all">📁 CID: {cid.toString()}</p>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
