'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Download } from 'lucide-react';

interface SubscriptionManagerProps {
  link: string;
  onSave: (link: string) => Promise<void>;
}

export function SubscriptionManager({ link: initialLink, onSave }: SubscriptionManagerProps) {
  const [link, setLink] = useState(initialLink);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(initialLink);
  }, [initialLink]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(link);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  }

  function handleOpenInBrowser() {
    if (link) {
      window.open(link, '_blank');
    }
  }

  function handleDownload() {
    const a = document.createElement('a');
    a.href = '/api/subscription/download';
    a.download = 'clash-config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscription Management</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Subscription Link</label>
          <Input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Enter subscription link (e.g., https://example.com/subscribe)"
          />
        </div>

        <div className="flex gap-2">
          {saved && (
            <span className="text-green-600 text-sm font-medium self-center">
              Saved successfully!
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !link}
            variant="default"
          >
            {saving ? 'Saving...' : 'Save Link'}
          </Button>
        </div>
      </div>

      {link && (
        <div className="space-y-4 pt-6 border-t">
          <h3 className="font-semibold">Subscription Actions</h3>

          <div className="space-y-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>

            <Button
              onClick={handleOpenInBrowser}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Browser
            </Button>

            <Button
              onClick={handleDownload}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Download className="w-4 h-4" />
              Download YAML
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            <strong>Note:</strong> The subscription link will be used to fetch your Clash config. Use the buttons above to copy the link or download the YAML config file directly.
          </p>
        </div>
      )}
    </div>
  );
}
