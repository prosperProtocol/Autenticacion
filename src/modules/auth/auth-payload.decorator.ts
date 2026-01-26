import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar rutas o controladores públicos (no requieren JWT).
 * Uso: @Public() encima del controlador o handler.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Decorador para inyectar el payload verificado por JwtInterceptor.
 * Uso: handler(@AuthPayload() payload) { ... }
 */
export const AuthPayload = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.authPayload;
});
