import { IsBoolean, IsInt, IsString, Matches, IsOptional, Max, Min } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  @Matches(/^[12468]$/, { message: 'La frecuencia debe ser 1, 2, 4, 6, 12 o 24 horas' })
  frequencyHours?: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido (HH:MM)' })
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Formato de hora inválido (HH:MM)' })
  quietHoursEnd?: string;
}

export class NotificationPreferencesResponse {
  enabled: boolean;
  frequencyHours: number;
  quietHoursStart: string;
  quietHoursEnd: string;
}
