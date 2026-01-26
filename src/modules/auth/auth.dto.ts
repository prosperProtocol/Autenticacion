import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthLoginResponse {
  @ApiProperty({ description: 'JWT generado para el usuario' })
  @IsNotEmpty()
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Fecha de creación del token (ISO string)' })
  @IsNotEmpty()
  @IsString()
  createdAt!: string;

  @ApiProperty({ description: 'Fecha de expiración del token (ISO string)' })
  @IsNotEmpty()
  @IsString()
  expiresAt!: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Nombre de usuario', example: 'usuario' })
  @IsNotEmpty()
  @IsString()
  username!: string;

  @ApiProperty({ description: 'Contraseña', example: 'miPassword123' })
  @IsNotEmpty()
  @IsString()
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña antigua', example: 'oldPassword' })
  @IsNotEmpty()
  @IsString()
  oldPassword!: string;

  @ApiProperty({ description: 'Contraseña nueva', example: 'newPassword' })
  @IsNotEmpty()
  @IsString()
  newPassword!: string;
}

export interface AuthJwtPayload {
  sub: string;
  createdAt: string;
  expiresAt: string;
  iat?: number;
  exp?: number;
}
