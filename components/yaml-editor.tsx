'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';

interface YAMLEditorProps {
  content: string;
  onSave: (content: string) => Promise<void>;
}

export function YAMLEditor({ content, onSave }: YAMLEditorProps) {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(content);
  }, [content]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Clash Config Editor</h2>
        <div className="flex gap-2">
          {saved && (
            <span className="text-green-600 text-sm font-medium">
              Saved successfully!
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="default"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </div>
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={value}
        onChange={(val) => setValue(val || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
