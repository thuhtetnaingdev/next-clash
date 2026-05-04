'use client';

import { DashboardShell } from '@/components/dashboard-shell';
import ConverterSection from '@/components/converter-section';

export default function NewConverterPage() {
  return (
    <DashboardShell title="New Subscription">
      <ConverterSection />
    </DashboardShell>
  );
}
