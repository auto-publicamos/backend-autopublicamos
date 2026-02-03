import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleDriveFoldersDto {
  @ApiProperty({
    required: false,
    description: 'ID of the folder to list subfolders from',
    example: '1A2B3C...',
  })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  pageSize?: number;
}
