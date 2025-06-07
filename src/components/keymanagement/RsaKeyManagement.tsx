import { PublicKey } from "@solana/web3.js";

type KeyManagementProps = {
  loading: boolean;
  publicKey: PublicKey | null;
  hasPrivateKey: boolean;
  handleRegisterRsaKey(): Promise<void>;
  handleImportWrapper: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePrivateKeyDownload(): Promise<void>;
};

export default function RsaKeyManagement({hasPrivateKey, publicKey, loading, handleRegisterRsaKey, handleImportWrapper, handlePrivateKeyDownload}: KeyManagementProps) {
  return (
    <>
      {/* RSA Key Management Section */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          RSA Private Key Management
        </h2>
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
    </>
  );
}
