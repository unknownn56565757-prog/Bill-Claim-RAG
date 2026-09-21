import { useState } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Maximize2 } from 'lucide-react';
import type { BillFile } from '@/types';

export default function BillViewer({ files }: { files: BillFile[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400">
        No files uploaded
      </div>
    );
  }

  const file = files[activeIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-medium truncate max-w-[200px]">{file.name}</span>
          <span className="text-slate-400">
            {activeIndex + 1} / {files.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-slate-500 w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-slate-100 scrollbar-thin flex items-center justify-center p-4 relative">
        {file.type === 'pdf' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex h-64 w-48 items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-lg">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-600">{file.name}</p>
                <p className="text-xs text-slate-400">PDF Document</p>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={file.url}
            alt={file.name}
            className="max-w-none rounded-lg shadow-lg transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        )}
      </div>

      {/* Navigation */}
      {files.length > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 px-3 py-2 bg-slate-50">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Previous file"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {files.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-300'
                }`}
                aria-label={`Go to file ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setActiveIndex((i) => Math.min(files.length - 1, i + 1))}
            disabled={activeIndex === files.length - 1}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors"
            aria-label="Next file"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
