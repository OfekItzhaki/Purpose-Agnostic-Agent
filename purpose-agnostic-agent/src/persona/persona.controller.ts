import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { PersonaService } from './persona.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { Persona } from './interfaces/persona.interface';

@ApiTags('personas')
@Controller('personas')
export class PersonaController {
  constructor(private readonly personaService: PersonaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new persona',
    description: 'Create a new agent persona with custom system prompt and knowledge category.',
  })
  @ApiBody({ type: CreatePersonaDto })
  @ApiResponse({
    status: 201,
    description: 'Persona created successfully',
    schema: {
      example: {
        id: 'tech-support',
        name: 'Technical Support Agent',
        description: 'Helps users with technical issues',
        systemPrompt: 'You are a helpful technical support agent...',
        knowledgeCategory: 'support',
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid persona data',
    schema: {
      example: {
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Validation failed',
      },
    },
  })
  async createPersona(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    createDto: CreatePersonaDto,
  ): Promise<Persona> {
    return this.personaService.createPersona(createDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing persona',
    description: 'Update persona properties. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Persona ID',
    example: 'tech-support',
  })
  @ApiBody({
    schema: {
      example: {
        name: 'Updated Technical Support Agent',
        temperature: 0.8,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Persona updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    schema: {
      example: {
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Persona with id "unknown-agent" not found',
      },
    },
  })
  async updatePersona(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    updateDto: Partial<CreatePersonaDto>,
  ): Promise<Persona> {
    return this.personaService.updatePersona(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a persona',
    description: 'Permanently delete an agent persona.',
  })
  @ApiParam({
    name: 'id',
    description: 'Persona ID',
    example: 'tech-support',
  })
  @ApiResponse({
    status: 204,
    description: 'Persona deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
    schema: {
      example: {
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Persona with id "unknown-agent" not found',
      },
    },
  })
  async deletePersona(@Param('id') id: string): Promise<void> {
    await this.personaService.deletePersona(id);
  }
}
