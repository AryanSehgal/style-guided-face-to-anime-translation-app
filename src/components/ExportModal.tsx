import React, { useState } from 'react';
import { Download, X, Check, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { AnimeGanStyle, ResolutionOption, ImageFormat } from '../types.js';

interface ExportModalProps {
  stylizedImage: string;
  originalImage: string;
  style: AnimeGanStyle;
  styleName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  stylizedImage,
  originalImage,
  style,
  styleName,
  onClose,
}) => {
  const [resolution, setResolution] = useState<ResolutionOption>(2048);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'anime' | 'comparison'>('anime');

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (exportType === 'anime') {
        // Direct high-resolution export via backend endpoint
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: stylizedImage,
            style,
            resolution,
            format,
          }),
        });

        if (!response.ok) {
          throw new Error('Export service encountered an error.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anime-face-${style}-${resolution}px.${format === 'png' ? 'png' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Generate a side-by-side comparison poster
        const canvas = document.createElement('canvas');
        canvas.width = resolution * 2;
        canvas.height = resolution;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const [origImg, animeImg] = await Promise.all([
          loadImage(originalImage),
          loadImage(stylizedImage),
        ]);

        // Left: Original
        ctx.drawImage(origImg, 0, 0, resolution, resolution);
        // Right: Anime GAN
        ctx.drawImage(animeImg, resolution, 0, resolution, resolution);

        // Subtle divider line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(resolution - 2, 0, 4, resolution);

        // Labels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(40, resolution - 100, 240, 60);
        ctx.fillRect(resolution + 40, resolution - 100, 360, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(resolution * 0.024)}px sans-serif`;
        ctx.fillText('Original Portrait', 60, resolution - 60);
        ctx.fillText(`Anime GAN (${styleName})`, resolution + 60, resolution - 60);

        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `anime-face-comparison-${resolution}px.${format === 'png' ? 'png' : 'jpg'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          },
          mime,
          format === 'png' ? undefined : 0.95
        );
      }
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to download image: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                Download High Resolution
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Export anime portrait styled with {styleName}
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Options */}
        <div className="space-y-4">
          {/* Export Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Export Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="export-type-anime"
                onClick={() => setExportType('anime')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  exportType === 'anime'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span className="block font-semibold text-sm">Anime Portrait</span>
                <span className="text-[11px] opacity-75">Clean styled face only</span>
              </button>
              <button
                type="button"
                id="export-type-comparison"
                onClick={() => setExportType('comparison')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  exportType === 'comparison'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span className="block font-semibold text-sm">Side-by-Side</span>
                <span className="text-[11px] opacity-75">Before & after card</span>
              </button>
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Target Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { res: 512, label: 'Native', sub: '512×512' },
                { res: 1024, label: 'HD 2K', sub: '1024×1024' },
                { res: 2048, label: 'UHD 4K', sub: '2048×2048' },
              ].map(({ res, label, sub }) => (
                <button
                  key={res}
                  type="button"
                  id={`btn-res-${res}`}
                  onClick={() => setResolution(res as ResolutionOption)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    resolution === res
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="block font-bold text-xs">{label}</span>
                  <span className="text-[10px] opacity-75">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File Format */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { fmt: 'png', title: 'PNG', desc: 'Lossless crisp lines' },
                { fmt: 'jpeg', title: 'JPEG', desc: 'Compact file size' },
              ].map(({ fmt, title, desc }) => (
                <button
                  key={fmt}
                  type="button"
                  id={`btn-fmt-${fmt}`}
                  onClick={() => setFormat(fmt as ImageFormat)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    format === fmt
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="block font-bold text-xs">{title}</span>
                  <span className="text-[10px] opacity-75">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="btn-confirm-download"
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering High-Res Output...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download {resolution}px {format.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
