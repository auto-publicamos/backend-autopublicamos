import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray } from 'class-validator';

export class GenerateDesignDto {
  @ApiProperty({
    description: 'Array of image URLs to process',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
  })
  @IsString({ each: true })
  @IsNotEmpty()
  imageUrls: string[];

  @ApiProperty({
    description: 'Array of 35 integers acting as indices mapping imageUrls to slides',
    example: [0, 0, 1, 1, 2, 2, ...Array(29).fill(0)],
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  patron: number[];
}
