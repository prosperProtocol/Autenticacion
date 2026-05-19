import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { AlfredService } from './alfred.service';
import { CashinDto, CreateUserEmailDto } from './alfred.dto';
import { JwtGuard } from '../auth/auth-jwt.guard';
import { AuthPayload } from '../auth/auth-payload.decorator';
import { AuthJwtPayload } from '../auth/auth.dto';

@ApiBearerAuth()
@ApiTags('Alfred')
@UseGuards(JwtGuard)
@Controller('alfred')
export class AlfredController {
  constructor(private readonly alfredService: AlfredService) {}

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario por correo electrónico' })
  async createUser(
    @AuthPayload() alfred: AuthJwtPayload,
    @Body() payload: CreateUserEmailDto,
  ) {
    await this.alfredService.validateAdmin(alfred);
    return await this.alfredService.createUser(payload.email);
  }

  @Post('cashin')
  @ApiOperation({ summary: 'Ejecutar cashin para un usuario' })
  async cashin(
    @AuthPayload() alfred: AuthJwtPayload,
    @Body() payload: CashinDto,
  ) {
    await this.alfredService.validateAdmin(alfred);
    return await this.alfredService.cashin(payload);
  }

  @Get('staking')
  @ApiOperation({
    summary:
      'Obtener todos los registros de staking con el email del propietario',
  })
  async getStaking(@AuthPayload() alfred: AuthJwtPayload) {
    await this.alfredService.validateAdmin(alfred);
    return await this.alfredService.getStakingRecords();
  }

  @Post('cron/trigger-cashin')
  @ApiOperation({
    summary: 'Ejecutar manualmente la validación y transferencia de USDC',
  })
  async triggerCashinCron(@AuthPayload() alfred: AuthJwtPayload) {
    await this.alfredService.validateAdmin(alfred);
    await this.alfredService.checkCashinWalletsBalance();
    return { ok: true, message: 'Cron ejecutado en segundo plano' };
  }
}
