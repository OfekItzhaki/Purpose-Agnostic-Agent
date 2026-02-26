import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsCategoryName } from '../validators/index.js';

export class CreateKnowledgeCategoryDto {
  @ApiProperty({
    description:
      'Unique category name (alphanumeric characters and hyphens only)',
    example: 'technical',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @IsCategoryName()
  name!: string;

  @ApiProperty({
    description: 'Optional description of the category',
    example: 'Technical documentation and guides',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
