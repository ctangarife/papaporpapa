import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LLMCredentialsService } from './llm-credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('llm-credentials')
@UseGuards(JwtAuthGuard)
export class LLMCredentialsController {
  constructor(private readonly llmCredentialsService: LLMCredentialsService) {}

  @Post()
  async create(@Request() req, @Body() createCredentialDto: CreateCredentialDto) {
    const credential = await this.llmCredentialsService.create(req.user.userId, createCredentialDto);
    return {
      id: credential.id,
      provider: credential.provider,
      apiEndpoint: credential.apiEndpoint,
      modelName: credential.modelName,
      isDefault: credential.isDefault,
      hasApiKey: !!credential.apiKey,
      createdAt: credential.createdAt,
    };
  }

  @Get()
  async findAll(@Request() req) {
    // Obtener credenciales directamente del repository para verificar hasApiKey correctamente
    const credentials = await this.llmCredentialsService['credentialsRepository'].find({
      where: { userId: req.user.userId }
    });

    const result = credentials.map(c => ({
      id: c.id,
      provider: c.provider,
      apiEndpoint: c.apiEndpoint,
      modelName: c.modelName,
      isDefault: c.isDefault,
      hasApiKey: !!c.apiKey, // Verificar antes de que el service lo reemplace
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    // Debug logging
    console.log('=== findAll DEBUG ===');
    console.log('Credentials count:', result.length);
    result.forEach(c => {
      console.log(`- ${c.provider}: hasApiKey=${c.hasApiKey}, modelName=${c.modelName}`);
    });

    return result;
  }

  @Get('default')
  async findDefault(@Request() req) {
    const credential = await this.llmCredentialsService.findDefault(req.user.userId);
    if (!credential) {
      return null;
    }
    return {
      id: credential.id,
      provider: credential.provider,
      apiEndpoint: credential.apiEndpoint,
      modelName: credential.modelName,
      isDefault: credential.isDefault,
      hasApiKey: !!credential.apiKey,
    };
  }

  @Get('for-llm')
  async getCredentialsForLLM(@Request() req) {
    return this.llmCredentialsService.getCredentialsForLLM(req.user.userId);
  }

  @Post('check')
  async checkCredentialAndGetModels(@Request() req, @Body() body: { provider: string; apiKey?: string; apiEndpoint?: string }) {
    return this.llmCredentialsService.checkCredentialAndGetModels(
      req.user.userId,
      body.provider,
      body.apiKey,
      body.apiEndpoint,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const credential = await this.llmCredentialsService.findOne(id, req.user.userId);
    return {
      id: credential.id,
      provider: credential.provider,
      apiEndpoint: credential.apiEndpoint,
      modelName: credential.modelName,
      isDefault: credential.isDefault,
      hasApiKey: !!credential.apiKey,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  @Get(':id/models')
  async getModelsForCredential(@Param('id') id: string, @Request() req) {
    return this.llmCredentialsService.getModelsForCredential(id, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateCredentialDto: UpdateCredentialDto,
  ) {
    const credential = await this.llmCredentialsService.update(req.user.userId, id, updateCredentialDto);
    return {
      id: credential.id,
      provider: credential.provider,
      apiEndpoint: credential.apiEndpoint,
      modelName: credential.modelName,
      isDefault: credential.isDefault,
      hasApiKey: !!credential.apiKey,
      updatedAt: credential.updatedAt,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.llmCredentialsService.remove(id, req.user.userId);
    return { message: 'Credencial eliminada correctamente' };
  }
}
