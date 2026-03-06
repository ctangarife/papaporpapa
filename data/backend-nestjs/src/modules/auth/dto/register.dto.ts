import { IsEmail, IsNotEmpty, MinLength, IsString, MaxLength, IsOptional, IsDateString, IsIn, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;

  @IsNotEmpty({ message: 'Password es requerido' })
  @MinLength(6, { message: 'Password debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'Nombre es requerido' })
  @IsString()
  @MinLength(2, { message: 'Nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Nombre no puede exceder 100 caracteres' })
  firstName: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Apellido no puede exceder 100 caracteres' })
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'Username no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username solo puede contener letras, números y guión bajo' })
  username?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['TEA', 'TDHA', 'TEA_TDHA', 'DISLEXIA', 'TDA', 'NONE', 'OTHER'], {
    message: 'Diagnóstico debe ser uno de: TEA, TDHA, TEA_TDHA, DISLEXIA, TDA, NONE, OTHER'
  })
  diagnosis?: string;
}
