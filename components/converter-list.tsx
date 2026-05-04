'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Converter {
  id: number;
  name: string;
  subscriptionUrl: string;
  createdAt: string;
  updatedAt: string;
}

function truncate(str: string, max = 40) {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function getConvertedUrl(name: string) {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return `${window.location.origin}/api/converted-sub/${encodeURIComponent(slug)}`;
}

export default function ConverterList() {
  const router = useRouter();
  const { toast } = useToast();
  const [converters, setConverters] = useState<Converter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConverters() {
      try {
        const res = await fetch('/api/converter');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setConverters(data);
      } catch (err) {
        setError('Failed to load converters');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchConverters();
  }, []);

  const handleAdd = () => {
    router.push('/converter/new');
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this converter?')) return;
    
    try {
      const res = await fetch(`/api/converter?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setConverters(converters.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete converter');
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const url = getConvertedUrl(name);
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'URL copied to clipboard' });
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Subscriptions</h2>
        <Button onClick={handleAdd}>
          <Plus className="w-5 h-5 mr-2" />
          Add V2ray Subscription
        </Button>
      </div>
      {converters.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No subscriptions yet. Click "Add V2ray Subscription" to create one.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subscription Link</TableHead>
                <TableHead>Converted URL</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {converters.map((converter) => (
                <TableRow
                  key={converter.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/converter/${converter.id}`)}
                >
                  <TableCell>{converter.id}</TableCell>
                  <TableCell>{converter.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncate(converter.subscriptionUrl)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleCopyUrl(e, converter.name)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      {truncate(getConvertedUrl(converter.name), 25)}
                    </Button>
                  </TableCell>
                  <TableCell>{formatDate(converter.updatedAt)}</TableCell>
                  <TableCell>{formatDate(converter.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, converter.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}