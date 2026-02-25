import { Controller, Post, Get, Body, ValidationPipe, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { PersonaService } from '../persona/persona.service';
import { PersonaInfo } from '../persona/interfaces/persona.interface';

@ApiTags('chat')
@Controller()
@UseGuards(ThrottlerGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly personaService: PersonaService,
  ) {}

  @Post('chat')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Send a chat message to an agent',
    description:
      'Send a question to a specific agent persona. The agent will use its knowledge base and system prompt to provide an answer with citations.',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Chat response with answer and citations',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
    schema: {
      example: {
        type: 'https://httpstatuses.com/400',
        title: 'Bad Request',
        status: 400,
        detail: 'Validation failed',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Agent persona not found',
    schema: {
      example: {
        type: 'https://httpstatuses.com/404',
        title: 'Not Found',
        status: 404,
        detail: 'Persona with id "unknown-agent" not found',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
    schema: {
      example: {
        type: 'https://httpstatuses.com/429',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded. Please try again later.',
      },
    },
  })
  async chat(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    request: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    return this.chatService.chat(request);
  }

  @Get('agents')
  @ApiOperation({
    summary: 'List all available agent personas',
    description: 'Returns a list of all configured agent personas with their metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of agent personas',
    schema: {
      example: [
        {
          id: 'tech-support',
          name: 'Technical Support Agent',
          description: 'Helps users with technical issues',
          knowledgeCategory: 'support',
        },
      ],
    },
  })
  async listAgents(): Promise<PersonaInfo[]> {
    return this.personaService.listPersonas();
  }
}
