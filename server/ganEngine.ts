import path from 'path';
import fs from 'fs';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

export type AnimeGanStyle = 'style_fat' | 'hayao' | 'paprika';

export interface StyleModelConfig {
  id: AnimeGanStyle;
  name: string;
  description: string;
  modelFileName: string;
  tensorLayout: 'NCHW' | 'NHWC';
  inputName: string;
  outputName: string;
}

export const STYLES: Record<AnimeGanStyle, StyleModelConfig> = {
  style_fat: {
    id: 'style_fat',
    name: 'Custom Model (StyleFAT)',
    description: 'Trained specifically for human faces with crisp cel-shading and expressive anime eyes',
    modelFileName: 'StyleFAT_GAN.onnx',
    tensorLayout: 'NCHW',
    inputName: 'input_image',
    outputName: 'output_image',
  },
  hayao: {
    id: 'hayao',
    name: 'Studio Ghibli (Hayao)',
    description: 'Painterly, warm, storybook watercolor tones inspired by classic Ghibli animation',
    modelFileName: 'AnimeGANv2_Hayao.onnx',
    tensorLayout: 'NHWC',
    inputName: 'generator_input:0',
    outputName: 'generator/G_MODEL/out_layer/Tanh:0',
  },
  paprika: {
    id: 'paprika',
    name: 'Paprika (Satoshi Kon)',
    description: 'Vibrant, high-chroma cinematic aesthetic with dramatic lighting and vivid anime colors',
    modelFileName: 'AnimeGANv2_Paprika.onnx',
    tensorLayout: 'NHWC',
    inputName: 'generator_input:0',
    outputName: 'generator/G_MODEL/out_layer/Tanh:0',
  },
};

// In-memory cache for loaded ONNX InferenceSessions
const sessionsCache = new Map<AnimeGanStyle, ort.InferenceSession>();
let isPreloading = false;

export async function getSession(styleId: AnimeGanStyle): Promise<{ session: ort.InferenceSession; config: StyleModelConfig }> {
  const config = STYLES[styleId] || STYLES.style_fat;
  let session = sessionsCache.get(config.id);

  if (!session) {
    const modelPath = path.resolve(process.cwd(), 'models', config.modelFileName);
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model weights file not found at ${modelPath}`);
    }

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: 4,
    };

    session = await ort.InferenceSession.create(modelPath, sessionOptions);
    sessionsCache.set(config.id, session);
  }

  return { session, config };
}

export async function preloadModels() {
  if (isPreloading) return;
  isPreloading = true;
  try {
    // Preload default style_fat first
    await getSession('style_fat');
    console.log('[AnimeGAN Engine] Pre-trained StyleFAT GAN model loaded and ready in memory.');
  } catch (err) {
    console.warn('[AnimeGAN Engine] Model preload warning:', err);
  } finally {
    isPreloading = false;
  }
}

export interface StylizeOptions {
  inputBuffer: Buffer;
  style: AnimeGanStyle;
  targetResolution?: number; // 512, 1024, 2048
  format?: 'png' | 'jpeg';
  quality?: number;
  sharpen?: boolean;
}

export interface StylizeResult {
  imageBuffer: Buffer;
  dataUrl: string;
  inferenceTimeMs: number;
  totalTimeMs: number;
  style: AnimeGanStyle;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

/**
 * Executes direct GAN inference using the pre-trained ONNX model
 */
export async function runGanInference(options: StylizeOptions): Promise<StylizeResult> {
  const startTime = Date.now();
  const { inputBuffer, style = 'style_fat', targetResolution = 1024, format = 'jpeg', quality = 95, sharpen = true } = options;

  const { session, config } = await getSession(style);

  // 1. Preprocessing with sharp:
  // Convert input to exactly 512x512 RGB raw buffer (3 channels, 8-bit uint)
  const raw512 = await sharp(inputBuffer)
    .resize(512, 512, { fit: 'cover', position: 'center' })
    .removeAlpha()
    .raw()
    .toBuffer();

  const numPixels = 512 * 512;
  let inputTensor: ort.Tensor;

  if (config.tensorLayout === 'NCHW') {
    // NCHW layout: [1, 3, 512, 512] normalized to [-1, 1]
    const floatArr = new Float32Array(1 * 3 * numPixels);
    for (let h = 0; h < 512; h++) {
      for (let w = 0; w < 512; w++) {
        const srcIdx = (h * 512 + w) * 3;
        floatArr[0 * numPixels + h * 512 + w] = (raw512[srcIdx] / 127.5) - 1.0;
        floatArr[1 * numPixels + h * 512 + w] = (raw512[srcIdx + 1] / 127.5) - 1.0;
        floatArr[2 * numPixels + h * 512 + w] = (raw512[srcIdx + 2] / 127.5) - 1.0;
      }
    }
    inputTensor = new ort.Tensor('float32', floatArr, [1, 3, 512, 512]);
  } else {
    // NHWC layout: [1, 512, 512, 3] normalized to [-1, 1]
    const floatArr = new Float32Array(numPixels * 3);
    for (let i = 0; i < raw512.length; i++) {
      floatArr[i] = (raw512[i] / 127.5) - 1.0;
    }
    inputTensor = new ort.Tensor('float32', floatArr, [1, 512, 512, 3]);
  }

  // 2. Run ONNX Model Inference
  const inferenceStart = Date.now();
  const feeds: Record<string, ort.Tensor> = {
    [config.inputName]: inputTensor,
  };
  const outputs = await session.run(feeds);
  const inferenceTimeMs = Date.now() - inferenceStart;

  const outputTensor = outputs[config.outputName];
  if (!outputTensor || !outputTensor.data) {
    throw new Error(`Output tensor '${config.outputName}' was not returned by the model.`);
  }

  const outData = outputTensor.data as Float32Array;

  // 3. Post-process tensor output back to 512x512 RGB raw Buffer
  const outRgbBuffer = Buffer.alloc(numPixels * 3);

  if (config.tensorLayout === 'NCHW') {
    // NCHW -> HWC
    for (let h = 0; h < 512; h++) {
      for (let w = 0; w < 512; w++) {
        const dstIdx = (h * 512 + w) * 3;
        const r = outData[0 * numPixels + h * 512 + w];
        const g = outData[1 * numPixels + h * 512 + w];
        const b = outData[2 * numPixels + h * 512 + w];

        outRgbBuffer[dstIdx] = Math.max(0, Math.min(255, Math.round(((r + 1.0) / 2.0) * 255)));
        outRgbBuffer[dstIdx + 1] = Math.max(0, Math.min(255, Math.round(((g + 1.0) / 2.0) * 255)));
        outRgbBuffer[dstIdx + 2] = Math.max(0, Math.min(255, Math.round(((b + 1.0) / 2.0) * 255)));
      }
    }
  } else {
    // NHWC -> HWC
    for (let i = 0; i < outRgbBuffer.length; i++) {
      const val = outData[i];
      outRgbBuffer[i] = Math.max(0, Math.min(255, Math.round(((val + 1.0) / 2.0) * 255)));
    }
  }

  // 4. High-Resolution rendering and format encoding with sharp
  const targetSize = Math.max(512, Math.min(4096, targetResolution));
  let pipeline = sharp(outRgbBuffer, {
    raw: { width: 512, height: 512, channels: 3 },
  });

  if (targetSize !== 512) {
    pipeline = pipeline.resize(targetSize, targetSize, {
      kernel: 'lanczos3',
    });
  }

  if (sharpen && targetSize >= 1024) {
    // Subtle crisp edge enhancement for high-res anime lines
    pipeline = pipeline.sharpen({
      sigma: 1.0,
      m1: 0.7,
      m2: 2.0,
    });
  }

  let finalBuffer: Buffer;
  let mimeType: string;

  if (format === 'png') {
    mimeType = 'image/png';
    finalBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
  } else {
    mimeType = 'image/jpeg';
    finalBuffer = await pipeline.jpeg({ quality, chromaSubsampling: '4:4:4' }).toBuffer();
  }

  const totalTimeMs = Date.now() - startTime;
  const dataUrl = `data:${mimeType};base64,${finalBuffer.toString('base64')}`;

  return {
    imageBuffer: finalBuffer,
    dataUrl,
    inferenceTimeMs,
    totalTimeMs,
    style,
    width: targetSize,
    height: targetSize,
    format,
  };
}
