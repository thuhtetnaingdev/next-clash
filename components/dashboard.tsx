'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { YAMLEditor } from './yaml-editor';
import { LogOut, Copy, Check } from 'lucide-react';

export function Dashboard() {
  const [configContent, setConfigContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const subscriptionUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/subscription/yaml` 
    : '';

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/');
          return;
        }

        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        setConfigContent(configData.content || '');
      } catch (error) {
        console.error('Load error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleSaveConfig(content: string) {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to save config');
      }

      setConfigContent(content);
    } catch (error) {
      console.error('Save config error:', error);
      throw error;
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(subscriptionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full overflow-hidden">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md min-w-0 flex-1">
            <code className="text-sm text-gray-700 truncate">{subscriptionUrl}</code>
            <Button onClick={handleCopyUrl} variant="ghost" size="sm" className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button onClick={handleLogout} variant="outline" className="gap-2 shrink-0">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <YAMLEditor content={configContent} onSave={handleSaveConfig} />
        </div>
      </main>
    </div>
  );
}