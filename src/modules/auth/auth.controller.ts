import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtGuard } from './auth-jwt.guard';
import { AuthPayload, Public } from './auth-payload.decorator';
import { LoginDto, ChangePasswordDto, AuthJwtPayload } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly service: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login con username y password' })
  async login(@Body() payload: LoginDto) {
    return this.service.login(payload);
  }

  @Post('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña (protegido por JWT)' })
  async changePassword(
    @AuthPayload() payload: AuthJwtPayload,
    @Body() body: ChangePasswordDto,
  ) {
    const userId = Number(payload.sub);
    return this.service.changePassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }
}
