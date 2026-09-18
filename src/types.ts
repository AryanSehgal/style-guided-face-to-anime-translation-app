export type AnimeGanStyle = 'style_fat' | 'hayao' | 'paprika';

export interface StyleOption {
  id: AnimeGanStyle;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
}

export interface StylizeResponse {
  success: boolean;
  stylizedImage: string;
  inferenceTimeMs: number;
  totalTimeMs: number;
  style: AnimeGanStyle;
  modelName: string;
  width: number;
  height: number;
  format: string;
  error?: string;
}

export type ViewMode = 'slider' | 'side-by-side' | 'anime-only' | 'original-only';

export type ResolutionOption = 512 | 1024 | 2048;
export type ImageFormat = 'png' | 'jpeg';
