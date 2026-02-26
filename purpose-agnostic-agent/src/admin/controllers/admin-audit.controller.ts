import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AuditLogService } from '../services/audit-log.service.js';
import {
  AuditLogsResponseDto,
  AuditLogDto,
} from '../dto/audit-log-response.dto.js';
import { UnauthorizedErrorDto } from '../dto/persona-response.dto.js';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth()
@Controller('admin/audit')
@UseGuards(AdminAuthGuard)
export class AdminAuditController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * GET /admin/audit/logs - List audit logs with filtering
   * Requirements: 7.3
   */
  @Get('logs')
  @ApiOperation({
    summary: 'List audit logs with filtering',
    description:
      'Retrieves audit logs with optional filtering by action type, user ID, and date range. Requires admin authentication via Bearer token.',
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    type: String,
    description: 'Filter by action type (e.g., PERSONA_CREATE, LOGIN_SUCCESS)',
    example: 'PERSONA_CREATE',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by admin user ID',
    example: 'admin-123',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO 8601 format)',
    example: '2024-01-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: AuditLogsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters (e.g., invalid date format)',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid date format for startDate',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid authentication token',
    type: UnauthorizedErrorDto,
  })
  async getLogs(
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogsResponseDto> {
    // Parse and validate date parameters
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format for startDate. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)',
        );
      }
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format for endDate. Use ISO 8601 format (e.g., 2024-01-31T23:59:59Z)',
        );
      }
    }

    // Validate date range
    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    // Query audit logs with filters
    const logs = await this.auditLogService.queryLogs({
      actionType,
      userId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    // Transform to DTOs
    const logDtos: AuditLogDto[] = logs.map((log) => ({
      id: log.id,
      adminUserId: log.admin_user_id,
      actionType: log.action_type,
      entityType: log.entity_type,
      entityId: log.entity_id,
      details: log.details,
      ipAddress: log.ip_address,
      timestamp: log.timestamp,
    }));

    return {
      logs: logDtos,
      total: logDtos.length,
    };
  }
}
