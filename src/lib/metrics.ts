export const RSAMetrics = {
  GenerateKeyPair: "RSA: Generate Key Pair",
  RegisterPublicKey: "RSA: Register Public Key On-Chain",
  Total: "RSA: Total",
};

export const SharedPageMetrics = {
  ListSharedFiles: "Shared: Fetch Shared Files (Chain)",
  DecryptSharedFile: "Shared: Decrypt Shared File",
};

export const ManualFetchMetrics = {
  FetchFileMetadata: "ManualFetch: Fetch File Metadata",
  DecryptFile: "Manual Fetch: Decrypt & Download",
  Total: "ManualFetch: Total",
};

export const UploadMetrics = {
  FetchRSAKey: "Upload: Fetch RSA Key",
  EncryptAndUploadFile: "Upload: Encrypt + IPFS Upload (File)",
  EncryptAndUploadAESKey: "Upload: Encrypt + IPFS Upload (AES Key)",
  StoreMetadata: "Upload: Store Metadata On-Chain",
  Total: "Upload: Total",
};

export const DeletionMetrics = {
  Single: "Delete: Single File",
  Bulk: "Delete: Bulk Files",
};

export const GenerationMetrics = {
  GenerateRSAKeyPair: "Generation: RSA Key Pair",
};

export const DownloadMetrics = {
  FetchFromIPFS: "Download: Fetch Encrypted File (IPFS)",
  DecryptFile: "Download: Decrypt File",
  Total: "Download: Total",
};

export const MetadataMetrics = {
  FetchUserFiles: "Metadata: Fetch User Files (Chain)",
  UploadFileMetadata: "Metadata: Upload File Metadata (Chain)",
};

export const SharingMetrics = {
  EncryptAESKey: "Share: Encrypt AES Key for Recipient",
  UploadSharedAESKey: "Share: IPFS Upload (Shared AES Key)",
  RegisterSharedAccess: "Share: Register Shared Access (Chain)",
  Total: "Share: Total",
};

export const ShareMetrics = {
  FetchRecipientRSA: "Share: Fetch Recipient RSA Key",
  DecryptAES: "Share: Decrypt AES Key",
  RegisterShare: "Share: Register File Share",
  Total: "Share: Total",
};

export const PageLoadMetrics = {
  UploadPage: "PageLoad: Upload Page",
  FetchPage: "PageLoad: Fetch Page",
  SharedPage: "PageLoad: Shared Files Page",
};

function extractPrefixes(...metricGroups: Record<string, string>[]): string[] {
  const allValues = metricGroups.flatMap(Object.values);
  const prefixes = new Set<string>();
  allValues.forEach((val) => {
    const colonIndex = val.indexOf(":");
    if (colonIndex !== -1) {
      prefixes.add(val.slice(0, colonIndex + 1).trim()); 
    }
  });
  return Array.from(prefixes);
}

const labels = extractPrefixes(
  RSAMetrics,
  SharedPageMetrics,
  ManualFetchMetrics,
  UploadMetrics,
  DeletionMetrics,
  GenerationMetrics,
  DownloadMetrics,
  MetadataMetrics,
  SharingMetrics,
  ShareMetrics,
  PageLoadMetrics
);

export function returnUniqueMetrics(measures: PerformanceEntry[]) {
  const seen = new Set();
  return measures.filter((m) => {
    const key = `${m.name}-${m.startTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getPerformanceMetrics() {
  return performance
    .getEntriesByType("measure")
    .filter((m) => labels.some((label) => m.name.startsWith(label)));
}

export function getUniquePerformanceMetrics(): PerformanceMeasure[] {
  const seen = new Set();
  return performance
    .getEntriesByType("measure")
    .filter((entry) => labels.some((label) => entry.name.startsWith(label)))
    .filter((entry) => {
      const key = `${entry.name}-${entry.startTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) as PerformanceMeasure[];
}
