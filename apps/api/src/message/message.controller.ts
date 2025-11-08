import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { MessageService } from './message.service';
import { MessageGateway } from './message.gateway';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
  ) {}

  @Post('channel/:channelId')
  @ApiOperation({ summary: 'Send a message to a channel' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const message = await this.messageService.create(userId, channelId, createMessageDto);
    
    // Emit to WebSocket clients via Gateway method
    this.messageGateway.emitNewMessage(channelId, message);
    
    return message;
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get messages for a channel' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [MessageDto],
  })
  async findByChannel(
    @CurrentUser('id') userId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    return this.messageService.findAll(
      userId,
      channelId,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single message' })
  @ApiResponse({
    status: 200,
    description: 'Message retrieved successfully',
    type: MessageDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messageService.findOne(userId, messageId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({
    status: 200,
    description: 'Message updated successfully',
    type: MessageDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
    @Body('content') content: string,
  ) {
    return this.messageService.update(userId, messageId, content);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messageService.remove(userId, messageId);
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload files for messages' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadFiles(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const attachments = files.map((file) => {
      const fileType = file.mimetype.startsWith('image/')
        ? 'image'
        : file.mimetype.startsWith('video/')
        ? 'video'
        : 'file';

      return {
        id: `${Date.now()}-${Math.random()}`,
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
        type: fileType,
      };
    });

    return { attachments };
  }

  // TODO: Implement typing indicators via WebSocket
  // @Post('channel/:channelId/typing')
  // @Get('channel/:channelId/typing')
}


