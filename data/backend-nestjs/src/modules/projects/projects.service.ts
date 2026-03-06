import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { LLMCredentialsService } from '../llm/llm-credentials.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly llmBackendUrl: string;

  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private llmCredentialsService: LLMCredentialsService,
  ) {
    this.llmBackendUrl = process.env.LLM_BACKEND_URL || 'http://python_llm:8000';
  }

  async create(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    // Verificar que el usuario tenga al menos una credencial LLM configurada
    const hasCredentials = await this.hasAnyLLMCredential(userId);
    if (!hasCredentials) {
      throw new BadRequestException({
        code: 'NO_LLM_CREDENTIALS',
        message: 'Necesitas configurar al menos un proveedor de IA antes de crear proyectos. Ve a Configuración para agregar uno.',
      });
    }

    const project = this.projectsRepository.create({
      ...createProjectDto,
      userId,
      status: 'active',
    });
    return this.projectsRepository.save(project);
  }

  async findAll(userId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { userId },
      relations: ['tasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, userId },
      relations: ['tasks'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return project;
  }

  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findById(id, userId);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async complete(id: string, userId: string): Promise<Project> {
    const project = await this.findById(id, userId);
    project.status = 'completed';
    project.completedAt = new Date();
    return this.projectsRepository.save(project);
  }

  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findById(id, userId);
    await this.projectsRepository.remove(project);
  }

  /**
   * Genera tareas usando el backend FastAPI con las credenciales del usuario
   */
  async generateTasks(userId: string, generateTasksDto: GenerateTasksDto): Promise<any> {
    this.logger.log(`Generating tasks for user ${userId} with provider ${generateTasksDto.provider || 'default'}`);

    // Obtener credenciales del usuario
    const userCredentials = await this.llmCredentialsService.getCredentialsForLLM(userId);

    // Determinar el proveedor seleccionado
    const selectedProvider = generateTasksDto.provider || userCredentials.defaultProvider;

    // Obtener el modelo específico del proveedor (no el global defaultModel)
    const providerCreds = userCredentials[selectedProvider as keyof typeof userCredentials];
    const providerModel = providerCreds?.['modelName'] as string | undefined;

    // Usar: 1) modelo explícito del request, 2) modelo del proveedor, 3) default global como fallback
    const finalModel = generateTasksDto.model || providerModel || userCredentials.defaultModel;

    this.logger.log(`Selected provider: ${selectedProvider}, Model: ${finalModel} (providerModel: ${providerModel || 'none'}, globalDefault: ${userCredentials.defaultModel})`);

    // Preparar payload para el backend FastAPI
    const payload = {
      goal: generateTasksDto.goal,
      provider: selectedProvider,
      model: finalModel,
      context: generateTasksDto.context,
      credentials: {
        zai: userCredentials.zai,
        minimax: userCredentials.minimax,
        ollama: userCredentials.ollama,
        defaultProvider: userCredentials.defaultProvider,
        defaultModel: userCredentials.defaultModel,
      },
    };

    try {
      // Llamar al backend FastAPI
      const response = await axios.post(`${this.llmBackendUrl}/llm/generate-tasks`, payload);
      return response.data;
    } catch (error) {
      this.logger.error(`Error calling LLM backend: ${error.message}`);
      throw new Error(`Error generando tareas: ${error.message}`);
    }
  }

  /**
   * Crea un proyecto completo con tareas generadas por LLM
   */
  async createWithTasks(
    userId: string,
    createProjectDto: CreateProjectDto,
    generateTasksDto: GenerateTasksDto,
  ): Promise<Project> {
    // Primero generar las tareas
    const generatedTasks = await this.generateTasks(userId, generateTasksDto);

    // Crear el proyecto
    const project = await this.create(userId, {
      name: createProjectDto.name,
      description: generatedTasks.summary || createProjectDto.description,
    });

    // TODO: Crear las tareas en la base de datos
    // Esto requeriría inyectar TasksService

    return project;
  }

  /**
   * Verifica si el usuario tiene al menos una credencial LLM configurada
   */
  private async hasAnyLLMCredential(userId: string): Promise<boolean> {
    const credentials = await this.llmCredentialsService.findAll(userId);
    return credentials.length > 0;
  }
}
