import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { UsersModule } from '../users/users.module';
import { LLMCredentialsModule } from '../llm/llm-credentials.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project]), UsersModule, HttpModule, LLMCredentialsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
