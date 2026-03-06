import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Configuración de CORS
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // NOTA: No usamos prefijo global 'api' porque nginx ya lo agrega
  // Las rutas son: /auth/register, /users/profile, etc.

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`Papas App - Backend NestJS running on port ${port}`);
}

bootstrap();
