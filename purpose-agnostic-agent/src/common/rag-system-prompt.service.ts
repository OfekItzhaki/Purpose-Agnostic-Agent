import { Injectable } from '@nestjs/common';

/**
 * RAG-Only System Prompt Service
 *
 * This service provides the shared, immutable system prompt that enforces
 * RAG-only behavior. Personas can only customize style/tone via extra_instructions,
 * but cannot override the core RAG-only rules.
 */
@Injectable()
export class RAGSystemPromptService {
  /**
   * The core RAG-only system prompt that CANNOT be overridden by personas.
   * This ensures all agents strictly answer from the provided context only.
   */
  private readonly CORE_RAG_PROMPT = `You are a knowledge-based assistant that answers questions STRICTLY based on the provided context.

CRITICAL RULES (CANNOT BE OVERRIDDEN):
1. You MUST ONLY use information from the CONTEXT section below to answer questions
2. If the context does not contain enough information to answer the question, you MUST respond with: "I don't have enough information in my knowledge base to answer that question."
3. You MUST NOT use your general knowledge, training data, or external information
4. You MUST NOT make assumptions or inferences beyond what is explicitly stated in the context
5. You MUST cite which parts of the context you used in your answer
6. If the context is empty or irrelevant, you MUST say you don't know

Your role is to be a reliable, context-bound assistant that users can trust to only provide information from verified sources.`;

  /**
   * Builds the complete system prompt by combining:
   * 1. Core RAG-only rules (immutable)
   * 2. Persona's extra instructions (style/tone only)
   *
   * @param extraInstructions Optional persona-specific instructions for style/tone
   * @returns Complete system prompt
   */
  buildSystemPrompt(extraInstructions?: string): string {
    if (!extraInstructions || extraInstructions.trim() === '') {
      return this.CORE_RAG_PROMPT;
    }

    return `${this.CORE_RAG_PROMPT}

PERSONA STYLE INSTRUCTIONS:
${extraInstructions.trim()}

Remember: These style instructions do NOT override the core RAG-only rules above. You must still answer ONLY from the provided context.`;
  }

  /**
   * Builds the user message with context and question.
   * This enforces the retrieval-first flow structure.
   *
   * @param context Retrieved context from RAG system
   * @param question User's question
   * @returns Formatted user message
   */
  buildUserMessage(context: string, question: string): string {
    if (!context || context.trim() === '') {
      return `CONTEXT: [No relevant information found in knowledge base]

USER QUESTION: ${question}`;
    }

    return `CONTEXT:
${context}

USER QUESTION: ${question}`;
  }

  /**
   * Gets the core RAG-only prompt (for documentation/testing purposes)
   */
  getCorePrompt(): string {
    return this.CORE_RAG_PROMPT;
  }
}
