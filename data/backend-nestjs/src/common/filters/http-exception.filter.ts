import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
    } else if (exception instanceof QueryFailedError) {
      // Manejar errores de base de datos de PostgreSQL
      const detail = (exception as any).detail;
      if (detail && typeof detail === 'string' && (detail.includes('Key (email)=') || detail.includes('users_email_key'))) {
        status = HttpStatus.CONFLICT;
        message = 'El email ya está registrado';
      } else if (detail && typeof detail === 'string' && (detail.includes('Key (username)=') || detail.includes('users_username_key'))) {
        status = HttpStatus.CONFLICT;
        message = 'El nombre de usuario ya está en uso';
      } else {
        message = 'Error en la base de datos';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log del error para debugging
    console.error('Error:', {
      path: request.url,
      method: request.method,
      status,
      message,
      exception,
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
