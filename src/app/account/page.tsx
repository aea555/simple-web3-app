'use client';

import AccountListFeature from '@/components/account/account-list-feature'
import usePageLoadMetrics from '@/hooks/usePageLoadMetrics';

export default function Page() {
  usePageLoadMetrics();
  return <AccountListFeature />
}
