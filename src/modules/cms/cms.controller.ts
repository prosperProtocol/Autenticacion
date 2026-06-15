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

import { CMSService } from './cms.service';
import { CashinDto, CreateUserEmailDto } from './cms.dto';
import { JwtGuard } from '../auth/auth-jwt.guard';
import { AuthPayload } from '../auth/auth-payload.decorator';
import { AuthJwtPayload } from '../auth/auth.dto';

@ApiBearerAuth()
@ApiTags('CMS')
@UseGuards(JwtGuard)
@Controller('cms')
export class CMSController {
  constructor(private readonly service: CMSService) { }

  @Get('treasury')
  @ApiOperation({
    summary:
      'Verificar la cantidad de activos en la wallet del tesoro de Prosper.',
    description:
      'Retorna la cantidad de activos en la wallet del tesoro de Prosper.',
  })
  @ApiOkResponse({
    description: 'Cantidad de activos en la wallet del tesoro de Prosper.',
    schema: {
      type: 'object',
      properties: {
        balanceUSDC: { type: 'number', example: 100 },
        balanceXLM: { type: 'number', example: 100 },
      },
    },
  })
  async checkTreasuryBalance(@AuthPayload() cms: AuthJwtPayload) {
    await this.service.validateAdmin(cms);
    return await this.service.checkTreasuryBalance();
  }

  @Get('users')
  @ApiOperation({
    summary:
      'Obtener todos los usuarios registrados y wallet/cashin configurado.',
    description:
      'Retorna una lista de todos los usuarios registrados con o sin una wallet asociada y su configuración de cashin.',
  })
  @ApiOkResponse({
    description: 'Lista de usuarios con wallet y configuración de cashin.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'number', example: 1 },
          email: { type: 'string', example: 'usuario@example.com' },
          address: {
            type: 'string',
            example: 'GDGH7777777777777777777777777777777777777777777777777777',
          },
          cashin: { type: 'string', example: 'end' },
        },
      },
    },
  })
  async getAllUserDetails(@AuthPayload() cms: AuthJwtPayload) {
    await this.service.validateAdmin(cms);
    return await this.service.getAllUserDetails();
  }

  @Post('cashin')
  @ApiOperation({
    summary: 'Crear wallet Stellar y registra un cashin',
    description:
      'Crea o recupera la wallet Stellar de un usuario configurando el tipo de cashin ("end" o "month"), asocia la wallet al usuario en la base de datos, y retorna sus balances.',
  })
  @ApiOkResponse({
    description: 'Información de la wallet y balances del usuario.',
    schema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          example: 'GDGH7777777777777777777777777777777777777777777777777777',
        },
        balanceUSDC: { type: 'string', example: '150.00' },
        balanceXLM: { type: 'string', example: '10.00' },
      },
    },
  })
  async cashin(
    @AuthPayload() cms: AuthJwtPayload,
    @Body() payload: CashinDto,
  ) {
    await this.service.validateAdmin(cms);
    return await this.service.cashin(payload);
  }

  @Get('staking')
  @ApiOperation({
    summary:
      'Obtener todos los registros de staking con el email del propietario',
    description:
      'Retorna todos los registros de staking del protocolo junto con el correo electrónico del propietario de la wallet vinculada.',
  })
  @ApiOkResponse({
    description:
      'Lista de registros de staking vinculados con el email del propietario.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          email: { type: 'string', example: 'usuario@example.com' },
          wallet: {
            type: 'string',
            example: 'GDGH7777777777777777777777777777777777777777777777777777',
          },
          hashDeposito: {
            type: 'string',
            example:
              'd5c2e176bfa291db68222a59e98492ffc92ea8bf5767bdf8f220df682e75e111',
          },
          hashStaking: {
            type: 'string',
            example:
              'e5c2e176bfa291db68222a59e98492ffc92ea8bf5767bdf8f220df682e75e222',
          },
          memoStaking: {
            type: 'string',
            example: '123456789',
          },
          principalAmount: { type: 'number', example: 100 },
          start: { type: 'string', example: '2026-05-19T16:15:36.000Z' },
          maturityPrincipal: {
            type: 'string',
            example: '2027-05-19',
          },
          scheduleInterest: {
            type: 'array',
            items: { type: 'string' },
            example: ['end'],
          },
          porcentajeAnual: { type: 'number', example: 10 },
          payoutAssetPrincipal: { type: 'string', example: 'USDC' },
          payoutAssetInterest: { type: 'string', example: 'USDC' },
          tokenInteres: { type: 'string', example: 'USDCp' },
          claimedInterest: { type: 'number', example: 0 },
          interesesAcumulados: { type: 'number', example: 0 },
          proyectado: { type: 'number', example: 10 },
          proximaFechaMonto: {
            type: 'object',
            properties: {
              fecha: { type: 'string', example: '2026-05-20' },
              monto: { type: 'number', example: 0.027 },
            },
          },
          InteresCada24Horas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                hash: { type: 'string', nullable: true, example: null },
                fecha: { type: 'string', nullable: true, example: null },
                monto: { type: 'number', example: 0.027 },
              },
            },
          },
          contractoId: {
            type: 'string',
            example: 'CDGH7777777777777777777777777777777777777777777777777777',
          },
          principalRedeemed: { type: 'number', example: 0 },
          createdAt: { type: 'string', example: '2026-05-19T16:15:36.000Z' },
          updatedAt: { type: 'string', example: '2026-05-19T16:15:36.000Z' },
        },
      },
    },
  })
  async getStaking(@AuthPayload() cms: AuthJwtPayload) {
    await this.service.validateAdmin(cms);
    return await this.service.getStakingRecords();
  }
}
