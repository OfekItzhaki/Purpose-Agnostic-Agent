export class KnowledgeCategoryResponseDto {
  id!: string;
  name!: string;
  description?: string;
  document_count!: number;
  created_at!: Date;
  updated_at!: Date;

  constructor(partial: Partial<KnowledgeCategoryResponseDto>) {
    Object.assign(this, partial);
  }
}
