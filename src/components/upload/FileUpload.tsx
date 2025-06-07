import { PublicKey } from "@solana/web3.js";
import { CID, Version } from "multiformats";
import { SetStateAction } from "react";

type FileUploadProps = {
  setFile: (value: SetStateAction<File | null>) => void;
  handleUpload(): Promise<void>;
  file: File | null;
  loading: boolean;
  publicKey: PublicKey | null;
  hasPrivateKey: boolean;
  cid: CID<unknown, number, number, Version> | null;
};

export default function FileUpload({setFile, handleUpload, file, loading, publicKey, hasPrivateKey, cid }: FileUploadProps) {
  return (
    <>
      {/* File Upload Section */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Upload File
        </h2>
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
              <span className="loading loading-spinner loading-sm mr-2"></span>{" "}
              Uploading...
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
    </>
  );
}
