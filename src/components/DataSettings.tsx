import { useState } from 'react';
import { Download, Upload, FileText, X } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { exportData, importData } from '../lib/api';
import type { ImportOptions } from '../types';

interface DataSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataSettingsDialog({ isOpen, onClose }: DataSettingsDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [includeAiOps, setIncludeAiOps] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const jsonData = await exportData();
      const defaultFileName = `echo-daily-backup-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (filePath) {
        await writeTextFile(filePath, jsonData);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });

      if (!filePath || typeof filePath !== 'string') {
        setIsImporting(false);
        return;
      }

      const text = await readTextFile(filePath);
      const options: ImportOptions = {
        overwrite,
        include_ai_operations: includeAiOps,
      };

      const count = await importData(text, options);
      alert(`Successfully imported ${count} ${count === 1 ? 'entry' : 'entries'}!`);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      alert(`Import failed: ${error}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[480px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-blue" />
            <h2 className="text-base font-semibold text-ink-primary">Data Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        {/* Compact Content */}
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Export Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-accent-blue" />
              <h3 className="font-medium text-sm text-ink-primary">Export</h3>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Backup all entries to JSON file
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="col-span-2 h-px bg-stone-200 -mx-4" />

          {/* Import Section */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-green-600" />
              <h3 className="font-medium text-sm text-ink-primary">Import</h3>
            </div>

            <div className="flex items-start gap-4">
              {/* Options */}
              <div className="space-y-1.5 flex-1">
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-accent-blue focus:ring-accent-blue"
                  />
                  <span className="text-xs text-stone-700 group-hover:text-stone-900">Overwrite existing</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeAiOps}
                    onChange={(e) => setIncludeAiOps(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-stone-300 text-accent-blue focus:ring-accent-blue"
                  />
                  <span className="text-xs text-stone-700 group-hover:text-stone-900">Include AI history</span>
                </label>
              </div>

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-white border-2 border-stone-200 text-stone-700 text-sm rounded-lg hover:bg-stone-50 hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
