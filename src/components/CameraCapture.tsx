import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, CircleDot, AlertCircle, Timer } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [useTimer, setUseTimer] = useState(false);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop existing stream if running
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera. Please check camera permissions in your browser.';
      if (err.name === 'NotAllowedError') {
        message = 'Camera access was denied. Please allow camera permissions to capture your face portrait.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera device was detected on your system.';
      }
      setCameraError(message);
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const snapPhoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Make it a square center crop for optimal facial GAN processing
    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front-facing for natural mirror feel
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Stop tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    onCapture(dataUrl);
  }, [facingMode, onCapture, stream]);

  const handleTriggerSnap = () => {
    if (useTimer) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            snapPhoto();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      snapPhoto();
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-base">Capture Face Portrait</h3>
          </div>
          <button
            id="btn-close-camera"
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onCancel();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Error Viewport */}
        <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-zinc-200 text-sm">{cameraError}</p>
              <button
                id="btn-retry-camera"
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Face Guide Oval */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-80 border-2 border-dashed border-white/50 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex items-center justify-center">
                  <span className="text-xs tracking-wider uppercase text-white/80 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm -mt-44">
                    Align Face
                  </span>
                </div>
              </div>

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                  <span className="text-7xl font-bold text-white animate-ping">{countdown}</span>
                </div>
              )}
            </>
          )}

          {isInitializing && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            id="btn-toggle-timer"
            onClick={() => setUseTimer((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              useTimer ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="Toggle 3-second shutter delay"
          >
            <Timer className="w-4 h-4" />
            3s Timer {useTimer ? 'ON' : 'OFF'}
          </button>

          {/* Shutter Button */}
          <button
            id="btn-shutter-snap"
            onClick={handleTriggerSnap}
            disabled={isInitializing || !!cameraError || countdown !== null}
            className="w-16 h-16 rounded-full bg-white hover:bg-zinc-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-all p-1 shadow-lg ring-4 ring-indigo-500/30"
            title="Snap portrait"
          >
            <div className="w-full h-full rounded-full border-2 border-zinc-900 flex items-center justify-center">
              <CircleDot className="w-7 h-7 text-zinc-900" />
            </div>
          </button>

          {/* Switch Facing Mode */}
          <button
            id="btn-switch-camera"
            onClick={toggleCamera}
            disabled={isInitializing || !!cameraError}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            title="Flip camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
