import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './auth-payload.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader)
      throw new UnauthorizedException('Authorization header missing');

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer')
      throw new UnauthorizedException('Formato de Authorization inválido');

    const token = parts[1];
    try {
      const payload = this.authService.validateJwt(token);
      req.authPayload = payload;
      return true;
    } catch (err) {
      this.logger.error(
        `JWT validation error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Token inválido');
    }
  }
}
