import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { runGanInference, preloadModels, STYLES, AnimeGanStyle } from './server/ganEngine.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure body-parsers with large limits for high-resolution images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      engine: 'AnimeGANv2 Native ONNX Runtime',
      architecture: 'Generator GAN (Direct Embedded CPU Inference)',
      zeroThirdPartyApi: true,
      availableStyles: Object.values(STYLES).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
      })),
      supportedResolutions: [512, 1024, 2048],
      formats: ['png', 'jpeg'],
    });
  });

  app.post('/api/stylize', async (req, res) => {
    try {
      const { image, style = 'style_fat', resolution = 1024, format = 'jpeg', quality = 95 } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid "image" property (base64 or data URL required).' });
      }

      // Strip data URL header if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');

      if (inputBuffer.length === 0) {
        return res.status(400).json({ error: 'Decoded image data is empty.' });
      }

      const validStyle: AnimeGanStyle = STYLES[style as AnimeGanStyle] ? (style as AnimeGanStyle) : 'style_fat';
      const validRes = [512, 1024, 2048].includes(Number(resolution)) ? Number(resolution) : 1024;
      const validFormat = format === 'png' ? 'png' : 'jpeg';

      const result = await runGanInference({
        inputBuffer,
        style: validStyle,
        targetResolution: validRes,
        format: validFormat,
        quality: Math.min(100, Math.max(70, Number(quality) || 95)),
        sharpen: true,
      });

      res.json({
        success: true,
        stylizedImage: result.dataUrl,
        inferenceTimeMs: result.inferenceTimeMs,
        totalTimeMs: result.totalTimeMs,
        style: result.style,
        modelName: STYLES[result.style].name,
        width: result.width,
        height: result.height,
        format: result.format,
      });
    } catch (err: any) {
      console.error('[API /api/stylize Error]', err);
      res.status(500).json({
        error: err.message || 'Internal GAN inference error',
      });
    }
  });

  app.post('/api/export', async (req, res) => {
    try {
      const { image, style = 'style_fat', resolution = 2048, format = 'png' } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Missing image data.' });
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const inputBuffer = Buffer.from(base64Data, 'base64');

      const validStyle: AnimeGanStyle = STYLES[style as AnimeGanStyle] ? (style as AnimeGanStyle) : 'style_fat';
      const targetRes = [512, 1024, 2048, 4096].includes(Number(resolution)) ? Number(resolution) : 2048;
      const validFormat = format === 'jpeg' ? 'jpeg' : 'png';

      const result = await runGanInference({
        inputBuffer,
        style: validStyle,
        targetResolution: targetRes,
        format: validFormat,
        quality: 100,
        sharpen: true,
      });

      const filename = `anime-face-${validStyle}-${targetRes}px.${validFormat === 'png' ? 'png' : 'jpg'}`;
      res.setHeader('Content-Type', validFormat === 'png' ? 'image/png' : 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result.imageBuffer);
    } catch (err: any) {
      console.error('[API /api/export Error]', err);
      res.status(500).json({ error: err.message || 'Export rendering failed' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AnimeGAN Face Studio Server] running at http://0.0.0.0:${PORT}`);
    preloadModels().catch(console.error);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
