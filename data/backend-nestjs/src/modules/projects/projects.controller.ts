import { Controller, Get, Post, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CompleteProjectDto } from './dto/complete-project.dto';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, createProjectDto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.projectsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.findById(id, req.user.userId);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Request() req) {
    return this.projectsService.complete(id, req.user.userId);
  }

  @Post('generate-tasks')
  async generateTasks(@Request() req, @Body() generateTasksDto: GenerateTasksDto) {
    return this.projectsService.generateTasks(req.user.userId, generateTasksDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.projectsService.remove(id, req.user.userId);
  }
}
