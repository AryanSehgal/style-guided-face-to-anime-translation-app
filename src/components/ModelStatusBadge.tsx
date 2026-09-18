import React, { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, Zap } from 'lucide-react';

interface ModelStatusBadgeProps {
  inferenceTimeMs?: number | null;
  modelName?: string;
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({
  inferenceTimeMs,
  modelName,
}) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/status')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => setStatus('online'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Backend GAN Engine:
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {modelName ? modelName : 'Pretrained StyleFAT based GAN (ONNX)'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Zero 3rd-Party APIs</span>
        </div>

        {inferenceTimeMs ? (
          <div className="flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400">
            <Zap className="w-3.5 h-3.5" />
            <span>{(inferenceTimeMs / 1000).toFixed(2)}s GAN inference</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>Direct Server Inference</span>
          </div>
        )}
      </div>
    </div>
  );
};
