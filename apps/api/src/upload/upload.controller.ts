import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { FileCorsInterceptor } from './file-cors.interceptor';

@Controller()
export class UploadController {
  constructor(private prisma: PrismaService) {}

  @Post('upload/file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    dest: './uploads',
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB'a çıkardık
  }))
  async uploadFile(
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Dosya yüklenemedi');
    }
    
    console.log('[Upload] File received:', file.originalname, file.size, 'bytes');

    // Validate file type - Genişletilmiş liste (GIF dahil!)
    const allowedMimes = [
      // Images (Static + Animated)
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',  // GIF desteği ✅
      'image/webp', // Animated WebP desteği ✅
      'image/svg+xml',
      // Videos  
      'video/mp4',
      'video/webm',
      'video/quicktime',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text
      'text/plain',
      'text/csv',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      console.warn('[Upload] Unsupported mimetype:', file.mimetype);
      throw new BadRequestException(`Dosya tipi desteklenmiyor: ${file.mimetype}`);
    }

    // Validate file size (25MB max, images için 10MB)
    const maxSize = file.mimetype.startsWith('image/') 
      ? 10 * 1024 * 1024  // Images: 10MB
      : 25 * 1024 * 1024; // Others: 25MB
      
    if (file.size > maxSize) {
      const limit = maxSize / (1024 * 1024);
      throw new BadRequestException(`Dosya boyutu ${limit}MB'dan küçük olmalı`);
    }

    // Metadata hesapla
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const fileUrl = `/api/upload/uploads/${file.filename}`;
    const thumbnail = isImage ? `/api/upload/uploads/thumb_${file.filename}` : null;

    // DB'ye File kaydı oluştur
    const fileRecord = await this.prisma.file.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        path: `uploads/${file.filename}`,
        url: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
        uploaderId: userId,
        isImage,
        isVideo,
        thumbnailUrl: thumbnail,
      },
    });

    console.log('[Upload] File saved to DB:', fileRecord.id, fileRecord.originalName);

    return {
      id: fileRecord.id,
      url: fileUrl,
      thumbnail,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedBy: userId,
      uploadedAt: fileRecord.createdAt.toISOString(),
    };
  }

  @Get(['uploads/:filename', 'upload/uploads/:filename'])
  @UseInterceptors(FileCorsInterceptor)
  async getFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const filePath = join(process.cwd(), 'uploads', filename);
    
    if (!existsSync(filePath)) {
      throw new NotFoundException('Dosya bulunamadı');
    }

    // DB'den dosya bilgilerini al
    const fileRecord = await this.prisma.file.findFirst({
      where: { filename },
    });

    // Dosya tipine göre Content-Type ve uzantı belirle
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'txt': 'text/plain',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
    };

    const contentType = (fileRecord?.mimetype) || (ext && mimeTypes[ext]) || 'application/octet-stream';
    
    // Orijinal dosya adını belirle (uzantılı)
    let downloadFilename = fileRecord?.originalName || filename;
    
    // Eğer orijinal dosya adında uzantı yoksa ekle
    if (downloadFilename && ext && !downloadFilename.toLowerCase().endsWith(`.${ext}`)) {
      downloadFilename = `${downloadFilename}.${ext}`;
    }

    // Content headers (CORS interceptor'da hallediliyor)
    res.set({
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(downloadFilename)}"`,
    });

    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }
}

