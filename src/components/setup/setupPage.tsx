"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AppHero } from "@/components/ui/ui-layout";
import { create } from "@web3-storage/w3up-client";
import { StoreIndexedDB } from "@web3-storage/w3up-client/stores/indexeddb";
import { storeW3SpaceDID } from "@/lib/store";

export default function StorachaSetupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    toast.loading("Starting registration...", { id: "storachaSetup" });

    try {
      const client = await create({ store: new StoreIndexedDB("w3up-store") });
      const account = await client.login(email as `${string}@${string}`); // Ensure email is in correct format

      toast.success("Check your inbox to confirm login.", { id: "storachaSetup" });

      await account.plan.wait(); // Wait until user clicks the email link

      toast.loading("Creating your space...", { id: "storachaSetup" });
      const space = await client.createSpace("my-space", { account });
      await client.setCurrentSpace(space.did());

      await storeW3SpaceDID(space.did());
      toast.success("Storacha setup complete!", { id: "storachaSetup" });
      setCompleted(true);
      window.location.reload(); // Reload to apply changes
    } catch (err: any) {
      console.error(err);
      toast.error("❌ Setup failed: " + (err.message || "Unknown error"), { id: "storachaSetup" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
        <div className="lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-8 mb-8 lg:mb-0">
          <AppHero
            title="Set Up Decentralized Storage"
            subtitle="Register your Storacha space to upload and retrieve encrypted files."
            className="mb-0"
          />
        </div>

        <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg space-y-6 mx-auto lg:mx-0 flex flex-col justify-center">
          {completed ? (
            <div className="text-green-600 dark:text-green-400 text-center">
              ✅ Setup complete! You can now upload and fetch files.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enter your email to begin
              </h2>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-violet-500 focus:border-violet-500 transition duration-200"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
              >
                {loading ? "Setting Up..." : "Register & Create Space"}
              </button>

              <div className="text-sm text-gray-600 dark:text-gray-400 pt-4">
                After clicking the button, check your email and follow the instructions to activate your Storacha account.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
