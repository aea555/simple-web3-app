import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { returnUniqueMetrics } from "@/lib/metrics";

export default function usePageLoadMetrics() {
  const pathname = usePathname();

  useEffect(() => {
    const startMark = `page-load-start:${pathname}`;
    const endMark = `page-load-end:${pathname}`;
    const measureName = `Page Load: ${pathname}`;

    performance.mark(startMark);

    requestIdleCallback(() => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      console.log(`Performance metrics for ${pathname}`);

      const measures = performance.getEntriesByName(measureName);

      const uniqueMetrics = returnUniqueMetrics(measures);
      console.table(uniqueMetrics);
    });
  }, [pathname]);
}
