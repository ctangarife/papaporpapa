import { IsString, IsOptional, IsBoolean, IsUrl, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateCredentialDto } from './create-credential.dto';

export class UpdateCredentialDto extends PartialType(CreateCredentialDto) {
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
