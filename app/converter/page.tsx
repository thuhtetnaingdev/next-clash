'use client';

import { DashboardShell } from '@/components/dashboard-shell';
import ConverterList from '@/components/converter-list';

export default function ConverterPage() {
  return (
    <DashboardShell title="Converter">
      <ConverterList />
    </DashboardShell>
  );
}
