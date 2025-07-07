import "./globals.css";
import { ClusterProvider } from "@/components/cluster/cluster-data-access";
import { SolanaProvider } from "@/providers/solana-provider";
import { UiLayout } from "@/components/ui/ui-layout";
import { ReactQueryProvider } from "./react-query-provider";
import { W3Provider } from "@/providers/w3Context";

export const metadata = {
  title: "Encrypted Storage",
  description: "A simple encrypted storage solution for Solana",
};

const links: { label: string; path: string }[] = [
  { label: "Account", path: "/account" },
  { label: "Clusters", path: "/clusters" },
  { label: "Upload", path: "/upload" },
  { label: "Fetch", path: "/fetch" },
  { label: "Shared Files", path: "/shared" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <W3Provider>
          <ReactQueryProvider>
            <ClusterProvider>
              <SolanaProvider>
                <UiLayout>{children}</UiLayout>
              </SolanaProvider>
            </ClusterProvider>
          </ReactQueryProvider>
        </W3Provider>
      </body>
    </html>
  );
}
