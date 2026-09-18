import express from 'express';
import { runGanInference, preloadModels, STYLES, AnimeGanStyle } from '../server/ganEngine.js';

const app = express();

// Increase payload limits for high-resolution base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Preload the default model in background
preloadModels().catch((err) => console.warn('[Vercel] Preload warning:', err));

// 1. Health & Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    engine: 'StyleFAT GAN ONNX Runtime (Vercel Serverless)',
    architecture: 'Generator GAN (Direct Embedded CPU Inference)',
    zeroThirdPartyApi: true,
    availableStyles: Object.values(STYLES).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
    supportedResolutions: [512, 1024, 2048],
    formats: ['png', 'jpeg'],
  });
});

// 2. Stylize endpoint
app.post('/api/stylize', async (req, res) => {
  try {
    // Support both 'image' (frontend) and 'imageBase64'
    const imageData = req.body.image || req.body.imageBase64;
    const styleParam = req.body.style || 'style_fat';
    const resParam = req.body.resolution || req.body.targetResolution || 1024;
    const formatParam = req.body.format === 'png' ? 'png' : 'jpeg';
    const qualityParam = Number(req.body.quality) || 95;

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "image" property (base64 or data URL required).' });
    }

    const base64Clean = imageData.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Clean, 'base64');

    if (inputBuffer.length === 0) {
      return res.status(400).json({ error: 'Decoded image data is empty.' });
    }

    const validStyle: AnimeGanStyle = STYLES[styleParam as AnimeGanStyle] ? (styleParam as AnimeGanStyle) : 'style_fat';
    const validRes = [512, 1024, 2048].includes(Number(resParam)) ? Number(resParam) : 1024;

    const result = await runGanInference({
      inputBuffer,
      style: validStyle,
      targetResolution: validRes,
      format: formatParam,
      quality: Math.min(100, Math.max(70, qualityParam)),
      sharpen: true,
    });

    return res.json({
      success: true,
      stylizedImage: result.dataUrl,
      inferenceTimeMs: result.inferenceTimeMs,
      totalTimeMs: result.totalTimeMs,
      style: result.style,
      modelName: STYLES[result.style].name,
      width: result.width,
      height: result.height,
      format: result.format,
      dataUri: result.dataUrl,
      metrics: {
        latencyMs: result.totalTimeMs,
        resolution: `${result.width}x${result.height}`,
        modelUsed: result.style,
        tensorDimension: '512x512',
      },
    });
  } catch (error: any) {
    console.error('[Vercel] Stylize error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process image through GAN model.',
    });
  }
});

export default app;
