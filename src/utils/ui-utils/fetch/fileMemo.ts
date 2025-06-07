import { UserFile } from "@/utils/types";
import { useMemo } from "react";
import isWithinTimeRange from "../common/isWithinTimeRange";

type fileMemoProps = {
  userFiles: UserFile[];
  timeFilter: string;
  sortKey: string;
  sortOrder: "asc" | "desc"
};

// Memoized and sorted files array based on filters and sort options
export default function fileMemo({userFiles, timeFilter, sortKey, sortOrder} : fileMemoProps) { return useMemo(() => {
  if (!userFiles) return [];

  // 1. Apply time filter
  const filtered = userFiles.filter((file) =>
    isWithinTimeRange({
      timestamp: file.timestamp.toNumber(),
      filter: timeFilter,
    })
  );

  // 2. Apply sorting
  return [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortKey === "timestamp") {
      comparison = a.timestamp.toNumber() - b.timestamp.toNumber();
    } else if (sortKey === "cid") {
      // Sort by CID as a proxy for 'name'
      comparison = a.cid.localeCompare(b.cid);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });
}, [userFiles, timeFilter, sortKey, sortOrder]);}