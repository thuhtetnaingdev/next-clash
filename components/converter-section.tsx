'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import { parseClashContent } from '@/lib/clash-parser';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ConverterSectionProps {
  converterId?: number;
  initialName?: string;
  initialSubscriptionUrl?: string;
  initialConvertedProxies?: string;
  initialInterval?: number;
}

export default function ConverterSection({
  converterId,
  initialName = '',
  initialSubscriptionUrl = '',
  initialConvertedProxies = '',
  initialInterval = 0,
}: ConverterSectionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [subscriptionUrl, setSubscriptionUrl] = useState(initialSubscriptionUrl);
  const [name, setName] = useState(initialName);
  const [yamlContent, setYamlContent] = useState(initialConvertedProxies);
  const [interval, setInterval] = useState(initialInterval);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!converterId;

  async function handleConvert() {
    if (!subscriptionUrl) return;
    setLoading(true);
    try {
      const response = await fetch(subscriptionUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const text = await response.text();

      let decoded: string;
      try {
        decoded = atob(text);
      } catch {
        decoded = text;
      }

      const yamlResult = await parseClashContent(decoded);
      setYamlContent(yamlResult);
    } catch (error) {
      console.error('Fetch error:', error);
      setYamlContent(`# Fetch failed.\n# ${error}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name || !subscriptionUrl) {
      toast({
        title: 'Validation Error',
        description: 'Name and subscription URL are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const url = isEditMode ? '/api/converter' : '/api/converter';
      const method = isEditMode ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        name,
        subscriptionUrl,
        convertedProxies: yamlContent,
        interval,
      };

      if (isEditMode) {
        body.id = converterId;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      toast({
        title: 'Success',
        description: isEditMode ? 'Converter updated successfully' : 'Converter created successfully',
      });

      router.push('/converter');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save converter',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="subscription-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="subscription-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. My Server"
          />
        </div>
        <div className="w-32">
          <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-1">
            Interval (min)
          </label>
          <input
            id="interval"
            type="number"
            min="0"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Saving
            </span>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {isEditMode ? 'Update' : 'Save'}
            </>
          )}
        </Button>
      </div>
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label htmlFor="subscription-url" className="block text-sm font-medium text-gray-700 mb-1">
            Subscription URL
          </label>
          <input
            id="subscription-url"
            type="text"
            value={subscriptionUrl}
            onChange={(e) => setSubscriptionUrl(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/subscribe?token=..."
          />
        </div>
        <Button onClick={handleConvert} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Converting
            </span>
          ) : (
            <>
              <ArrowRightLeft className="w-5 h-5 mr-2" />
              Convert
            </>
          )}
        </Button>
      </div>
      <div className="flex-1 h-full min-h-[400px]">
        <MonacoEditor
          height="100%"
          defaultLanguage="yaml"
          value={yamlContent}
          onChange={(val) => setYamlContent(val || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}