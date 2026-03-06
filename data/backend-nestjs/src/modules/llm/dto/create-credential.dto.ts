import { IsNotEmpty, IsString, IsOptional, IsIn, IsBoolean, MaxLength } from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  @IsIn(['ollama', 'zai', 'minimax'])
  @IsNotEmpty()
  provider: 'ollama' | 'zai' | 'minimax';

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiEndpoint?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  modelName?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
