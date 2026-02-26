import { IsString, IsOptional } from 'class-validator';
import { IsCategoryName } from '../validators/index.js';

export class UpdateKnowledgeCategoryDto {
  @IsString()
  @IsOptional()
  @IsCategoryName()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
