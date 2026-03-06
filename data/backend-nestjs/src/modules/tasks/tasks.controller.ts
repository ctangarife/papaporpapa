import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    // El projectId viene en el body o desde el contexto del proyecto
    const task = await this.tasksService.create(createTaskDto.projectId, createTaskDto);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      sortOrder: task.sortOrder,
      dependsOn: task.dependsOn,
      createdAt: task.createdAt,
    };
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    const tasks = await this.tasksService.findByProject(projectId);
    return tasks.map(task => ({
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      sortOrder: task.sortOrder,
      dependsOn: task.dependsOn,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    }));
  }

  @Get('project/:projectId/next')
  async findNextPending(@Param('projectId') projectId: string) {
    const task = await this.tasksService.findNextPending(projectId);
    if (!task) {
      return null;
    }
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      sortOrder: task.sortOrder,
      dependsOn: task.dependsOn,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.tasksService.findById(id);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      sortOrder: task.sortOrder,
      dependsOn: task.dependsOn,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const task = await this.tasksService.update(id, updateTaskDto);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      sortOrder: task.sortOrder,
      dependsOn: task.dependsOn,
    };
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string) {
    const task = await this.tasksService.complete(id);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      completedAt: task.completedAt,
    };
  }

  @Post(':id/skip')
  async skip(@Param('id') id: string) {
    const task = await this.tasksService.skip(id);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
      skippedAt: task.skippedAt,
    };
  }

  @Post(':id/reset')
  async reset(@Param('id') id: string) {
    const task = await this.tasksService.reset(id);
    return {
      id: task.id,
      description: task.description,
      status: task.status,
      coinValue: task.coinValue,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tasksService.delete(id);
    return { message: 'Tarea eliminada correctamente' };
  }
}
