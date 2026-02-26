import { Injectable, NotFoundException } from '@nestjs/common';
import { PersonaService } from '../../persona/persona.service.js';
import { RAGService } from '../../rag/rag.service.js';
import { ModelRouterService } from '../../model-router/model-router.service.js';
import { RAGSystemPromptService } from '../../common/rag-system-prompt.service.js';
import { StructuredLogger } from '../../common/logger.service.js';

export interface TestPersonaRequest {
  personaId: string;
  query: string;
}

export interface RetrievedChunk {
  content: string;
  sourcePath: string;
  category: string;
  relevanceScore: number;
}

export interface TestPersonaResponse {
  answer: string;
  retrievedChunks: RetrievedChunk[];
  modelProvider: string;
  tokensUsed: number;
  latencyMs: number;
}

@Injectable()
export class AdminPersonaTestService {
  constructor(
    private readonly personaService: PersonaService,
    private readonly ragService: RAGService,
    private readonly modelRouter: ModelRouterService,
    private readonly ragSystemPrompt: RAGSystemPromptService,
    private readonly logger: StructuredLogger,
  ) {}

  /**
   * Test a persona with a query without creating a persistent session
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
   */
  async testPersona(request: TestPersonaRequest): Promise<TestPersonaResponse> {
    const { personaId, query } = request;

    // Retrieve persona
    // Requirement 12.1: Send query to persona
    const persona = await this.personaService.getPersona(personaId);
    if (!persona) {
      throw new NotFoundException(`Persona with id '${personaId}' not found`);
    }

    this.logger.logWithContext('info', 'Testing persona', {
      personaId,
      query,
    });

    const startTime = Date.now();

    // Retrieve knowledge chunks using RAG
    // Requirement 12.3: Display knowledge chunks retrieved
    const ragResults = await this.ragService.search(query, {
      category: persona.knowledgeCategory,
      topK: 5,
      minScore: 0.7,
    });

    // Map RAG results to retrieved chunks with relevance scores
    // Requirement 12.4: Display relevance scores
    const retrievedChunks: RetrievedChunk[] = ragResults.map((result) => ({
      content: result.content,
      sourcePath: result.metadata.sourcePath,
      category: result.metadata.category,
      relevanceScore: result.score,
    }));

    // Construct context from RAG results
    const context = ragResults
      .map((result, idx) => `[${idx + 1}] ${result.content}`)
      .join('\n\n');

    // Build system prompt and user message
    const systemPrompt = this.ragSystemPrompt.buildSystemPrompt(
      persona.extraInstructions,
    );
    const userMessage = this.ragSystemPrompt.buildUserMessage(context, query);

    // Generate response using model router
    // Requirement 12.6: Display model provider and token usage
    const llmResponse = await this.modelRouter.generate({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: persona.temperature || 0.7,
      maxTokens: persona.maxTokens || 1000,
    });

    const totalLatency = Date.now() - startTime;

    this.logger.logWithContext('info', 'Persona test completed', {
      personaId,
      modelUsed: llmResponse.modelUsed,
      tokensUsed: llmResponse.tokensUsed,
      chunksRetrieved: retrievedChunks.length,
      latencyMs: totalLatency,
    });

    // Requirement 12.5: Test without creating persistent sessions
    // Note: This method does NOT interact with SessionRepository at all
    return {
      answer: llmResponse.content,
      retrievedChunks,
      modelProvider: llmResponse.modelUsed,
      tokensUsed: llmResponse.tokensUsed,
      latencyMs: totalLatency,
    };
  }
}
