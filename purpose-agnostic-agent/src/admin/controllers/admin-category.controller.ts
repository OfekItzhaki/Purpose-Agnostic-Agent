import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLog } from '../decorators/audit-log.decorator.js';
import { ActionType, EntityType } from '../services/audit-log.service.js';
import { AdminKnowledgeCategoryService } from '../services/admin-knowledge-category.service.js';
import { CreateKnowledgeCategoryDto } from '../dto/create-knowledge-category.dto.js';
import { KnowledgeCategoryResponseDto } from '../dto/knowledge-category-response.dto.js';
import {
  UnauthorizedErrorDto,
  NotFoundErrorDto,
} from '../dto/persona-response.dto.js';

@ApiTags('Admin - Categories')
@ApiBearerAuth()
@Controller('admin/categories')
@UseGuards(AdminAuthGuard)
export class AdminCategoryController {
  constructor(
    private readonly adminKnowledgeCategoryService: AdminKnowledgeCategoryService,
  ) {}

  /**
   * GET /admin/categories - List all categories with document counts
   * Requirements: 5.1, 5.3
   */
  @Get()
  @ApiOperation({
    summary: 'List all knowledge categories',
    description:
      'Retrieves a list of all knowledge categories with document counts. Document counts are synchronized with actual documents in the database. Requires admin authentication via Bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: [KnowledgeCategoryResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async listCategories(): Promise<KnowledgeCategoryResponseDto[]> {
    const categories =
      await this.adminKnowledgeCategoryService.listCategories();
    return categories.map((cat) => new KnowledgeCategoryResponseDto(cat));
  }

  /**
   * POST /admin/categories - Create new category
   * Requirements: 5.1, 5.2
   *
   * Example curl command:
   * ```bash
   * curl -X POST http://localhost:3000/admin/categories \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "name": "technical",
   *     "description": "Technical documentation and guides"
   *   }'
   * ```
   */
  @Post()
  @AuditLog({
    actionType: ActionType.CATEGORY_CREATE,
    entityType: EntityType.KNOWLEDGE_CATEGORY,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Create a new knowledge category',
    description:
      'Creates a new knowledge category with a unique name. Validates that the category name is not empty and contains only alphanumeric characters and hyphens. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiBody({
    type: CreateKnowledgeCategoryDto,
    examples: {
      'technical-category': {
        summary: 'Technical category',
        value: {
          name: 'technical',
          description: 'Technical documentation and guides',
        },
      },
      'support-category': {
        summary: 'Support category',
        value: {
          name: 'support',
          description: 'Customer support articles and FAQs',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: KnowledgeCategoryResponseDto,
    schema: {
      example: {
        id: 'cat-123',
        name: 'technical',
        description: 'Technical documentation and guides',
        documentCount: 0,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid category data - Name is empty or contains invalid characters',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Category name must contain only alphanumeric characters and hyphens',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: "Category with name 'general' already exists",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateKnowledgeCategoryDto,
  ): Promise<KnowledgeCategoryResponseDto> {
    const category = await this.adminKnowledgeCategoryService.createCategory(
      dto.name,
      dto.description,
    );
    return new KnowledgeCategoryResponseDto(category);
  }

  /**
   * DELETE /admin/categories/:id - Delete category with validation
   * Requirements: 5.4, 5.5, 5.6
   */
  @Delete(':id')
  @AuditLog({
    actionType: ActionType.CATEGORY_DELETE,
    entityType: EntityType.KNOWLEDGE_CATEGORY,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Delete a knowledge category',
    description:
      'Deletes a knowledge category. Validates that the category has no associated documents before deletion. If documents exist, deletion is prevented and an error is returned. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique category identifier',
    example: 'cat-123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
    schema: {
      example: {
        message: "Category 'general' deleted successfully",
        id: 'cat-123',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Category has associated documents and cannot be deleted',
    schema: {
      example: {
        statusCode: 400,
        message:
          "Cannot delete category 'general' because it has 5 associated document(s). Please delete or reassign the documents first.",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async deleteCategory(@Param('id') id: string) {
    const category =
      await this.adminKnowledgeCategoryService.getCategoryById(id);
    await this.adminKnowledgeCategoryService.deleteCategory(id);
    return {
      message: `Category '${category.name}' deleted successfully`,
      id,
    };
  }
}
