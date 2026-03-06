import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from '../projects/entities/project.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
  ) {}

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

  async skip(id: string): Promise<Task> {
    const task = await this.findById(id);
    task.status = 'skipped';
    task.skippedAt = new Date();
    return this.tasksRepository.save(task);
  }

  async reset(id: string): Promise<Task> {
    const task = await this.findById(id);
    task.status = 'pending';
    task.skippedAt = null;
    return this.tasksRepository.save(task);
  }

  async delete(id: string): Promise<void> {
    const task = await this.findById(id);
    await this.tasksRepository.remove(task);
  }
}
