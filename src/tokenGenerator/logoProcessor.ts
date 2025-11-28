import sharp from 'sharp';
import { logger } from '../utils/logger';

export class LogoProcessor {
  async processLogo(base64Logo: string): Promise<string> {
    try {
      const base64Data = base64Logo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const processedBuffer = await sharp(buffer)
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .composite([
          {
            input: Buffer.from(
              `<svg width="512" height="512">
                <circle cx="256" cy="256" r="256" fill="white"/>
              </svg>`
            ),
            blend: 'dest-in',
          },
        ])
        .toBuffer();

      const processedBase64 = processedBuffer.toString('base64');
      return `data:image/png;base64,${processedBase64}`;
    } catch (error) {
      logger.error('Error processing logo:', error);
      throw new Error('Failed to process logo image');
    }
  }

  async validateLogo(base64Logo: string): Promise<boolean> {
    try {
      const base64Data = base64Logo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height) {
        return false;
      }

      if (buffer.length > 5 * 1024 * 1024) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating logo:', error);
      return false;
    }
  }
}

export const logoProcessor = new LogoProcessor();
