import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Apellido debe tener al menos 2 caracteres' })
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username debe tener al menos 3 caracteres' })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username solo puede contener letras, números y guión bajo' })
  username?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;
}
