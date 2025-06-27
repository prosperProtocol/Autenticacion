import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Request,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';

import { SkipJwtAuth as Public } from 'src/common/decorators/skip-guard.decorator';
import { Sep10AuthGetDto, Sep10AuthPostDto } from './dtos/auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Public()
  @Get('.well-known/stellar.toml')
  async tomlFile(@Res() res): Promise<void> {
    const toml = await this.service.getKnowFile();
    res.setHeader('content-type', 'text/plain');
    res.send(toml);
  }

  @Get('auth')
  async vibrantAuthGet(@Query() payload: Sep10AuthGetDto) {
    await this.service.checkClientDomain(payload.client_domain);
    return await this.service.vibrantAuthGet(payload);
  }

  @HttpCode(200)
  @ApiBody({ type: Sep10AuthPostDto })
  @Post('auth')
  @Public()
  async vibrantAuthPost(@Body() payload: Sep10AuthPostDto) {
    await this.service.checkTxForClientDomain(payload.transaction);
    return await this.service.vibrantAuthPost(payload);
  }

  @ApiBearerAuth()
  @Get('getWidgetUrl')
  async getWidgetUrl(@Request() req) {
    const url = await this.service.getWidgetUrl(req.user.sub);
    return {
      url: url,
    };
  }
}
