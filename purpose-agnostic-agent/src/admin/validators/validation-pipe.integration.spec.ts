import { ValidationPipe } from '@nestjs/common';
import { CreateAdminPersonaDto } from '../dto/create-admin-persona.dto.js';
import { CreateKnowledgeCategoryDto } from '../dto/create-knowledge-category.dto.js';
import { UpdateKnowledgeCategoryDto } from '../dto/update-knowledge-category.dto.js';

describe('ValidationPipe Integration', () => {
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  });

  describe('CreateAdminPersonaDto', () => {
    it('should validate and transform valid persona data', async () => {
      const validData = {
        id: 'tech-support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: CreateAdminPersonaDto,
      });

      expect(result).toBeInstanceOf(CreateAdminPersonaDto);
      expect(result.id).toBe('tech-support');
    });

    it('should reject persona with invalid id format (uppercase)', async () => {
      const invalidData = {
        id: 'Tech-Support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: CreateAdminPersonaDto,
        }),
      ).rejects.toThrow();
    });

    it('should reject persona with invalid id format (special characters)', async () => {
      const invalidData = {
        id: 'tech_support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: CreateAdminPersonaDto,
        }),
      ).rejects.toThrow();
    });

    it('should strip non-whitelisted properties', async () => {
      const dataWithExtra = {
        id: 'tech-support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
        extraField: 'should be removed',
      };

      await expect(
        validationPipe.transform(dataWithExtra, {
          type: 'body',
          metatype: CreateAdminPersonaDto,
        }),
      ).rejects.toThrow(); // forbidNonWhitelisted throws error
    });

    it('should transform temperature to number', async () => {
      const dataWithStringNumber = {
        id: 'tech-support',
        name: 'Technical Support',
        description: 'Helps with technical issues',
        knowledgeCategory: 'support',
        temperature: '0.7' as any,
      };

      const result = await validationPipe.transform(dataWithStringNumber, {
        type: 'body',
        metatype: CreateAdminPersonaDto,
      });

      expect(typeof result.temperature).toBe('number');
      expect(result.temperature).toBe(0.7);
    });
  });

  describe('CreateKnowledgeCategoryDto', () => {
    it('should validate and transform valid category data', async () => {
      const validData = {
        name: 'tech-support',
        description: 'Technical support category',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: CreateKnowledgeCategoryDto,
      });

      expect(result).toBeInstanceOf(CreateKnowledgeCategoryDto);
      expect(result.name).toBe('tech-support');
    });

    it('should accept category names with uppercase letters', async () => {
      const validData = {
        name: 'Tech-Support',
        description: 'Technical support category',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: CreateKnowledgeCategoryDto,
      });

      expect(result.name).toBe('Tech-Support');
    });

    it('should reject category with invalid name format (underscore)', async () => {
      const invalidData = {
        name: 'tech_support',
        description: 'Technical support category',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: CreateKnowledgeCategoryDto,
        }),
      ).rejects.toThrow();
    });

    it('should reject category with invalid name format (special characters)', async () => {
      const invalidData = {
        name: 'tech@support',
        description: 'Technical support category',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: CreateKnowledgeCategoryDto,
        }),
      ).rejects.toThrow();
    });
  });

  describe('UpdateKnowledgeCategoryDto', () => {
    it('should validate and transform valid update data', async () => {
      const validData = {
        name: 'new-category-name',
        description: 'Updated description',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: UpdateKnowledgeCategoryDto,
      });

      expect(result).toBeInstanceOf(UpdateKnowledgeCategoryDto);
      expect(result.name).toBe('new-category-name');
    });

    it('should allow partial updates', async () => {
      const validData = {
        description: 'Updated description only',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: UpdateKnowledgeCategoryDto,
      });

      expect(result.description).toBe('Updated description only');
      expect(result.name).toBeUndefined();
    });

    it('should reject invalid category name format in updates', async () => {
      const invalidData = {
        name: 'invalid_name',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: UpdateKnowledgeCategoryDto,
        }),
      ).rejects.toThrow();
    });
  });
});
