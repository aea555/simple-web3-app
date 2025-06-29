"use client";

import ClusterFeature from '@/components/cluster/cluster-feature'
import usePageLoadMetrics from '@/hooks/usePageLoadMetrics';

export default function Page() {
  usePageLoadMetrics();
  return (<ClusterFeature />);
}
