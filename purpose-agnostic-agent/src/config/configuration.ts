import * as Joi from 'joi';

export const configurationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  GOOGLE_AI_API_KEY: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  OPENROUTER_API_KEY: Joi.string().optional(),
  OLLAMA_URL: Joi.string().default('http://localhost:11434'),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  RAG_SELF_CHECK_ENABLED: Joi.string().valid('true', 'false').default('false'),
  USAGE_TRACKING_ENABLED: Joi.string().valid('true', 'false').default('false'),
  DAILY_REQUEST_LIMIT: Joi.number().default(999999),
  DAILY_TOKEN_LIMIT: Joi.number().default(999999999),
  RPM_LIMIT: Joi.number().default(999),
  PERSONA_CONFIG_PATH: Joi.string().default('./config/personas.json'),
  STORAGE_TYPE: Joi.string().valid('database', 'file').default('database'),
});

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  googleAiApiKey: string;
  openaiApiKey: string;
  openRouterApiKey?: string;
  ollamaUrl: string;
  logLevel: string;
  personaConfigPath: string;
  storageType: 'database' | 'file';
}

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  logLevel: process.env.LOG_LEVEL || 'info',
  personaConfigPath: process.env.PERSONA_CONFIG_PATH || './config/personas.json',
  storageType: (process.env.STORAGE_TYPE || 'database') as 'database' | 'file',
});
