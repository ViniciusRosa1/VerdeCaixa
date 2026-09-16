import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const value =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : {};
    const rawMessage =
      body.message ??
      (exception instanceof Error ? exception.message : "Erro inesperado");
    const messages = Array.isArray(rawMessage)
      ? rawMessage
      : [String(rawMessage)];
    response.status(status).json({
      code: body.error ?? HttpStatus[status] ?? "ERROR",
      message: messages[0] ?? "Erro inesperado",
      errors: messages.length > 1 ? messages : undefined,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
