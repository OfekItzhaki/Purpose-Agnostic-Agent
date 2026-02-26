import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ConflictException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLog } from '../decorators/audit-log.decorator.js';
import { ActionType, EntityType } from '../services/audit-log.service.js';
import { AdminPersonaService } from '../services/admin-persona.service.js';
import { AdminPersonaTestService } from '../services/admin-persona-test.service.js';
import { PersonaService } from '../../persona/persona.service.js';
import { CreateAdminPersonaDto } from '../dto/create-admin-persona.dto.js';
import { UpdateAdminPersonaDto } from '../dto/update-admin-persona.dto.js';
import {
  TestPersonaDto,
  TestPersonaResponseDto,
} from '../dto/test-persona.dto.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';
import {
  PaginatedPersonasDto,
  PersonaWithDetailsDto,
  DeletePersonaResponseDto,
  ValidationErrorDto,
  PersonaInUseErrorDto,
  UnauthorizedErrorDto,
  NotFoundErrorDto,
  ConflictErrorDto,
} from '../dto/persona-response.dto.js';

@ApiTags('Admin - Personas')
@ApiBearerAuth()
@Controller('admin/personas')
@UseGuards(AdminAuthGuard)
export class AdminPersonaController {
  constructor(
    private readonly adminPersonaService: AdminPersonaService,
    private readonly adminPersonaTestService: AdminPersonaTestService,
    private readonly personaService: PersonaService,
  ) {}

  /**
   * GET /admin/personas - List all personas with pagination
   * Requirements: 2.3, 10.1
   */
  @Get()
  @ApiOperation({
    summary: 'List all personas with pagination',
    description:
      'Retrieves a paginated list of all personas in the system. Requires admin authentication via Bearer token.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1, minimum: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, minimum: 1, maximum: 100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Personas retrieved successfully',
    type: PaginatedPersonasDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid pagination parameters (page < 1 or pageSize not in range 1-100)',
    type: ErrorResponseDto,
    schema: {
      example: {
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Page size must be between 1 and 100',
        instance: '/admin/personas',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponseDto,
    schema: {
      example: {
        type: 'https://api.example.com/errors/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Invalid or missing authentication token',
        instance: '/admin/personas',
      },
    },
  })
  async listPersonas(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;

    if (isNaN(pageNum) || isNaN(pageSizeNum)) {
      throw new BadRequestException('Page and pageSize must be valid numbers');
    }

    return this.adminPersonaService.getAllPersonas(pageNum, pageSizeNum);
  }

  /**
   * GET /admin/personas/:id - Get persona details
   * Requirements: 2.4, 10.1
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get persona details by ID',
    description:
      'Retrieves complete configuration details for a specific persona. Requires admin authentication via Bearer token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique persona identifier',
    example: 'tech-support',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona retrieved successfully',
    type: PersonaWithDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getPersona(@Param('id') id: string) {
    return this.adminPersonaService.getPersonaById(id);
  }

  /**
   * POST /admin/personas - Create new persona
   * Requirements: 2.1, 2.2, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1
   *
   * Example curl command:
   * ```bash
   * curl -X POST http://localhost:3000/admin/personas \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "id": "tech-support",
   *     "name": "Technical Support Agent",
   *     "description": "Helps users with technical issues and troubleshooting",
   *     "extraInstructions": "Be concise and technical. Use bullet points when appropriate.",
   *     "knowledgeCategory": "support",
   *     "temperature": 0.7,
   *     "maxTokens": 2000
   *   }'
   * ```
   */
  @Post()
  @AuditLog({
    actionType: ActionType.PERSONA_CREATE,
    entityType: EntityType.PERSONA,
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Create a new persona',
    description:
      'Creates a new persona with the specified configuration. Validates all fields including temperature range (0.0-1.0), max tokens (positive integer), knowledge category existence, and persona ID format (lowercase, alphanumeric, hyphens). Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiBody({
    type: CreateAdminPersonaDto,
    examples: {
      'tech-support': {
        summary: 'Technical Support Persona',
        description: 'A persona configured for technical support queries',
        value: {
          id: 'tech-support',
          name: 'Technical Support Agent',
          description: 'Helps users with technical issues and troubleshooting',
          extraInstructions:
            'Be concise and technical. Use bullet points when appropriate.',
          knowledgeCategory: 'support',
          temperature: 0.7,
          maxTokens: 2000,
        },
      },
      'sales-assistant': {
        summary: 'Sales Assistant Persona',
        description: 'A persona configured for sales and customer inquiries',
        value: {
          id: 'sales-assistant',
          name: 'Sales Assistant',
          description:
            'Assists customers with product information and purchasing decisions',
          extraInstructions:
            'Be friendly and persuasive. Focus on benefits and value.',
          knowledgeCategory: 'sales',
          temperature: 0.8,
          maxTokens: 1500,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Persona created successfully',
    type: PersonaWithDetailsDto,
    schema: {
      example: {
        id: 'tech-support',
        name: 'Technical Support Agent',
        description: 'Helps users with technical issues and troubleshooting',
        extraInstructions:
          'Be concise and technical. Use bullet points when appropriate.',
        knowledgeCategory: 'support',
        temperature: 0.7,
        maxTokens: 2000,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid persona data - Validation failed for one or more fields',
    type: ValidationErrorDto,
    schema: {
      example: {
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Validation failed for one or more fields',
        instance: '/admin/personas',
        errors: [
          {
            field: 'temperature',
            message: 'temperature must not be greater than 1',
          },
          {
            field: 'id',
            message:
              'id must contain only lowercase letters, numbers, and hyphens',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Persona with this ID already exists',
    type: ConflictErrorDto,
    schema: {
      example: {
        type: 'https://api.example.com/errors/conflict',
        title: 'Resource Conflict',
        status: 409,
        detail: "Persona with id 'tech-support' already exists",
        instance: '/admin/personas',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async createPersona(@Body() dto: CreateAdminPersonaDto) {
    // Validate persona configuration
    const validation = await this.adminPersonaService.validatePersonaConfig({
      id: dto.id,
      name: dto.name,
      description: dto.description,
      extraInstructions: dto.extraInstructions,
      knowledgeCategory: dto.knowledgeCategory,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Persona validation failed',
        errors: validation.errors,
      });
    }

    // Check if persona already exists
    try {
      await this.adminPersonaService.getPersonaById(dto.id);
      throw new ConflictException(`Persona with id '${dto.id}' already exists`);
    } catch (error: any) {
      // If not found, continue with creation
      if (error.status !== 404) {
        throw error;
      }
    }

    // Create persona
    const persona = await this.personaService.createPersona({
      id: dto.id,
      name: dto.name,
      description: dto.description,
      extraInstructions: dto.extraInstructions,
      knowledgeCategory: dto.knowledgeCategory,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    return persona;
  }

  /**
   * PUT /admin/personas/:id - Update persona
   * Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 10.1
   *
   * Example curl command:
   * ```bash
   * curl -X PUT http://localhost:3000/admin/personas/tech-support \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "temperature": 0.8,
   *     "maxTokens": 2500
   *   }'
   * ```
   */
  @Put(':id')
  @AuditLog({
    actionType: ActionType.PERSONA_UPDATE,
    entityType: EntityType.PERSONA,
    entityIdParam: 'id',
    includeBody: true,
    includeResult: true,
  })
  @ApiOperation({
    summary: 'Update an existing persona',
    description:
      'Updates an existing persona configuration. All fields are optional. Validates temperature range (0.0-1.0), max tokens (positive integer), and knowledge category existence. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique persona identifier',
    example: 'tech-support',
    type: String,
  })
  @ApiBody({
    type: UpdateAdminPersonaDto,
    examples: {
      'update-temperature': {
        summary: 'Update temperature only',
        description:
          'Adjust the temperature parameter for more creative responses',
        value: {
          temperature: 0.9,
        },
      },
      'update-multiple': {
        summary: 'Update multiple fields',
        description: 'Update several persona configuration fields at once',
        value: {
          name: 'Senior Technical Support Agent',
          temperature: 0.8,
          maxTokens: 2500,
          extraInstructions:
            'Be very detailed and provide step-by-step instructions.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Persona updated successfully',
    type: PersonaWithDetailsDto,
    schema: {
      example: {
        id: 'tech-support',
        name: 'Senior Technical Support Agent',
        description: 'Helps users with technical issues and troubleshooting',
        extraInstructions:
          'Be very detailed and provide step-by-step instructions.',
        knowledgeCategory: 'support',
        temperature: 0.8,
        maxTokens: 2500,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:20:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid persona data - Validation failed for one or more fields',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async updatePersona(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPersonaDto,
  ) {
    // Verify persona exists
    await this.adminPersonaService.getPersonaById(id);

    // Validate updates
    const validation = await this.adminPersonaService.validatePersonaConfig({
      id,
      ...dto,
    });

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Persona validation failed',
        errors: validation.errors,
      });
    }

    // Update persona
    const updated = await this.personaService.updatePersona(id, {
      name: dto.name,
      description: dto.description,
      extraInstructions: dto.extraInstructions,
      knowledgeCategory: dto.knowledgeCategory,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });

    return updated;
  }

  /**
   * DELETE /admin/personas/:id - Delete persona
   * Requirements: 2.6, 2.7, 10.1
   */
  @Delete(':id')
  @AuditLog({
    actionType: ActionType.PERSONA_DELETE,
    entityType: EntityType.PERSONA,
    entityIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Delete a persona',
    description:
      'Deletes a persona from the system. Checks if the persona is currently in use by active chat sessions and prevents deletion if so. Requires admin authentication via Bearer token. This action is logged in the audit log.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique persona identifier',
    example: 'tech-support',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona deleted successfully',
    type: DeletePersonaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Persona is in use and cannot be deleted',
    type: PersonaInUseErrorDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async deletePersona(@Param('id') id: string) {
    // Verify persona exists
    await this.adminPersonaService.getPersonaById(id);

    // Check if persona is in use
    const activeSessionCount =
      await this.adminPersonaService.checkPersonaInUse(id);

    if (activeSessionCount > 0) {
      throw new BadRequestException({
        message: `Cannot delete persona '${id}' as it is currently in use by ${activeSessionCount} active chat session(s)`,
        activeSessionCount,
      });
    }

    // Delete persona
    await this.personaService.deletePersona(id);

    return {
      message: `Persona '${id}' deleted successfully`,
      id,
    };
  }

  /**
   * POST /admin/personas/:id/test - Test persona with a query
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.6
   *
   * Example curl command:
   * ```bash
   * curl -X POST http://localhost:3000/admin/personas/tech-support/test \
   *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "query": "How do I deploy a Kubernetes cluster?"
   *   }'
   * ```
   */
  @Post(':id/test')
  @ApiOperation({
    summary: 'Test a persona with a query',
    description:
      'Tests a persona with a sample query without creating a persistent chat session. Returns the generated answer, retrieved knowledge chunks with relevance scores, and model usage metrics. Requires admin authentication via Bearer token.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique persona identifier',
    example: 'tech-support',
    type: String,
  })
  @ApiBody({
    type: TestPersonaDto,
    examples: {
      'kubernetes-query': {
        summary: 'Kubernetes deployment question',
        value: {
          query: 'How do I deploy a Kubernetes cluster?',
        },
      },
      'troubleshooting-query': {
        summary: 'Troubleshooting question',
        value: {
          query:
            'My application is crashing with error code 500. What should I check?',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Persona test completed successfully',
    type: TestPersonaResponseDto,
    schema: {
      example: {
        answer:
          'To deploy a Kubernetes cluster, you need to follow these steps:\n\n1. Install kubectl and kubeadm\n2. Initialize the control plane with kubeadm init\n3. Configure your network plugin\n4. Join worker nodes to the cluster\n\nFor detailed instructions, refer to the official Kubernetes documentation.',
        retrievedChunks: [
          {
            content:
              'Kubernetes is a container orchestration platform that automates deployment, scaling, and management of containerized applications...',
            sourcePath: 'knowledge/general/kubernetes-guide.txt',
            category: 'general',
            relevanceScore: 0.89,
          },
          {
            content:
              'To initialize a Kubernetes cluster, use the kubeadm init command. This will set up the control plane components...',
            sourcePath: 'knowledge/general/kubernetes-setup.txt',
            category: 'general',
            relevanceScore: 0.85,
          },
        ],
        modelProvider: 'openai/gpt-4',
        tokensUsed: 450,
        latencyMs: 1250,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    type: NotFoundErrorDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - Query is required',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async testPersona(@Param('id') id: string, @Body() dto: TestPersonaDto) {
    // Test the persona with the provided query
    const result = await this.adminPersonaTestService.testPersona({
      personaId: id,
      query: dto.query,
    });

    return result;
  }
}
