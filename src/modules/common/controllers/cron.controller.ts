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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';

import { JwtGuard } from '../../auth/auth-jwt.guard';
import { AuthPayload } from '../../auth/auth-payload.decorator';
import { AuthJwtPayload } from '../../auth/auth.dto';
import { CronService } from '../services/cron.service';

@ApiBearerAuth()
@ApiTags('cron')
@UseGuards(JwtGuard)
@Controller('common/cron')
export class CronController {
  constructor(private readonly service: CronService) {}

  @Post('trigger-cashin')
  @ApiOperation({
    summary: 'Ejecutar manualmente la validación y transferencia de USDC',
    description:
      'Dispara de forma manual la lógica del cron job que verifica los balances en USDC de las wallets configuradas con cashin activo (end/month) y realiza las transferencias correspondientes a la tesorería.',
  })
  @ApiOkResponse({
    description: 'El proceso del cron fue iniciado exitosamente.',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cron ejecutado en segundo plano' },
      },
    },
  })
  async triggerCashinCron(@AuthPayload() alfred: AuthJwtPayload) {
    await this.service.validateAdmin(alfred);
    await this.service.checkCashinWalletsBalance();
    return { ok: true, message: 'Cron ejecutado en segundo plano' };
  }

  @Post('send-matured-interest')
  @ApiOperation({
    summary: 'Envía los intereses ganados de las diferentes staking',
    description:
      'Se encarga de distribuir los intereses generados por los usuarios en las diferentes Staking',
  })
  @ApiOkResponse({
    description:
      'El proceso de recompensas por referidos fue iniciado exitosamente.',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cron ejecutado en segundo plano' },
      },
    },
  })
  async triggerReferralRewardsCron(@AuthPayload() alfred: AuthJwtPayload) {
    await this.service.validateAdmin(alfred);
    await this.service.sendMaturedInterest();
    return { ok: true, message: 'Cron ejecutado en segundo plano' };
  }
}
