import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['active', 'paused', 'completed'])
  @IsOptional()
  status?: ProjectStatus;
}

