"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { getPersistentW3Client } from "@/utils/web3client";
import { getW3SpaceDID } from "@/utils/store";
import { AppHero } from "@/components/ui/ui-layout";
import toast from "react-hot-toast";
import StorachaSetupPage from "@/components/setup/setupPage";

const W3Context = createContext<any>(null);

export function useW3() {
  return useContext(W3Context);
}

export function W3Provider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<any>(null);
  const [space, setSpace] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    toast.loading("Initializing secure storage...", { id: "storachaInit" });

    (async () => {
      const client = await getPersistentW3Client();
      setClient(client);

      const storedSpaceDID = await getW3SpaceDID();
      if (storedSpaceDID) {
        const space = client
          .spaces()
          .find((s: any) => s.did() === storedSpaceDID);
        if (space) {
          await client.setCurrentSpace(space.did());
          setSpace(space);
          setReady(true);
        }
      }

      setLoading(false);
      toast.dismiss("storachaInit");
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center min-h-screen-minus-nav px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-center w-full max-w-7xl mx-auto pt-8 pb-6 items-stretch">
          <div className="lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-8 mb-8 lg:mb-0">
            <AppHero
              title="Loading Secure Storage"
              subtitle="Please wait while we restore your decentralized storage session..."
              className="mb-0"
            />
          </div>
          <div className="flex-1 lg:w-1/2 w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col items-center justify-center space-y-4">
            <div className="text-center text-gray-700 dark:text-gray-200 font-medium">
              Setting up your encryption and access…
            </div>
            <span className="loading loading-spinner loading-lg text-violet-600"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <W3Context.Provider value={{ client, space, ready }}>
      {ready ? children : <StorachaSetupPage />}
    </W3Context.Provider>
  );
}
