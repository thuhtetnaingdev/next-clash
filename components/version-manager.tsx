'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, History, GitCompare } from 'lucide-react';
import * as Diff from 'diff';

interface Version {
  id: number;
  content: string;
  createdAt?: string;
  created_at?: string;
}

interface VersionManagerProps {
  currentContent: string;
  onRestore: (content: string) => void;
  onSave: (content: string) => Promise<void>;
}

export function VersionManager({ currentContent, onRestore, onSave }: VersionManagerProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [diffMode, setDiffMode] = useState<'current' | 'prev'>('current');

  async function loadVersions() {
    setLoading(true);
    try {
      const res = await fetch('/api/config/versions');
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Load versions error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(version: Version) {
    try {
      await fetch(`/api/config/versions/${version.id}/restore`, { method: 'POST' });
      onRestore(version.content);
      setSelectedVersion(null);
      setCompareVersion(null);
      setShowVersions(false);
    } catch (error) {
      console.error('Restore error:', error);
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this version?')) return;
    
    try {
      await fetch(`/api/config/versions/${id}`, { method: 'DELETE' });
      setVersions(versions.filter(v => v.id !== id));
      if (selectedVersion?.id === id) setSelectedVersion(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  function handleVersionClick(version: Version) {
    setSelectedVersion(version);
    setCompareVersion(null);
    setDiffMode('current');
  }

  function getTime(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString();
  }

  function handleCompareWithPrev() {
    const idx = versions.findIndex(v => v.id === selectedVersion?.id);
    if (idx + 1 < versions.length) {
      setCompareVersion(versions[idx + 1]);
      setDiffMode('prev');
    }
  }

  function getDiff(oldText: string, newText: string) {
    return Diff.diffLines(oldText, newText);
  }

  function getPrevDiff(oldText: string, newText: string) {
    return Diff.diffLines(newText, oldText);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString();
  }

  useEffect(() => {
    if (showVersions) {
      loadVersions();
    }
  }, [showVersions]);

  return (
    <div className="relative">
      <Button
        onClick={() => setShowVersions(!showVersions)}
        variant="outline"
        className="gap-2"
      >
        <History className="w-4 h-4" />
        Versions
      </Button>

      {showVersions && (
        <div className="absolute right-0 top-12 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-gray-50 font-medium flex justify-between items-center">
            <span>Version History</span>
            <button onClick={() => setShowVersions(false)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No versions yet</div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${selectedVersion?.id === version.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleVersionClick(version)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{formatDate(version.createdAt || version.created_at || '')}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(version); }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(version.id, e)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {idx + 1 < versions.length && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-400">vs {formatDate(versions[idx + 1].createdAt || versions[idx + 1].created_at || '')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedVersion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">Version {selectedVersion.id}</h3>
                <span className="text-sm text-gray-500">{formatDate(selectedVersion.createdAt || selectedVersion.created_at || '')}</span>
              </div>
              <button onClick={() => { setSelectedVersion(null); setCompareVersion(null); }} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="border-b flex gap-2 px-4">
              <button
                onClick={() => { setDiffMode('current'); setCompareVersion(null); }}
                className={`py-2 px-3 text-sm ${diffMode === 'current' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
              >
                Current Config
              </button>
{(() => {
                const idx = versions.findIndex(v => v.id === selectedVersion?.id);
                return idx + 1 < versions.length ? (
                  <button
                    onClick={handleCompareWithPrev}
                    className={`py-2 px-3 text-sm ${diffMode === 'prev' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                  >
                    Diff vs Previous
                  </button>
                ) : null;
              })()}
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {diffMode === 'current' ? (
                <pre className="text-xs whitespace-pre-wrap font-mono">{selectedVersion.content}</pre>
              ) : compareVersion ? (
                <div className="font-mono text-xs">
                  {getDiff(compareVersion.content, selectedVersion.content).map((part, i) => (
                    <div
                      key={i}
                      className={`whitespace-pre-wrap ${part.added ? 'bg-green-100 text-green-800' : part.removed ? 'bg-red-100 text-red-800' : 'text-gray-600'}`}
                    >
                      {part.added ? '+ ' : part.removed ? '- ' : '  '}
                      {part.value}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setSelectedVersion(null); setCompareVersion(null); }}>
                Cancel
              </Button>
              <Button onClick={() => handleRestore(selectedVersion)}>
                Restore This Version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}