import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from '../projects/entities/project.entity';
import { UsersService } from '../users/users.service';
import { LLMCredentialsService } from '../llm/llm-credentials.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
    private llmCredentialsService: LLMCredentialsService,
    private httpService: HttpService,
  ) {}

  private getLLMBackendUrl(): string {
    return process.env.LLM_BACKEND_URL || 'http://python_llm:8000';
  }

  async create(projectId: string, createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.tasksRepository.create({
      ...createTaskDto,
      projectId,
      status: 'pending',
    });
    return this.tasksRepository.save(task);
  }

  async findByProject(projectId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { projectId },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return task;
  }

  async findNextPending(projectId: string): Promise<Task | null> {
    return this.tasksRepository.findOne({
      where: { projectId, status: 'pending' },
      order: { sortOrder: 'ASC' },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findById(id);
    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async complete(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    console.log('[TasksService] Completando tarea:', task.id);
    console.log('[TasksService] Project:', task.project);
    console.log('[TasksService] UserId:', task.project?.userId);
    console.log('[TasksService] CoinValue:', task.coinValue);

    task.status = 'completed';
    task.completedAt = new Date();
    task.skipCount = 0; // Reset skip count on completion
    const savedTask = await this.tasksRepository.save(task);

    // Actualizar monedas del usuario
    if (task.project?.userId) {
      console.log('[TasksService] Actualizando monedas para usuario:', task.project.userId, 'cantidad:', task.coinValue);
      await this.usersService.updateCoins(task.project.userId, task.coinValue);
      console.log('[TasksService] Monedas actualizadas correctamente');
    } else {
      console.log('[TasksService] No se pudo actualizar monedas - userId no encontrado en project');
    }

    return savedTask;
  }

  async skip(id: string): Promise<{ task: Task; blockingDetected: boolean }> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    // Increment skip count
    task.skipCount = (task.skipCount || 0) + 1;

    // Check if blocking detected (skipCount >= 3)
    const blockingDetected = task.skipCount >= 3;

    if (blockingDetected) {
      // Mark as blocked instead of skipped
      task.status = 'blocked';
      console.log('[TasksService] Bloqueo detectado para tarea:', task.id, 'skipCount:', task.skipCount);
    } else {
      // Move to end of queue
      await this.moveTaskToEnd(task);
    }

    task.skippedAt = new Date();
    const savedTask = await this.tasksRepository.save(task);

    return {
      task: savedTask,
      blockingDetected,
    };
  }

  /**
   * Move a task to the end of the queue by updating its sort_order
   */
  private async moveTaskToEnd(task: Task): Promise<void> {
    // Get the maximum sort_order for this project
    const maxOrderTask = await this.tasksRepository.findOne({
      where: { projectId: task.projectId },
      order: { sortOrder: 'DESC' },
    });

    const newSortOrder = maxOrderTask ? maxOrderTask.sortOrder + 1 : task.sortOrder + 100;
    task.sortOrder = newSortOrder;
  }

  async reset(id: string): Promise<Task> {
    const task = await this.findById(id);
    task.status = 'pending';
    task.skippedAt = null;
    return this.tasksRepository.save(task);
  }

  /**
   * "Modo Sherpa" - Split a task into smaller subtasks using LLM
   */
  async split(id: string): Promise<{ newTasks: Task[]; originalTask: Task }> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    console.log('[TasksService] Iniciando Modo Sherpa para tarea:', task.id);

    // Get user's LLM credentials
    const userId = task.project?.userId;
    if (!userId) {
      throw new BadRequestException('No se puede identificar el usuario');
    }

    // Call LLM backend to split the task
    const llmBackendUrl = this.getLLMBackendUrl();
    let subtasks: string[] = [];

    try {
      // Get user's LLM credentials
      const credentials = await this.llmCredentialsService.getCredentialsForLLM(userId);

      // Prepare request for FastAPI split-task endpoint
      const response = await firstValueFrom(
        this.httpService.post(
          `${llmBackendUrl}/llm/split-task`,
          {
            goal: task.description,
            provider: credentials.defaultProvider,
            model: credentials.defaultModel,
            credentials: {
              [credentials.defaultProvider]: credentials[credentials.defaultProvider] || {},
            },
          },
        )
      );

      const data = response.data as { subtasks?: string[] };
      subtasks = data.subtasks || [];
      console.log('[TasksService] Subtareas generadas:', subtasks);
    } catch (error) {
      console.error('[TasksService] Error al llamar LLM:', error);
      // Fallback: create generic subtasks
      subtasks = [
        `Primer paso para: ${task.description}`,
        `Segundo paso para: ${task.description}`,
      ];
    }

    // Get the current max sort_order for the project
    const maxOrderTask = await this.tasksRepository.findOne({
      where: { projectId: task.projectId },
      order: { sortOrder: 'DESC' },
    });
    let nextSortOrder = maxOrderTask ? maxOrderTask.sortOrder + 1 : 1;

    // Create new subtasks
    const newTasks: Task[] = [];
    for (const subtaskDesc of subtasks) {
      const newTask = this.tasksRepository.create({
        projectId: task.projectId,
        description: subtaskDesc,
        status: 'pending',
        coinValue: Math.max(1, Math.floor(task.coinValue / subtasks.length)),
        sortOrder: nextSortOrder++,
        dependsOn: [],
        skipCount: 0,
      });
      const savedTask = await this.tasksRepository.save(newTask);
      newTasks.push(savedTask);
    }

    // Archive or delete the original task
    task.status = 'completed'; // Mark as completed (it was "split" instead)
    task.completedAt = new Date();
    await this.tasksRepository.save(task);

    console.log('[TasksService] Tarea dividida en', newTasks.length, 'subtareas');

    return {
      newTasks,
      originalTask: task,
    };
  }

  async delete(id: string): Promise<void> {
    const task = await this.findById(id);
    await this.tasksRepository.remove(task);
  }
}
