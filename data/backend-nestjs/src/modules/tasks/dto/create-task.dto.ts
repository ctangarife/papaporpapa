import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  coinValue?: number;

  @IsNumber()
  @IsNotEmpty()
  sortOrder: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  dependsOn?: string[];
}
