import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, Citation } from './dto/chat-response.dto';
import { PersonaService } from '../persona/persona.service';
import { RAGService } from '../rag/rag.service';
import { ModelRouterService } from '../model-router/model-router.service';
import { RAGSystemPromptService } from '../common/rag-system-prompt.service';
import type { SessionRepository } from './interfaces/session.repository.interface';
import { StructuredLogger } from '../common/logger.service';

@Injectable()
export class ChatService {
  private readonly enableSelfCheck: boolean;

  constructor(
    private readonly personaService: PersonaService,
    private readonly ragService: RAGService,
    private readonly modelRouter: ModelRouterService,
    private readonly ragSystemPrompt: RAGSystemPromptService,
    private readonly configService: ConfigService,
    @Inject('SessionRepository')
    private readonly sessionRepository: SessionRepository,
    private readonly logger: StructuredLogger,
  ) {
    // Optional self-check feature (togglable via environment variable)
    this.enableSelfCheck = this.configService.get<boolean>(
      'RAG_SELF_CHECK_ENABLED',
      false,
    );
  }

  async chat(request: ChatRequestDto): Promise<ChatResponseDto> {
    const { agent_id, question, sessionId } = request;

    // Retrieve persona
    const persona = await this.personaService.getPersona(agent_id);
    if (!persona) {
      throw new NotFoundException(
        `Persona with agent_id '${agent_id}' not found`,
      );
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

    // RETRIEVAL-FIRST FLOW: Always query RAG system first
    const ragResults = await this.ragService.search(question, {
      category: persona.knowledgeCategory,
      topK: 5,
      minScore: 0.7,
    });

    // Construct context from RAG results
    const context = ragResults
      .map((result, idx) => `[${idx + 1}] ${result.content}`)
      .join('\n\n');

    // Build RAG-only system prompt (shared + persona extra instructions)
    const systemPrompt = this.ragSystemPrompt.buildSystemPrompt(
      persona.extraInstructions,
    );

    // Build user message with context and question
    const userMessage = this.ragSystemPrompt.buildUserMessage(
      context,
      question,
    );

    // Call Model Router with RAG-only prompt
    const llmResponse = await this.modelRouter.generate({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: persona.temperature || 0.7,
      maxTokens: persona.maxTokens || 1000,
    });

    let finalAnswer = llmResponse.content;

    // Optional self-check: Verify answer uses only context
    if (this.enableSelfCheck && context) {
      const isValid = await this.performSelfCheck(
        finalAnswer,
        context,
        question,
      );
      if (!isValid) {
        this.logger.logWithContext(
          'warn',
          'Self-check failed: Answer may not be based on context',
          {
            agent_id,
            session_id: session.id,
          },
        );
        finalAnswer =
          "I don't have enough information in my knowledge base to answer that question.";
      }
    }

    // Store assistant response
    await this.sessionRepository.addMessage(
      session.id,
      'assistant',
      finalAnswer,
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
      self_check_enabled: this.enableSelfCheck,
    });

    return {
      answer: finalAnswer,
      citations,
      modelUsed: llmResponse.modelUsed,
      sessionId: session.id,
    };
  }

  /**
   * Optional self-check: Verify that the answer is based on the provided context.
   * This uses the LLM to validate its own answer.
   *
   * @param answer The generated answer
   * @param context The RAG context that was provided
   * @param question The original question
   * @returns true if answer is valid, false otherwise
   */
  private async performSelfCheck(
    answer: string,
    context: string,
    question: string,
  ): Promise<boolean> {
    const selfCheckPrompt = `You are a consistency validator. Your job is to determine if an answer is based ONLY on the provided context.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER TO VALIDATE:
${answer}

Is this answer based ONLY on the information in the CONTEXT above? Respond with ONLY "YES" or "NO".
- YES: If the answer uses only information from the context
- NO: If the answer includes information not in the context, makes assumptions, or uses external knowledge`;

    try {
      const response = await this.modelRouter.generate({
        systemPrompt:
          'You are a consistency validator. Respond with only YES or NO.',
        messages: [{ role: 'user', content: selfCheckPrompt }],
        temperature: 0.0, // Use deterministic response
        maxTokens: 10,
      });

      const validation = response.content.trim().toUpperCase();
      return validation === 'YES';
    } catch (error) {
      this.logger.logWithContext('error', 'Self-check failed', {
        error: error.message,
      });
      // If self-check fails, assume answer is valid (fail-open)
      return true;
    }
  }
}
