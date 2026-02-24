export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
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
