import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

export interface UploadResult {
  storageKey: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveReceiptImage(file: Express.Multer.File): Promise<UploadResult> {
    const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomId = crypto.randomUUID();
    const fileName = `receipt_${randomId}.webp`;
    const targetPath = path.join(this.uploadDir, fileName);

    let finalBuffer: Buffer;
    let finalMime = 'image/webp';

    try {
      // Compress and resize image using Sharp (max width 1200px, 80% webp quality)
      finalBuffer = await sharp(file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Sharp compression skipped: ${err.message}. Using original buffer.`);
      finalBuffer = file.buffer;
      finalMime = file.mimetype;
    }

    await fs.promises.writeFile(targetPath, finalBuffer);

    const storageKey = fileName;
    const fileUrl = `/api/v1/storage/file/${fileName}`;

    return {
      storageKey,
      fileUrl,
      fileName: file.originalname,
      fileType: finalMime,
      fileSizeBytes: finalBuffer.length,
    };
  }

  getFilePath(storageKey: string): string {
    return path.join(this.uploadDir, storageKey);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const filePath = this.getFilePath(storageKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}
