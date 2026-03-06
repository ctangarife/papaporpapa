import { IsString, IsNumber, IsOptional, IsArray, IsIn } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['pending', 'completed', 'blocked'])
  @IsOptional()
  status?: 'pending' | 'completed' | 'blocked';

  @IsNumber()
  @IsOptional()
  coinValue?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsOptional()
  dependsOn?: string[];
}
