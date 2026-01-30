import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleDriveImagesDto {
  @ApiProperty({
    required: false,
    description: 'ID of the folder to list images from',
    example: '1A2B3C...',
  })
  @IsOptional()
  @IsString()
  folderId?: string;
}
