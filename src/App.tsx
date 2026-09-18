import React, { useState, useCallback } from 'react';
import { CameraCapture } from './components/CameraCapture.js';
import { ImageUploader } from './components/ImageUploader.js';
import { StyleSelector, STYLES_LIST } from './components/StyleSelector.js';
import { ComparisonViewer } from './components/ComparisonViewer.js';
import { ExportModal } from './components/ExportModal.js';
import { ModelStatusBadge } from './components/ModelStatusBadge.js';
import { AnimeGanStyle, StylizeResponse } from './types.js';
import {
  Sparkles,
  Download,
  RotateCcw,
  Camera,
  UploadCloud,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';

export default function App() {
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [stylizedResult, setStylizedResult] = useState<StylizeResponse | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<AnimeGanStyle>('style_fat');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeStyleInfo = STYLES_LIST.find((s) => s.id === selectedStyle) || STYLES_LIST[0];

  const handleImageSelected = useCallback((dataUrl: string) => {
    setInputImage(dataUrl);
    setStylizedResult(null);
    setErrorMessage(null);
  }, []);

  const handleRunGan = async (overrideStyle?: AnimeGanStyle) => {
    if (!inputImage) return;

    const styleToUse = overrideStyle || selectedStyle;
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep('Preparing face tensor & normalizing...');

    try {
      // Small simulated step feedback for smooth UX
      setTimeout(() => {
        setProcessingStep('Executing GAN generator inference on server CPU...');
      }, 400);

      const response = await fetch('/api/stylize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: inputImage,
          style: styleToUse,
          resolution: 1024,
          format: 'jpeg',
          quality: 95,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${response.status})`);
      }

      setProcessingStep('Rendering high-resolution output...');
      const data: StylizeResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to stylize portrait');
      }

      if (typeof data.stylizedImage !== 'string' || !data.stylizedImage.startsWith('data:image/')) {
        throw new Error('The server returned no valid stylized image.');
      }

      setStylizedResult(data);
    } catch (err: any) {
      console.error('Stylization error:', err);
      setErrorMessage(
        err.message || 'An error occurred while generating the anime face with the GAN model.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleStyleChange = (newStyle: AnimeGanStyle) => {
    setSelectedStyle(newStyle);
    // If we already have an image and styled result, automatically re-stylize with the newly picked style
    if (inputImage && stylizedResult) {
      handleRunGan(newStyle);
    }
  };

  const handleReset = () => {
    setInputImage(null);
    setStylizedResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 px-4 lg:px-8 py-3.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                AnimeGAN Face Studio
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hidden sm:inline-block">
                  ONNX GAN
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Pre-trained generative GAN model embedded directly in the backend
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inputImage && (
              <button
                id="btn-nav-reset"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                title="Start over with a new photo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Portrait
              </button>
            )}

            {stylizedResult && (
              <button
                id="btn-nav-export"
                onClick={() => setShowExportModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download High-Res
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Model Architecture & Privacy Assurance Banner */}
        <ModelStatusBadge
          inferenceTimeMs={stylizedResult?.inferenceTimeMs}
          modelName={stylizedResult?.modelName}
        />

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-900 dark:text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-rose-950 dark:text-rose-100">Inference Error</h4>
              <p className="mt-0.5 text-xs opacity-90">{errorMessage}</p>
            </div>
            <button
              id="btn-dismiss-error"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-medium underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* APPLICATION BODY */}
        {!inputImage ? (
          /* STATE 1: Image Input & Upload */
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 pt-2 pb-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Turn Human Faces into Anime Art
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Provide a face portrait using your camera or upload an image file. The pre-trained
                StyleFAT based generator processes your facial features locally on our server without
                external cloud APIs.
              </p>
            </div>

            <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
              <ImageUploader
                onImageSelected={handleImageSelected}
                onOpenLiveCamera={() => setShowCamera(true)}
              />
            </div>
          </div>
        ) : (
          /* STATE 2: Image Loaded - Stylization & Comparison */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Visual Canvas Viewer (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                {stylizedResult ? (
                  <ComparisonViewer
                    originalImage={inputImage}
                    stylizedImage={stylizedResult.stylizedImage}
                    styleName={activeStyleInfo.name}
                  />
                ) : (
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <img
                      src={inputImage}
                      alt="Selected face portrait"
                      className="w-full h-full object-cover"
                    />

                    {/* Loading Overlay when processing */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-3">
                        <div className="w-12 h-12 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin" />
                        <div className="space-y-1">
                          <h4 className="font-semibold text-white text-base">
                            Stylizing Face with AnimeGAN
                          </h4>
                          <p className="text-xs text-indigo-300 font-mono">{processingStep}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons beneath viewer */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-replace-photo"
                    onClick={() => setShowCamera(true)}
                    className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Retake Photo
                  </button>

                  <label className="cursor-pointer px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 shadow-xs">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Choose Other
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) handleImageSelected(ev.target.result as string);
                          };
                          reader.readAsDataURL(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                {stylizedResult && (
                  <button
                    id="btn-open-export"
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-xs font-medium text-white transition-all flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Download High Resolution (up to 4K)
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Controls & Style Configuration (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Style Selection Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-5">
                <StyleSelector
                  selectedStyle={selectedStyle}
                  onSelectStyle={handleStyleChange}
                  disabled={isProcessing}
                />

                {/* Primary Action Button */}
                {!stylizedResult ? (
                  <button
                    id="btn-generate-anime"
                    type="button"
                    onClick={() => handleRunGan()}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Anime Face...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Anime Version
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      id="btn-regenerate-anime"
                      type="button"
                      onClick={() => handleRunGan()}
                      disabled={isProcessing}
                      className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Re-run {activeStyleInfo.name}
                    </button>
                  </div>
                )}
              </div>

              {/* Generation Specs & Diagnostics Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Model & Inference Details
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-400 block text-[11px]">Architecture</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Pretrained Generator
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-400 block text-[11px]">Inference Mode</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Direct Backend CPU
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-400 block text-[11px]">Latent Grid</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      512 × 512 Tensor
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-400 block text-[11px]">Super-Resolution</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Lanczos3 Crisp Upscale
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Your images are processed privately and never sent to 3rd party APIs.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setShowCamera(false);
            handleImageSelected(dataUrl);
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* High-Resolution Export Modal */}
      {showExportModal && stylizedResult && inputImage && (
        <ExportModal
          stylizedImage={stylizedResult.stylizedImage}
          originalImage={inputImage}
          style={stylizedResult.style}
          styleName={activeStyleInfo.name}
          onClose={() => setShowExportModal(false)}
        />
      )}
      
      <footer className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Built by{' '}
        <a
          href="https://github.com/AryanSehgal"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Aryan Sehgal
        </a>
      </footer>
      
    </div>
  );
}
