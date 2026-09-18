// api/index.ts
import express from 'express';
import { runGanInference, preloadModels, STYLES, AnimeGanStyle } from '../server/ganEngine.js';

const app = express();

// Enable JSON body parsing for image payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Preload the default model
preloadModels().catch((err) => console.warn('Preload warning:', err));

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
    const { imageBase64, style = 'style_fat', targetResolution = 1024, format = 'jpeg', quality = 95 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 parameter is required.' });
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const inputBuffer = Buffer.from(base64Data, 'base64');

    const result = await runGanInference({
      inputBuffer,
      style: style as AnimeGanStyle,
      targetResolution: Number(targetResolution) || 1024,
      format: (format === 'png' ? 'png' : 'jpeg') as 'jpeg' | 'png',
      quality: Number(quality) || 95,
      sharpen: true,
    });

    const outputDataUri = `data:${result.mimeType};base64,${result.outputBuffer.toString('base64')}`;

    return res.json({
      success: true,
      dataUri: outputDataUri,
      metrics: {
        latencyMs: result.latencyMs,
        resolution: `${result.width}x${result.height}`,
        modelUsed: result.modelUsed,
        tensorDimension: '512x512',
      },
    });
  } catch (error: any) {
    console.error('Stylize error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process image through GAN model.',
    });
  }
});

// Export default handler for Vercel Serverless
export default app;
