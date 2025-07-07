import { PublicKey } from "@solana/web3.js";
import { SetStateAction } from "react";

type DecryptByCIDProps = {
  fileCidInput: string;
  setFileCidInput: (value: SetStateAction<string>) => void;
  loading: boolean;
  publicKey: PublicKey | undefined;
  handleManualFetch(): Promise<void>;
};

export default function DecryptByCID({ fileCidInput, setFileCidInput, loading, publicKey, handleManualFetch }: DecryptByCIDProps) {
  return (
    <>
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Decrypt by File CID
        </h2>
        <input
          type="text"
          placeholder="Enter full file CID (e.g., bafybeia...)"
          value={fileCidInput}
          onChange={(e) => setFileCidInput(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-violet-500 focus:border-violet-500 transition duration-200"
          disabled={loading || !publicKey}
        />
        <button
          onClick={handleManualFetch}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          disabled={loading || !fileCidInput.trim() || !publicKey}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="loading loading-spinner loading-sm mr-2"></span>{" "}
              Processing...
            </span>
          ) : (
            "Decrypt File by CID"
          )}
        </button>
      </div>
    </>
  );
}
