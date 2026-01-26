import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth } from '../../entities/auth.entity';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { AuthJwtPayload, AuthLoginResponse, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly serverConfig: Record<string, any>;
  constructor(
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    private configService: ConfigService,
  ) {
    this.serverConfig = this.configService.get('config');
  }

  private getJwtSecret(): string {
    const secret = this.serverConfig.server_secret;
    if (!secret) {
      this.logger.error(
        'JWT secret no está configurado en serverConfig.server_secret',
      );
      throw new BadRequestException('JWT secret no configurado');
    }
    return secret;
  }

  private getJwtExpiresInSeconds(): number {
    const expiresIn = this.serverConfig.jwt_expires_in;
    if (!expiresIn || isNaN(Number(expiresIn))) {
      this.logger.error(
        'JWT expiration no está configurado en serverConfig.jwt_expires_in',
      );
      throw new BadRequestException('JWT expiration no configurado');
    }
    return Number(expiresIn);
  }

  private generateJwtForUser(user: Auth): {
    token: string;
    createdAt: string;
    expiresAt: string;
  } {
    const secret = this.getJwtSecret();
    const expiresIn = this.getJwtExpiresInSeconds();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const payload = {
      sub: String(user.id),
      rol: user.role,
      createdAt,
      expiresAt,
    };
    const token = jwt.sign(payload as AuthJwtPayload, secret, { expiresIn });
    return { token, createdAt, expiresAt };
  }

  /**
   * Valida un JWT y regresa el payload esperado: { sub, email, bankId, createdAt, expiresAt }
   * Lanza UnauthorizedException si el token no es válido.
   */
  public validateJwt(token: string): AuthJwtPayload {
    try {
      const secret = this.getJwtSecret();
      const payload = jwt.verify(token, secret) as AuthJwtPayload;
      return payload;
    } catch (err) {
      this.logger.warn(
        'Invalid JWT',
        err instanceof Error ? err.message : String(err),
      );
      throw new UnauthorizedException('Token JWT inválido');
    }
  }

  /**
   * Login usando username + password (password almacenado en hash bcrypt)
   */
  async login(payload: LoginDto): Promise<AuthLoginResponse> {
    try {
      const { username, password } = payload;
      const user = await this.authRepo.findOne({ where: { username } });
      if (!user) {
        this.logger.error(`Usuario no encontrado: ${username}`);
        throw new UnauthorizedException('Credenciales inválidas');
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        this.logger.error(`Password inválido para usuario: ${username}`);
        throw new UnauthorizedException('Credenciales inválidas');
      }
      const jwtData = this.generateJwtForUser(user);
      return {
        token: jwtData.token,
        createdAt: jwtData.createdAt,
        expiresAt: jwtData.expiresAt,
      };
    } catch (error) {
      this.logger.error(
        'Error en login',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error en el proceso de login');
    }
  }

  /**
   * Cambia la contraseña del usuario. Protegida por JWT en el controlador.
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      const user = await this.authRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        this.logger.error(
          `Contraseña antigua incorrecta para usuario ID: ${userId}`,
        );
        throw new UnauthorizedException('Contraseña antigua incorrecta');
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      user.password = hashed;
      await this.authRepo.save(user);
      return { ok: true };
    } catch (error) {
      this.logger.error(
        'Error al cambiar contraseña',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error al cambiar la contraseña');
    }
  }
}
