import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminCategoryController } from './admin-category.controller.js';
import { AdminKnowledgeCategoryService } from '../services/admin-knowledge-category.service.js';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { CreateKnowledgeCategoryDto } from '../dto/create-knowledge-category.dto.js';

describe('AdminCategoryController', () => {
  let controller: AdminCategoryController;
  let service: jest.Mocked<AdminKnowledgeCategoryService>;

  const mockCategory = {
    id: 'cat-123',
    name: 'test-category',
    description: 'Test description',
    document_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      listCategories: jest.fn(),
      createCategory: jest.fn(),
      getCategoryById: jest.fn(),
      deleteCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCategoryController],
      providers: [
        {
          provide: AdminKnowledgeCategoryService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminCategoryController>(AdminCategoryController);
    service = module.get(AdminKnowledgeCategoryService);
  });

  describe('listCategories', () => {
    it('should return list of categories with document counts', async () => {
      const categories = [mockCategory];
      service.listCategories.mockResolvedValue(categories);

      const result = await controller.listCategories();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockCategory.id,
        name: mockCategory.name,
        document_count: mockCategory.document_count,
      });
      expect(service.listCategories).toHaveBeenCalled();
    });

    it('should return empty array when no categories exist', async () => {
      service.listCategories.mockResolvedValue([]);

      const result = await controller.listCategories();

      expect(result).toEqual([]);
      expect(service.listCategories).toHaveBeenCalled();
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const dto: CreateKnowledgeCategoryDto = {
        name: 'new-category',
        description: 'New description',
      };
      service.createCategory.mockResolvedValue(mockCategory);

      const result = await controller.createCategory(dto);

      expect(result).toMatchObject({
        id: mockCategory.id,
        name: mockCategory.name,
      });
      expect(service.createCategory).toHaveBeenCalledWith(
        dto.name,
        dto.description,
      );
    });

    it('should create category without description', async () => {
      const dto: CreateKnowledgeCategoryDto = {
        name: 'new-category',
      };
      service.createCategory.mockResolvedValue(mockCategory);

      const result = await controller.createCategory(dto);

      expect(result).toBeDefined();
      expect(service.createCategory).toHaveBeenCalledWith(dto.name, undefined);
    });

    it('should throw ConflictException when category name already exists', async () => {
      const dto: CreateKnowledgeCategoryDto = {
        name: 'existing-category',
      };
      service.createCategory.mockRejectedValue(
        new ConflictException(
          "Category with name 'existing-category' already exists",
        ),
      );

      await expect(controller.createCategory(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.createCategory).toHaveBeenCalledWith(dto.name, undefined);
    });

    it('should throw BadRequestException for invalid category name', async () => {
      const dto: CreateKnowledgeCategoryDto = {
        name: 'invalid name!',
      };
      service.createCategory.mockRejectedValue(
        new BadRequestException(
          'Category name must contain only alphanumeric characters and hyphens',
        ),
      );

      await expect(controller.createCategory(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete an empty category', async () => {
      service.getCategoryById.mockResolvedValue(mockCategory as any);
      service.deleteCategory.mockResolvedValue(undefined);

      const result = await controller.deleteCategory('cat-123');

      expect(result).toEqual({
        message: "Category 'test-category' deleted successfully",
        id: 'cat-123',
      });
      expect(service.getCategoryById).toHaveBeenCalledWith('cat-123');
      expect(service.deleteCategory).toHaveBeenCalledWith('cat-123');
    });

    it('should throw NotFoundException when category does not exist', async () => {
      service.getCategoryById.mockRejectedValue(
        new NotFoundException("Category with id 'nonexistent' not found"),
      );

      await expect(controller.deleteCategory('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getCategoryById).toHaveBeenCalledWith('nonexistent');
      expect(service.deleteCategory).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when category has documents', async () => {
      const categoryWithDocs = { ...mockCategory, document_count: 5 };
      service.getCategoryById.mockResolvedValue(categoryWithDocs as any);
      service.deleteCategory.mockRejectedValue(
        new BadRequestException(
          "Cannot delete category 'test-category' because it has 5 associated document(s). Please delete or reassign the documents first.",
        ),
      );

      await expect(controller.deleteCategory('cat-123')).rejects.toThrow(
        BadRequestException,
      );
      expect(service.getCategoryById).toHaveBeenCalledWith('cat-123');
      expect(service.deleteCategory).toHaveBeenCalledWith('cat-123');
    });
  });
});
