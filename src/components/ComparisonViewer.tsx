import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Columns, SplitSquareVertical, Eye, Image as ImageIcon, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { ViewMode } from '../types.js';

interface ComparisonViewerProps {
  originalImage: string;
  stylizedImage: string;
  styleName: string;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalImage,
  stylizedImage,
  styleName,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      handlePointerMove(e.touches[0].clientX);
    },
    [isDragging, handlePointerMove]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handlePointerMove(e.clientX);
    },
    [isDragging, handlePointerMove]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, handleMouseMove, handlePointerUp, handleTouchMove]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 text-xs">
          <button
            id="view-mode-slider"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'slider'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Split Wipe
          </button>
          <button
            id="view-mode-side-by-side"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side by Side
          </button>
          <button
            id="view-mode-anime-only"
            onClick={() => setViewMode('anime-only')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'anime-only'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Anime Output
          </button>
          <button
            id="view-mode-original-only"
            onClick={() => setViewMode('original-only')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'original-only'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Original
          </button>
        </div>

        {/* Zoom & Fullscreen Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 text-xs">
            <button
              id="btn-zoom-out"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
              disabled={zoomLevel <= 1}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-zinc-600 dark:text-zinc-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              id="btn-zoom-in"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              disabled={zoomLevel >= 2.5}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            id="btn-toggle-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Visual Display */}
      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800 select-none shadow-md ${
          isFullscreen ? 'flex items-center justify-center p-4' : 'aspect-square max-h-[640px]'
        }`}
      >
        {/* VIEW MODE: SLIDER (SPLIT WIPE) */}
        {viewMode === 'slider' && (
          <div
            className="relative w-full h-full cursor-ew-resize overflow-hidden flex items-center justify-center"
            onMouseDown={(e) => {
              setIsDragging(true);
              handlePointerMove(e.clientX);
            }}
            onTouchStart={(e) => {
              setIsDragging(true);
              handlePointerMove(e.touches[0].clientX);
            }}
          >
            {/* Base layer: Stylized Anime (Right side revealed as slider moves left) */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden transition-transform duration-75"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={stylizedImage}
                alt="Anime GAN result"
                className="w-full h-full object-cover pointer-events-none"
              />
              <span className="absolute bottom-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-md bg-black/70 text-white backdrop-blur-md border border-white/10 shadow-sm pointer-events-none">
                Anime GAN ({styleName})
              </span>
            </div>

            {/* Clipped top layer: Original Photo (Left side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
              }}
            >
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-75"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={originalImage}
                  alt="Original human face"
                  className="w-full h-full object-cover pointer-events-none"
                />
                <span className="absolute bottom-4 left-4 text-xs font-semibold px-2.5 py-1 rounded-md bg-black/70 text-white backdrop-blur-md border border-white/10 shadow-sm pointer-events-none">
                  Original Face
                </span>
              </div>
            </div>

            {/* Split Drag Line & Handle */}
            <div
              className="absolute top-0 bottom-0 z-20 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)] pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg border border-zinc-200">
                <SplitSquareVertical className="w-4 h-4 text-zinc-800" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE: SIDE BY SIDE */}
        {viewMode === 'side-by-side' && (
          <div className="w-full h-full grid grid-cols-2 divide-x divide-zinc-800 overflow-hidden">
            <div
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={originalImage}
                alt="Original human face"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-4 left-4 text-xs font-semibold px-2.5 py-1 rounded-md bg-black/70 text-white backdrop-blur-md border border-white/10">
                Original Face
              </span>
            </div>
            <div
              className="relative w-full h-full flex items-center justify-center overflow-hidden"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={stylizedImage}
                alt="Anime GAN result"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-200 backdrop-blur-md border border-indigo-700/50">
                Anime GAN
              </span>
            </div>
          </div>
        )}

        {/* VIEW MODE: ANIME ONLY */}
        {viewMode === 'anime-only' && (
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={stylizedImage}
              alt="Anime GAN styled face"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-4 right-4 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/75 text-white backdrop-blur-md border border-white/15">
              {styleName} Output
            </span>
          </div>
        )}

        {/* VIEW MODE: ORIGINAL ONLY */}
        {viewMode === 'original-only' && (
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={originalImage}
              alt="Original portrait"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-4 left-4 text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/75 text-white backdrop-blur-md border border-white/15">
              Original Portrait
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
