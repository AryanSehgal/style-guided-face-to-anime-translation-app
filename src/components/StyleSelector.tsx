import React from 'react';
import { AnimeGanStyle, StyleOption } from '../types.js';
import { Sparkles, Palette, Film } from 'lucide-react';

export const STYLES_LIST: StyleOption[] = [
  {
    id: 'style_fat',
    name: 'Custom Model (StyleFAT)',
    tagline: 'Customised for Anime Look',
    description: 'Crisp cel-shaded anime look with detailed expressive eyes and clean lines.',
    accentColor: 'from-violet-500 to-indigo-600',
  },
  {
    id: 'hayao',
    name: 'Studio Ghibli Model (Hayao)',
    tagline: 'Miyazaki Watercolor Aesthetic',
    description: 'Soft painterly pastel palette inspired by classic animated fantasy landscapes.',
    accentColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'paprika',
    name: 'Paprika Model (Satoshi Kon)',
    tagline: 'Cinematic High-Contrast',
    description: 'Vivid color saturation with dramatic film lighting and expressive anime contrast.',
    accentColor: 'from-amber-500 to-rose-600',
  },
];

interface StyleSelectorProps {
  selectedStyle: AnimeGanStyle;
  onSelectStyle: (style: AnimeGanStyle) => void;
  disabled?: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
  disabled = false,
}) => {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Select Anime GAN Style
        </label>
        <span className="text-xs text-zinc-400">Embedded Pre-trained ONNX Model</span>
      </div>

      {/* 1. Responsive grid adjustments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3">
        {STYLES_LIST.map((style) => {
          const isSelected = selectedStyle === style.id;
          const IconComponent =
            style.id === 'style_fat' ? Sparkles : style.id === 'hayao' ? Palette : Film;

          return (
            <div key={style.id} className="relative group">
              <button
                id={`btn-style-${style.id}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectStyle(style.id)}
                title={style.description}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  {/* 2. Added shrink-0 to prevent icon container from squishing */}
                  <div
                    className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                  </div>
            
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {style.name}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {style.description}
                  </p>
                </div>
              </button>

              {/* 4. Floating hover tooltip displaying the complete untruncated description */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-40 w-60">
                <div className="bg-zinc-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl border border-zinc-700 text-center leading-normal">
                  <span className="font-semibold block text-[11px] text-indigo-300 mb-0.5">
                    {style.name}
                  </span>
                  {style.description}
                </div>
                <div className="w-2 h-2 bg-zinc-900 rotate-45 -mt-1 border-r border-b border-zinc-700"></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
