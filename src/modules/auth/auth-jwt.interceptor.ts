import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './auth-payload.decorator';

/**
 * Interceptor que valida el header Authorization (Bearer <token>), verifica el JWT
 * usando AuthService.validateJwt y adjunta el payload en request.authPayload.
 */
@Injectable()
export class JwtInterceptor implements NestInterceptor {
  private readonly logger = new Logger(JwtInterceptor.name);
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Formato de Authorization inválido');
    }

    const token = parts[1];
    try {
      const payload = await this.authService.validateJwt(token);
      req.authPayload = payload;
    } catch (err) {
      this.logger.error(
        'Invalid JWT',
        err instanceof Error ? err.message : String(err),
      );
      throw new UnauthorizedException('Token inválido');
    }

    return next.handle();
  }
}
