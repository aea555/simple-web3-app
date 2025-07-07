import { SolanaProgramContext, UserFile } from "@/lib/types";
import copyToClipboard from "@/features/common/copyToClipboard";
import handleDecrypt from "@/features/fetch/handleDecrypt";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { GlobalModalProps } from "../ui/GlobalModal";

type ListFilesProps = {
  timeFilter: string;
  setTimeFilter: (value: SetStateAction<string>) => void;
  sortKey: string;
  setSortKey: (value: SetStateAction<string>) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (value: SetStateAction<"asc" | "desc">) => void;
  loading: boolean;
  userFiles: UserFile[];
  sortedAndFilteredFiles: UserFile[];
  handleShare(file: UserFile): Promise<void>;
  wallet: AnchorWallet | undefined;
  solana: SolanaProgramContext | undefined;
  setError: (value: SetStateAction<string | null>) => void;
  setLoading: (value: SetStateAction<boolean>) => void;
  selectedCids: string[];
  setSelectedCids: Dispatch<SetStateAction<string[]>>;
  setSelectedSingleCid: Dispatch<SetStateAction<string | null>>;
  handleDelete: (cid: string) => Promise<void>;
  setShowModal?: Dispatch<SetStateAction<boolean>>;
  setShowModal2?: Dispatch<SetStateAction<boolean>>;
};

export default function ListFiles({
  timeFilter,
  setTimeFilter,
  sortKey,
  setSortKey,
  sortOrder,
  setSortOrder,
  loading,
  userFiles,
  sortedAndFilteredFiles,
  handleShare,
  wallet,
  solana,
  setError,
  setLoading,
  selectedCids,
  setSelectedCids,
  setSelectedSingleCid,
  handleDelete,
  setShowModal,
  setShowModal2,
}: ListFilesProps) {
  return (
    <>
      <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mt-8 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Uploaded Files
          </h2>
          <div className="flex items-center space-x-4">
            {/* Sort by Time Filter */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="timeFilter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Filter:
              </label>
              <select
                id="timeFilter"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-violet-500 focus:border-violet-500 transition duration-200 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
              </select>
            </div>

            {/* Sort by Name/Date */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="sortKey"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Sort by:
              </label>
              <select
                id="sortKey"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-violet-500 focus:border-violet-500 transition duration-200 text-sm"
              >
                <option value="timestamp">Date</option>
                <option value="cid">Name (CID)</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition duration-200"
                aria-label={
                  sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"
                }
              >
                {sortOrder === "asc" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            {selectedCids.length > 0 && (
              <button
                onClick={() => setShowModal && setShowModal(true)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition"
              >
                🗑 Delete Selected ({selectedCids.length})
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-4">
            <span className="loading loading-spinner loading-md text-violet-600"></span>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Loading your files...
            </p>
          </div>
        )}
        {!loading && userFiles.length === 0 && wallet?.publicKey && (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            No files uploaded yet. Go to the{" "}
            <Link href="/upload" className="text-violet-600 hover:underline">
              Upload page
            </Link>{" "}
            to get started!
          </p>
        )}
        {!loading && !wallet?.publicKey && (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            Connect your wallet to see your uploaded files.
          </p>
        )}
        {!loading &&
          wallet?.publicKey &&
          sortedAndFilteredFiles.length === 0 &&
          userFiles.length > 0 && (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No files match the selected filter and sort options.
            </p>
          )}
        <div className="space-y-3">
          {sortedAndFilteredFiles.map((file) => (
            <div
              key={file.pubkey.toBase58()}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <input
                type="checkbox"
                checked={selectedCids.includes(file.cid)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCids((prev) => [...prev, file.cid]);
                  } else {
                    setSelectedCids((prev) =>
                      prev.filter((id) => id !== file.cid)
                    );
                  }
                }}
                className="mr-2"
              />
              <div className="flex-1 mb-2 sm:mb-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                  CID:{" "}
                  <span className="font-mono text-violet-600 dark:text-violet-400">
                    {file.cid}
                  </span>
                  <button
                    onClick={() => copyToClipboard({ text: file.cid })}
                    className="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition duration-200"
                    aria-label="Copy CID"
                  >
                    Copy
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Uploaded:{" "}
                  {new Date(file.timestamp.toNumber() * 1000).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  handleDecrypt({
                    metadata: file,
                    wallet,
                    solana,
                    setLoading,
                    setError,
                  })
                }
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="loading loading-spinner loading-xs mr-1"></span>{" "}
                    Decrypting...
                  </span>
                ) : (
                  "Decrypt & Download"
                )}
              </button>
              <button
                onClick={() => handleShare(file)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 ml-2"
                disabled={loading}
              >
                Share
              </button>
              <button
                onClick={() => {
                  setSelectedSingleCid(file.cid);
                  setShowModal2 && setShowModal2(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 ml-2"
                disabled={loading}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
