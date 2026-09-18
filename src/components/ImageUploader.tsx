import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, Sparkles, Check } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (dataUrl: string) => void;
  onOpenLiveCamera: () => void;
  disabled?: boolean;
}

const SAMPLE_PORTRAITS = [
  {
    id: 'woman',
    title: 'Female Portrait',
    desc: 'Studio front-facing',
    thumb: '/samples/portrait_woman.jpg',
  },
  {
    id: 'man',
    title: 'Male Portrait',
    desc: 'Natural studio light',
    thumb: '/samples/portrait_man.jpg',
  },
];

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  onOpenLiveCamera,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedSample(null);
        onImageSelected(result);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelected]);

  // Global paste handler (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = async (samplePath: string, id: string) => {
    if (disabled) return;
    setSelectedSample(id);
    try {
      const response = await fetch(samplePath);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          onImageSelected(reader.result as string);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Drag & Drop Main Zone */}
      <div
        id="drop-zone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white/70 dark:bg-zinc-900/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Drag and drop your face portrait here
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              or click to browse from your device • Paste with <kbd className="px-1.5 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300">Ctrl+V</kbd>
            </p>
          </div>

          <div className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
            <Sparkles className="w-3.5 h-3.5" />
            Clear front-facing portraits produce the sharpest anime style
          </div>
        </div>
      </div>

      {/* Alternative Input Actions: Camera Button + Sample Presets */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Camera Launch Button */}
        <button
          id="btn-open-camera"
          type="button"
          onClick={onOpenLiveCamera}
          disabled={disabled}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-98"
        >
          <Camera className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
          Take Photo with Camera
        </button>

        {/* Quick Sample Face Presets */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider hidden sm:inline">
            Try Demo Face:
          </span>
          <div className="flex gap-2">
            {SAMPLE_PORTRAITS.map((sample) => (
              <button
                key={sample.id}
                id={`btn-sample-${sample.id}`}
                type="button"
                onClick={() => handleSampleClick(sample.thumb, sample.id)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selectedSample === sample.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <img
                  src={sample.thumb}
                  alt={sample.title}
                  className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                />
                <span>{sample.title}</span>
                {selectedSample === sample.id && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
