import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, world!',
    maxLength: 4000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({
    description: 'Channel ID',
    example: 'ch_123456789',
  })
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Reply to message ID',
    example: 'msg_123456789',
  })
  @IsString()
  @IsOptional()
  replyToId?: string;
}


