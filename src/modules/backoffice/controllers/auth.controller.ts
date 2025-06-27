import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { SkipJwtAuth } from 'src/common/decorators/skip-guard.decorator';
import {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthTokenRequest,
  AuthTokenResponse,
} from 'src/modules/auth/dtos/auth.validation.dto';
import { AuthService } from 'src/modules/auth/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthBackOfficeController {
  public className = this.constructor.name;
  private readonly logger = new Logger(this.className);
  constructor(private readonly authService: AuthService) {}

  @SkipJwtAuth()
  @Post('/passwordless-login')
  @ApiOkResponse({
    description: 'Request login code',
    type: AuthLoginResponse,
  })
  async passwordlessLogin(@Body() body: AuthLoginRequest) {
    return this.authService.passwordlessLogin(body.email);
  }

  @SkipJwtAuth()
  @Post('/passwordless-token')
  @ApiOkResponse({
    description: 'Request access token',
    type: AuthTokenResponse,
  })
  async passwordlessToken(@Body() body: AuthTokenRequest) {
    return this.authService.passwordlessToken(body.code, body.token);
  }

  @SkipJwtAuth()
  @Post('/signup')
  @ApiOkResponse({
    description: 'signup',
    type: AuthLoginResponse,
  })
  async signup(@Body() payload: AuthLoginRequest) {
    return this.authService.signup(payload);
  }
}
