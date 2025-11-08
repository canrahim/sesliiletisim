import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageDto {
  @ApiProperty({
    description: 'Message ID',
    example: 'msg_123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, world!',
  })
  content: string;

  @ApiProperty({
    description: 'Channel ID',
    example: 'ch_123456789',
  })
  channelId: string;

  @ApiProperty({
    description: 'Author user ID',
    example: 'usr_123456789',
  })
  authorId: string;

  @ApiPropertyOptional({
    description: 'Reply to message ID',
    example: 'msg_987654321',
  })
  replyToId?: string;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs',
    type: [String],
  })
  attachments?: string[];

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Message update timestamp',
    example: '2025-01-15T10:35:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Deletion timestamp (soft delete)',
    example: '2025-01-15T11:00:00Z',
  })
  deletedAt?: Date;
}


