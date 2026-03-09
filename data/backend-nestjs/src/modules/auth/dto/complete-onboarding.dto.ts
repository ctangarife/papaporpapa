import { IsOptional, IsString, IsIn } from 'class-validator';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsString()
  @IsIn(['TEA', 'TDHA', 'TEA_TDHA', 'DISLEXIA', 'TDA', 'NONE', 'OTHER'], {
    message: 'Diagnóstico debe ser uno de: TEA, TDHA, TEA_TDHA, DISLEXIA, TDA, NONE, OTHER'
  })
  diagnosis?: string;

  @IsOptional()
  aiPreferences?: string;
}
