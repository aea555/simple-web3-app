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
  downloadEncryptedPrivateKeyPem,
  hasEncryptedPrivateKey,
  promptAndLoadPrivateKey,
  promptPassword,
  storeEncryptedPrivateKey,
} from "@/utils/store";
import { registerRSAKeyOnChain, storeFileMetadata } from "@/utils/chain";
import { useSolanaProgram } from "@/hooks/useSolanaProgram";
import { handlePrivateKeyImport } from "@/utils/helpers";
import { AppHero, ellipsify } from "@/components/ui/ui-layout"; // Import AppHero and ellipsify
import toast from "react-hot-toast"; // Import toast for notifications
import { useW3 } from "@/context/w3Context";

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


  // Check for private key existence on component mount
  useEffect(() => {
    hasEncryptedPrivateKey().then(setHasPrivateKey);
  }, []);

  async function handleRegisterRsaKey() {
    if (!publicKey || !anchorWallet) {
      setError("Please connect your wallet first.");
      toast.error("Please connect your wallet to register an RSA key.");
      return;
    }

    setLoading(true);
    setError(null);
    toast.loading("🔐 Generating and registering RSA key...", { id: 'rsaKeyToast' });

    if (!solana) {
      setError("Solana program failed to initialize!");
      toast.error("Solana program not initialized.");
      setLoading(false);
      return;
    }

    const { program } = solana;

    try {
      const alreadyStored = await hasEncryptedPrivateKey();
      if (alreadyStored) {
        toast.success("🔐 RSA private key already exists in your browser.", { id: 'rsaKeyToast' });
        setLoading(false);
        return;
      }

      const { publicKeyPem, privateKey } = await generateRSAKeyPair();
      const password = promptPassword(
        "Set a password to protect your private key (DO NOT forget it!)"
      );

      if (!password) {
        setError("Password is required to protect your private key.");
        toast.error("Password is required to protect your private key.", { id: 'rsaKeyToast' });
        setLoading(false);
        return;
      }

      const { cipherText, iv, salt } = await encryptPrivateKeyWithPassword(
        privateKey,
        password
      );

      await storeEncryptedPrivateKey(cipherText, iv, salt);
      setHasPrivateKey(true);

      const tx = await registerRSAKeyOnChain(publicKey, publicKeyPem, program);
      console.log("RSA key stored! Tx:", tx);
      toast.success("✅ RSA key registered successfully!", { id: 'rsaKeyToast' });

    } catch (err: any) {
      console.error(err);
      setError("❌ RSA key registration failed: " + (err.message || err.toString()));
      toast.error("❌ RSA key registration failed: " + (err.message || err.toString()), { id: 'rsaKeyToast' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Please select a file to upload.");
      toast.error("Please select a file to upload.");
      return;
    }
    if (!publicKey || !anchorWallet) {
      setError("Please connect your wallet first.");
      toast.error("Please connect your wallet to upload files.");
      return;
    }

    setLoading(true);
    setError(null);
    setCid(null);
    toast.loading("📤 Starting file upload...", { id: 'uploadToast' });

    if (!solana) {
      setError("Solana program failed to initialize!");
      toast.error("Solana program not initialized.");
      setLoading(false);
      return;
    }

    const { program, programId } = solana;

    try {
      // 1. Fetch RSA Public Key from Chain
      toast.loading("Fetching RSA key from blockchain...", { id: 'uploadToast' });
      const rsaKey = await fetchRSAKey(publicKey, programId, program);
      if (!rsaKey) {
        setError("RSA key not found. Please register your RSA key first.");
        toast.error("RSA key not found. Please register your RSA key first.", { id: 'uploadToast' });
        setLoading(false);
        return;
      }
      toast.success("RSA key fetched.", { id: 'uploadToast' });

      // 2. Generate AES Key & Encrypt File
      toast.loading("Encrypting file and uploading to IPFS...", { id: 'uploadToast' });
      const aesKey = await generateAESKey();
      const { cid: fileCid, encryptedKey: rawAESKey } = await uploadFile(file, aesKey, client);
      setCid(CID.parse(fileCid.toString()));
      toast.success("File encrypted and uploaded to IPFS!", { id: 'uploadToast' });

      // 3. Encrypt AES Key with RSA and Upload to IPFS
      toast.loading("Encrypting AES key and uploading to IPFS...", { id: 'uploadToast' });
      const keyCid = await uploadEncryptedAESKey(rsaKey.raw, rawAESKey, client);
      toast.success(`Encrypted AES key uploaded. Key CID: ${ellipsify(keyCid)}`, { id: 'uploadToast' });

      // 4. Store File Metadata On-Chain
      toast.loading("Storing file metadata on-chain...", { id: 'uploadToast' });
      await storeFileMetadata(
        program,
        fileCid.toString(),
        keyCid,
        publicKey,
        programId
      );
      toast.success("✅ Upload complete! Metadata stored on-chain.", { id: 'uploadToast' });

    } catch (err: any) {
      console.error("Upload failed:", err);
      setError("❌ Upload failed: " + (err.message || err.toString()));
      toast.error("❌ Upload failed: " + (err.message || err.toString()), { id: 'uploadToast' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePrivateKeyDownload() {
    setLoading(true);
    setError(null);
    toast.loading("Preparing private key for download...", { id: 'downloadKeyToast' });
    try {
      const { privateKey, password } = await promptAndLoadPrivateKey();
      if (!privateKey) throw new Error("Private key not found or wrong password.");

      await downloadEncryptedPrivateKeyPem(privateKey, password);
      toast.success("✅ Encrypted PEM file downloaded.", { id: 'downloadKeyToast' });
    } catch (err: any) {
      console.error(err);
      setError(
        "❌ Private key download failed: No private key found in this browser or password was incorrect."
      );
      toast.error("❌ Private key download failed.", { id: 'downloadKeyToast' });
    } finally {
      setLoading(false);
    }
  }

  // Wrapper for handlePrivateKeyImport to integrate with loading/error states
  const handleImportWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    setError(null);
    toast.loading("Importing RSA private key...", { id: 'importKeyToast' });
    try {
      await handlePrivateKeyImport(e, setHasPrivateKey, (msg) => toast.success(msg, { id: 'importKeyToast' }), (msg) => toast.error(msg, { id: 'importKeyToast' }));
    } catch (err: any) {
      console.error(err);
      setError("❌ Private key import failed: " + (err.message || err.toString()));
      toast.error("❌ Private key import failed: " + (err.message || err.toString()), { id: 'importKeyToast' });
    } finally {
      setLoading(false);
    }
  };


  return (
    // Main container with full width, centered content, and responsive padding
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      {/* Top Section: Left and Right Columns for AppHero and Main Content */}
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        {/* Left Column: AppHero Title */}
        <div className="lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-8 mb-8 lg:mb-0">
          <AppHero
            className="mb-0" // Override AppHero's default mb-8
            title="Upload Encrypted Files"
            subtitle="Encrypt and store your files securely on IPFS, with metadata on Solana."
          />
        </div>

        {/* Right Column: Main Content (Wallet Status, RSA Key Management, File Upload) */}
        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          {/* Wallet Connection Status */}
          <div className="text-center mb-4">
            {publicKey ? (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Connected Wallet: <span className="font-semibold text-violet-600 dark:text-violet-400">{ellipsify(publicKey.toBase58())}</span>
              </p>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">Please connect your Solana wallet to upload files.</p>
            )}
          </div>

          {/* RSA Key Management Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">RSA Private Key Management</h2>
            {!hasPrivateKey ? (
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleRegisterRsaKey}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                  disabled={loading || !publicKey}
                >
                  Register New RSA Key
                </button>

                <div className="flex items-center justify-center text-gray-700 dark:text-gray-300">
                  <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                  <span className="px-3 font-bold">OR</span>
                  <hr className="flex-grow border-gray-300 dark:border-gray-600" />
                </div>

                <label className="cursor-pointer w-full px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 text-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-75">
                  Import RSA Private Key (.pem)
                  <input
                    type="file"
                    accept=".pem"
                    onChange={handleImportWrapper}
                    className="hidden"
                    disabled={loading || !publicKey}
                  />
                </label>
              </div>
            ) : (
              <button
                onClick={handlePrivateKeyDownload}
                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-opacity-75"
                disabled={loading}
              >
                Download My Encrypted Private Key
              </button>
            )}
          </div>

          {/* File Upload Section */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload File</h2>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 transition duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading || !publicKey || !hasPrivateKey}
            />

            <button
              onClick={handleUpload}
              disabled={!file || loading || !publicKey || !hasPrivateKey}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="loading loading-spinner loading-sm mr-2"></span> Uploading...
                </span>
              ) : (
                "Upload Encrypted File"
              )}
            </button>

            {cid && (
              <p className="text-green-600 dark:text-green-400 break-all text-sm mt-4">
                📁 File CID: <span className="font-mono">{cid.toString()}</span>
              </p>
            )}
          </div>

          {/* Global Error Display */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-700">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}