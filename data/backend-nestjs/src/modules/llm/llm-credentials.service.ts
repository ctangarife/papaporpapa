import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLLMCredential, LLMProvider } from './entities/user-llm-credential.entity';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import * as crypto from 'crypto';
import axios, { AxiosError } from 'axios';

// Nota: En producción, usar una clave de encriptación desde variables de entorno
const ENCRYPTION_KEY = process.env.LLM_ENCRYPTION_KEY || 'papas-llm-key-2024-32-bytes-secret!!';
const ALGORITHM = 'aes-256-cbc';

@Injectable()
export class LLMCredentialsService {
  constructor(
    @InjectRepository(UserLLMCredential)
    private credentialsRepository: Repository<UserLLMCredential>,
  ) {}

  /**
   * Encripta una API key usando AES-256-CBC
   */
  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Desencripta una API key
   */
  private decryptApiKey(encryptedApiKey: string): string {
    const parts = encryptedApiKey.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async create(userId: string, createCredentialDto: CreateCredentialDto): Promise<UserLLMCredential> {
    // Verificar si ya existe una credencial para este provider
    const existing = await this.credentialsRepository.findOne({
      where: { userId, provider: createCredentialDto.provider }
    });

    if (existing) {
      // Actualizar la existente
      return this.update(userId, existing.id, createCredentialDto);
    }

    // Si se marca como default, quitar default de otros
    if (createCredentialDto.isDefault) {
      await this.credentialsRepository.update(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Encriptar API key si se proporciona
    let encryptedKey: string | null = null;
    if (createCredentialDto.apiKey) {
      encryptedKey = this.encryptApiKey(createCredentialDto.apiKey);
    }

    const credential = this.credentialsRepository.create({
      provider: createCredentialDto.provider,
      userId,
      apiKey: encryptedKey,
      apiEndpoint: createCredentialDto.apiEndpoint,
      modelName: createCredentialDto.modelName,
      isDefault: createCredentialDto.isDefault || false,
    });

    return this.credentialsRepository.save(credential);
  }

  async findAll(userId: string): Promise<UserLLMCredential[]> {
    const credentials = await this.credentialsRepository.find({
      where: { userId }
    });

    // No devolver las API keys desencriptadas en la lista
    return credentials.map(c => ({
      ...c,
      apiKey: c.apiKey ? '***encrypted***' : null,
    }));
  }

  async findByProvider(userId: string, provider: LLMProvider): Promise<UserLLMCredential | null> {
    return this.credentialsRepository.findOne({
      where: { userId, provider }
    });
  }

  async findDefault(userId: string): Promise<UserLLMCredential | null> {
    return this.credentialsRepository.findOne({
      where: { userId, isDefault: true }
    });
  }

  async findOne(id: string, userId: string): Promise<UserLLMCredential> {
    const credential = await this.credentialsRepository.findOne({
      where: { id }
    });

    if (!credential) {
      throw new NotFoundException('Credencial no encontrada');
    }

    if (credential.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta credencial');
    }

    return credential;
  }

  async getDecryptedCredentials(userId: string, provider: LLMProvider): Promise<{
    apiKey: string | null;
    apiEndpoint: string | null;
    modelName: string | null;
  } | null> {
    const credential = await this.findByProvider(userId, provider);

    if (!credential) {
      return null;
    }

    return {
      apiKey: credential.apiKey ? this.decryptApiKey(credential.apiKey) : null,
      apiEndpoint: credential.apiEndpoint,
      modelName: credential.modelName,
    };
  }

  async update(userId: string, id: string, updateCredentialDto: UpdateCredentialDto): Promise<UserLLMCredential> {
    const credential = await this.findOne(id, userId);

    // Si se marca como default, quitar default de otros
    if (updateCredentialDto.isDefault) {
      await this.credentialsRepository.update(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Encriptar nueva API key si se proporciona
    let encryptedKey: string | undefined;
    if (updateCredentialDto.apiKey) {
      encryptedKey = this.encryptApiKey(updateCredentialDto.apiKey);
    }

    Object.assign(credential, {
      ...(updateCredentialDto.apiKey && { apiKey: encryptedKey }),
      ...(updateCredentialDto.apiEndpoint && { apiEndpoint: updateCredentialDto.apiEndpoint }),
      ...(updateCredentialDto.modelName && { modelName: updateCredentialDto.modelName }),
      ...(updateCredentialDto.isDefault !== undefined && { isDefault: updateCredentialDto.isDefault }),
    });

    return this.credentialsRepository.save(credential);
  }

  async remove(id: string, userId: string): Promise<void> {
    const credential = await this.findOne(id, userId);
    await this.credentialsRepository.remove(credential);
  }

  /**
   * Obtiene todas las credenciales para enviar al backend LLM
   */
  async getCredentialsForLLM(userId: string): Promise<{
    zai?: { apiKey: string; apiEndpoint?: string };
    minimax?: { apiKey: string; apiEndpoint?: string };
    ollama?: { apiKey: string; apiEndpoint?: string };
    defaultProvider: LLMProvider;
    defaultModel: string;
  }> {
    const credentials = await this.findAll(userId);
    const defaultCred = credentials.find(c => c.isDefault) || credentials[0];

    const result: any = {
      defaultProvider: defaultCred?.provider || 'ollama',
      defaultModel: defaultCred?.modelName || 'llama3.2',
    };

    for (const cred of credentials) {
      const decrypted = await this.getDecryptedCredentials(userId, cred.provider);

      if (!decrypted) continue;

      switch (cred.provider) {
        case 'zai':
          if (decrypted.apiKey) {
            result.zai = {
              apiKey: decrypted.apiKey,
              ...(decrypted.apiEndpoint && { apiEndpoint: decrypted.apiEndpoint }),
              ...(cred.modelName && { modelName: cred.modelName }),
            };
          }
          break;
        case 'minimax':
          if (decrypted.apiKey) {
            result.minimax = {
              apiKey: decrypted.apiKey,
              ...(decrypted.apiEndpoint && { apiEndpoint: decrypted.apiEndpoint }),
              ...(cred.modelName && { modelName: cred.modelName }),
            };
          }
          break;
        case 'ollama':
          result.ollama = {
            apiKey: decrypted.apiKey,
            ...(decrypted.apiEndpoint && { apiEndpoint: decrypted.apiEndpoint }),
            ...(cred.modelName && { modelName: cred.modelName }),
          };
          break;
      }
    }

    return result;
  }

  /**
   * Obtiene los modelos disponibles para una credencial existente
   */
  async getModelsForCredential(credentialId: string, userId: string): Promise<{ valid: boolean; models: string[]; error?: string }> {
    const logger = new Logger(LLMCredentialsService.name);

    try {
      // Obtener la credencial
      const credential = await this.findOne(credentialId, userId);

      // Desencriptar la API key
      const decryptedCredentials = await this.getDecryptedCredentials(userId, credential.provider);

      if (!decryptedCredentials || !decryptedCredentials.apiKey) {
        return {
          valid: false,
          models: [],
          error: 'No se encontró API key para esta credencial',
        };
      }

      // Usar checkCredentialAndGetModels con las credenciales almacenadas
      return await this.checkCredentialAndGetModels(
        userId,
        credential.provider,
        decryptedCredentials.apiKey,
        credential.apiEndpoint,
      );

    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        logger.error(`LLM backend error: ${status} - ${JSON.stringify(data)}`);

        if (status === 401 || status === 403) {
          return {
            valid: false,
            models: [],
            error: 'API Key inválida o sin autorización',
          };
        }

        return {
          valid: false,
          models: [],
          error: data?.detail || data?.message || 'Error verificando credencial',
        };
      }

      logger.error(`Unexpected error getting models for credential: ${axiosError.message}`);

      return {
        valid: false,
        models: [],
        error: axiosError.message || 'Error desconocido al verificar credencial',
      };
    }
  }

  /**
   * Verifica una credencial y obtiene los modelos disponibles del proveedor
   */
  async checkCredentialAndGetModels(
    userId: string,
    provider: string,
    apiKey?: string,
    apiEndpoint?: string,
  ): Promise<{ valid: boolean; models: string[]; error?: string }> {
    const logger = new Logger(LLMCredentialsService.name);

    try {
      // Validar que el provider sea soportado
      const validProviders = ['ollama', 'zai', 'minimax'];
      if (!validProviders.includes(provider)) {
        return {
          valid: false,
          models: [],
          error: `Proveedor "${provider}" no válido. Opciones: ${validProviders.join(', ')}`,
        };
      }

      // URL del backend LLM (FastAPI)
      const llmBackendUrl = process.env.LLM_BACKEND_URL || 'http://python_llm:8000';

      // Preparar payload según el provider
      const payload: any = {
        credentials: {},
      };

      if (provider === 'zai' && apiKey) {
        payload.credentials.zai = {
          apiKey,
          // No usar default, dejar que el SDK zai use su endpoint interno
          ...(apiEndpoint && { apiEndpoint }),
        };
      } else if (provider === 'minimax' && apiKey) {
        payload.credentials.minimax = {
          apiKey,
          apiEndpoint: apiEndpoint || 'https://api.minimax.chat/v1/text/chatcompletion_v2',
        };
      } else if (provider === 'ollama') {
        payload.credentials.ollama = {
          apiEndpoint: apiEndpoint || 'https://ollama.com',
          ...(apiKey && { apiKey }),
        };
      }

      // Debug logging
      logger.log(`=== LLM Request Debug ===`);
      logger.log(`Provider: ${provider}`);
      logger.log(`URL: ${llmBackendUrl}/llm/models?provider=${provider}`);
      logger.log(`Payload being sent: ${JSON.stringify({
        ...payload.credentials,
        apiKey: payload.credentials.ollama?.apiKey ? `***${payload.credentials.ollama.apiKey.slice(-4)}` : 'NOT_PROVIDED'
      })}`);
      logger.log(`=== End Debug ===`);

      // Hacer petición al backend LLM (directo al contenedor, sin pasar por nginx)
      const response = await axios.post(
        `${llmBackendUrl}/llm/models?provider=${provider}`,
        payload.credentials,
        { timeout: 30000 }, // 30 segundos
      );

      logger.log(`Response status: ${response.status}`);
      logger.log(`Response data: ${JSON.stringify(response.data)}`);

      const models = response.data?.models || [];

      logger.log(`Models retrieved for ${provider}: ${models.length} models`);

      return {
        valid: true,
        models,
      };

    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data as any;

        logger.error(`LLM backend error: ${status} - ${JSON.stringify(data)}`);

        if (status === 401 || status === 403) {
          return {
            valid: false,
            models: [],
            error: 'API Key inválida o sin autorización',
          };
        }

        return {
          valid: false,
          models: [],
          error: data?.detail || data?.message || 'Error verificando credenciales',
        };
      }

      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
        return {
          valid: false,
          models: [],
          error: 'No se puede conectar al servicio LLM. Verifica que el backend esté corriendo.',
        };
      }

      logger.error(`Unexpected error checking credentials: ${axiosError.message}`);

      return {
        valid: false,
        models: [],
        error: axiosError.message || 'Error desconocido al verificar credenciales',
      };
    }
  }
}
