"use client";

import AccountDetailFeature from '@/components/account/account-detail-feature'
import usePageLoadMetrics from '@/hooks/usePageLoadMetrics';

export default function Page() {
  usePageLoadMetrics();
  return <AccountDetailFeature />
}
