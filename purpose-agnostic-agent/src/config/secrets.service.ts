import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredLogger } from '../common/logger.service';

export interface SecretsConfig {
  jwtSecret: string;
  databaseUrl: string;
  redisUrl: string;
  googleAiApiKey: string;
  openaiApiKey: string;
  openRouterApiKey?: string;
  apiKeys: string[];
}

@Injectable()
export class SecretsService implements OnModuleInit {
  private secrets: SecretsConfig | null = null;
  private readonly logger = new StructuredLogger();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.loadSecrets();
  }

  private async loadSecrets(): Promise<void> {
    const secretsProvider = this.configService.get<string>('SECRETS_PROVIDER', 'env');

    this.logger.logWithContext('info', 'Loading secrets', {
      provider: secretsProvider,
    });

    switch (secretsProvider) {
      case 'aws':
        this.secrets = await this.loadFromAWS();
        break;
      case 'azure':
        this.secrets = await this.loadFromAzure();
        break;
      case 'vault':
        this.secrets = await this.loadFromVault();
        break;
      case 'env':
      default:
        this.secrets = this.loadFromEnv();
        break;
    }

    this.logger.logWithContext('info', 'Secrets loaded successfully', {
      provider: secretsProvider,
    });
  }

  private loadFromEnv(): SecretsConfig {
    return {
      jwtSecret: this.configService.get<string>('JWT_SECRET', 'change-me-in-production'),
      databaseUrl: this.configService.get<string>('DATABASE_URL')!,
      redisUrl: this.configService.get<string>('REDIS_URL')!,
      googleAiApiKey: this.configService.get<string>('GOOGLE_AI_API_KEY')!,
      openaiApiKey: this.configService.get<string>('OPENAI_API_KEY')!,
      openRouterApiKey: this.configService.get<string>('OPENROUTER_API_KEY'),
      apiKeys: (this.configService.get<string>('API_KEYS', '') || '').split(',').filter(Boolean),
    };
  }

  private async loadFromAWS(): Promise<SecretsConfig> {
    // AWS Secrets Manager implementation
    // Requires: npm install @aws-sdk/client-secrets-manager
    try {
      // @ts-ignore - Optional dependency
      const AWS = await import('@aws-sdk/client-secrets-manager').catch(() => null);
      
      if (!AWS) {
        throw new Error('@aws-sdk/client-secrets-manager not installed. Run: npm install @aws-sdk/client-secrets-manager');
      }

      const client = new AWS.SecretsManagerClient({
        region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      });

      const secretName = this.configService.get<string>('AWS_SECRET_NAME', 'purpose-agnostic-agent/prod');
      
      const response = await client.send(
        new AWS.GetSecretValueCommand({ SecretId: secretName }),
      );

      const secrets = JSON.parse(response.SecretString || '{}');

      return {
        jwtSecret: secrets.JWT_SECRET,
        databaseUrl: secrets.DATABASE_URL,
        redisUrl: secrets.REDIS_URL,
        googleAiApiKey: secrets.GOOGLE_AI_API_KEY,
        openaiApiKey: secrets.OPENAI_API_KEY,
        openRouterApiKey: secrets.OPENROUTER_API_KEY,
        apiKeys: (secrets.API_KEYS || '').split(',').filter(Boolean),
      };
    } catch (error: any) {
      this.logger.logWithContext('error', 'Failed to load secrets from AWS', {
        error: error.message,
      });
      throw error;
    }
  }

  private async loadFromAzure(): Promise<SecretsConfig> {
    // Azure Key Vault implementation
    // Requires: npm install @azure/keyvault-secrets @azure/identity
    try {
      // @ts-ignore - Optional dependency
      const Azure = await import('@azure/keyvault-secrets').catch(() => null);
      // @ts-ignore - Optional dependency
      const Identity = await import('@azure/identity').catch(() => null);

      if (!Azure || !Identity) {
        throw new Error('@azure/keyvault-secrets or @azure/identity not installed. Run: npm install @azure/keyvault-secrets @azure/identity');
      }

      const vaultUrl = this.configService.get<string>('AZURE_KEY_VAULT_URL')!;
      const credential = new Identity.DefaultAzureCredential();
      const client = new Azure.SecretClient(vaultUrl, credential);

      const [
        jwtSecret,
        databaseUrl,
        redisUrl,
        googleAiApiKey,
        openaiApiKey,
        openRouterApiKey,
        apiKeys,
      ] = await Promise.all([
        client.getSecret('JWT-SECRET'),
        client.getSecret('DATABASE-URL'),
        client.getSecret('REDIS-URL'),
        client.getSecret('GOOGLE-AI-API-KEY'),
        client.getSecret('OPENAI-API-KEY'),
        client.getSecret('OPENROUTER-API-KEY').catch(() => ({ value: undefined })),
        client.getSecret('API-KEYS'),
      ]);

      return {
        jwtSecret: jwtSecret.value!,
        databaseUrl: databaseUrl.value!,
        redisUrl: redisUrl.value!,
        googleAiApiKey: googleAiApiKey.value!,
        openaiApiKey: openaiApiKey.value!,
        openRouterApiKey: openRouterApiKey.value,
        apiKeys: (apiKeys.value || '').split(',').filter(Boolean),
      };
    } catch (error: any) {
      this.logger.logWithContext('error', 'Failed to load secrets from Azure', {
        error: error.message,
      });
      throw error;
    }
  }

  private async loadFromVault(): Promise<SecretsConfig> {
    // HashiCorp Vault implementation
    // Requires: npm install node-vault
    try {
      // @ts-ignore - Optional dependency
      const vault = await import('node-vault').catch(() => null);
      
      if (!vault) {
        throw new Error('node-vault not installed. Run: npm install node-vault');
      }

      const client = (vault as any).default({
        endpoint: this.configService.get<string>('VAULT_ADDR', 'http://localhost:8200'),
        token: this.configService.get<string>('VAULT_TOKEN'),
      });

      const secretPath = this.configService.get<string>('VAULT_SECRET_PATH', 'secret/data/purpose-agnostic-agent');
      const response = await client.read(secretPath);
      const secrets = response.data.data;

      return {
        jwtSecret: secrets.JWT_SECRET,
        databaseUrl: secrets.DATABASE_URL,
        redisUrl: secrets.REDIS_URL,
        googleAiApiKey: secrets.GOOGLE_AI_API_KEY,
        openaiApiKey: secrets.OPENAI_API_KEY,
        openRouterApiKey: secrets.OPENROUTER_API_KEY,
        apiKeys: (secrets.API_KEYS || '').split(',').filter(Boolean),
      };
    } catch (error: any) {
      this.logger.logWithContext('error', 'Failed to load secrets from Vault', {
        error: error.message,
      });
      throw error;
    }
  }

  getSecrets(): SecretsConfig {
    if (!this.secrets) {
      throw new Error('Secrets not loaded');
    }
    return this.secrets;
  }

  getSecret(key: keyof SecretsConfig): any {
    if (!this.secrets) {
      throw new Error('Secrets not loaded');
    }
    return this.secrets[key];
  }
}
