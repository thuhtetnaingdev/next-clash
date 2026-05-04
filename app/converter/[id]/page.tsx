'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import ConverterSection from '@/components/converter-section';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Converter {
  id: number;
  name: string;
  subscriptionUrl: string;
  convertedProxies: string;
  interval: number;
}

function getConvertedUrl(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `${window.location.origin}/api/converted-sub/${encodeURIComponent(slug)}`;
}

export default function ConverterDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [converter, setConverter] = useState<Converter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConverter() {
      try {
        const res = await fetch(`/api/converter/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Converter not found');
          } else {
            throw new Error('Failed to fetch');
          }
          return;
        }
        const data = await res.json();
        setConverter(data);
      } catch (err) {
        setError('Failed to load converter');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchConverter();
    }
  }, [params.id]);

  const handleCopyUrl = () => {
    if (!converter) return;
    const url = getConvertedUrl(converter.name);
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'URL copied to clipboard' });
  };

  if (loading) {
    return (
      <DashboardShell title="Loading...">
        <div className="p-4">Loading...</div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Error">
        <div className="p-4 text-red-500">{error}</div>
      </DashboardShell>
    );
  }

  if (!converter) {
    return (
      <DashboardShell title="Not Found">
        <div className="p-4">Converter not found</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={converter.name}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">Subscription URL:</span>
          <code className="flex-1 text-sm font-mono truncate">{getConvertedUrl(converter.name)}</code>
          <Button variant="outline" size="sm" onClick={handleCopyUrl}>
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
        </div>
        <ConverterSection
          converterId={converter.id}
          initialName={converter.name}
          initialSubscriptionUrl={converter.subscriptionUrl}
          initialConvertedProxies={converter.convertedProxies}
          initialInterval={converter.interval}
        />
      </div>
    </DashboardShell>
  );
}