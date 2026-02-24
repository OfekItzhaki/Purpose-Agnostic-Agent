export interface Persona {
  id: string;
  name: string;
  description: string;
  extraInstructions?: string; // Optional style/tone instructions (cannot override RAG-only rules)
  knowledgeCategory: string;
  temperature?: number;
  maxTokens?: number;
}

export interface PersonaInfo {
  id: string;
  name: string;
  description: string;
  knowledgeCategory: string;
}
