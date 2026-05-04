'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { YAMLEditor } from './yaml-editor';
import { VersionManager } from './version-manager';
import { LogOut, Copy, Check, Menu, X } from 'lucide-react';
import { SideMenu } from './side-menu';

export function Dashboard() {
  const [configContent, setConfigContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const subscriptionUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/subscription/${process.env.NEXT_PUBLIC_SUBSCRIPTION_TOKEN}/yaml` 
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
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="ghost" size="sm" className="shrink-0 lg:hidden">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-md min-w-0 flex-1">
            <code className="text-sm text-gray-700 truncate">{subscriptionUrl}</code>
            <Button onClick={handleCopyUrl} variant="ghost" size="sm" className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <VersionManager
            currentContent={configContent}
            onRestore={(content) => setConfigContent(content)}
            onSave={handleSaveConfig}
          />
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <SideMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto p-6">
          <YAMLEditor content={configContent} onSave={handleSaveConfig} />
        </main>
      </div>
    </div>
  );
}
