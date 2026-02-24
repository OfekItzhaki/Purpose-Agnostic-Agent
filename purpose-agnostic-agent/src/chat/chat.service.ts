import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, Citation } from './dto/chat-response.dto';
import { PersonaService } from '../persona/persona.service';
import { RAGService } from '../rag/rag.service';
import { ModelRouterService } from '../model-router/model-router.service';
import type { SessionRepository } from './interfaces/session.repository.interface';
import { StructuredLogger } from '../common/logger.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly personaService: PersonaService,
    private readonly ragService: RAGService,
    private readonly modelRouter: ModelRouterService,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    private readonly logger: StructuredLogger,
  ) {}

  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    const { agent_id, question, sessionId } = request;

    // Retrieve persona
    const persona = await this.personaService.getPersona(agent_id);
    if (!persona) {
      throw new NotFoundException(`Persona with agent_id '${agent_id}' not found`);
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        throw new NotFoundException(`Session '${sessionId}' not found`);
      }
    } else {
      session = await this.sessionRepository.create(agent_id);
    }

    // Store user message
    await this.sessionRepository.addMessage(session.id, 'user', question);

    // Query RAG system with persona's knowledge category
    const ragResults = await this.ragService.search(question, {
      category: persona.knowledgeCategory,
      topK: 5,
      minScore: 0.7,
    });

    // Construct context from RAG results
    const context = ragResults
      .map((result, idx) => `[${idx + 1}] ${result.content}`)
      .join('\n\n');

    // Construct LLM request with system prompt and context
    const systemPrompt = persona.systemPrompt;
    const userMessage = context
      ? `Context from knowledge base:\n${context}\n\nUser question: ${question}`
      : `User question: ${question}`;

    // Call Model Router
    const llmResponse = await this.modelRouter.generate({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: persona.temperature || 0.7,
      maxTokens: persona.maxTokens || 1000,
    });

    // Store assistant response
    await this.sessionRepository.addMessage(
      session.id,
      'assistant',
      llmResponse.content,
      llmResponse.modelUsed,
      llmResponse.tokensUsed,
    );

    // Prepare citations
    const citations: Citation[] = ragResults.map((result) => ({
      sourcePath: result.metadata.sourcePath,
      content: result.content,
      score: result.score,
    }));

    this.logger.logWithContext('info', 'Chat request completed', {
      agent_id,
      session_id: session.id,
      model_used: llmResponse.modelUsed,
      citations_count: citations.length,
    });

    return {
      answer: llmResponse.content,
      citations,
      modelUsed: llmResponse.modelUsed,
      sessionId: session.id,
    };
  }
}
