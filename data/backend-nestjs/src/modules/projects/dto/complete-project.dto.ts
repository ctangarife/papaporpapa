import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CompleteProjectDto {
  @IsString()
  @IsIn(['ollama', 'zai', 'minimax'])
  @IsOptional()
  provider?: 'ollama' | 'zai' | 'minimax';

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  context?: string;
}
