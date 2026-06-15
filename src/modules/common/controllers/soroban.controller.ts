import { Body, Controller, Get, Logger, Post, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { SorobanService } from '../../../common/services/soroban.service';

@ApiBearerAuth()
@ApiTags('Soroban')
@Controller('common/soroban')
export class SorobanController {
  private readonly logger = new Logger(SorobanController.name);
  constructor(private readonly sorobanService: SorobanService) {}

  @Get('check-network')
  @ApiOperation({ summary: 'Verificar la red (testnet o mainnet)' })
  checkNetwork() {
    return { isTestnet: this.sorobanService.checkNetwork() };
  }

  @Get('smart-contract-details')
  @ApiOperation({ summary: 'Obtener detalles del smart contract' })
  async getSmartContractDetails() {
    const details = await this.sorobanService.getSmartContractDetails();
    // this.logger.debug('Details:', details);
    return { token: details.usdcToken, locking: details.locking };
  }

  @Get('result-contract')
  @ApiOperation({ summary: 'Obtener el resultado de un contrato Soroban' })
  @ApiQuery({ name: 'transactionHash', type: 'string', required: true })
  async getResultSorobanContract(
    @Query('transactionHash') transactionHash: string,
  ) {
    return await this.sorobanService.getResultSorobanContract(transactionHash);
  }

  @Get('balance-usdcprosper')
  @ApiOperation({ summary: 'Obtener el balance de USDCprosper' })
  @ApiQuery({ name: 'address', type: 'string', required: true })
  async getBalanceUSDCprosper(@Query('address') address: string) {
    return await this.sorobanService.getBalanceUSDCprosper(address);
  }

  @Post('mint-usdcprosper')
  @ApiOperation({ summary: 'Mintear USDCprosper' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        amount: { type: 'number' },
      },
    },
  })
  async mintUSDCprosper(
    @Body('address') address: string,
    @Body('amount') amount: number,
  ) {
    return await this.sorobanService.mintUSDCprosper(address, amount);
  }

  @Post('burn-usdcprosper')
  @ApiOperation({ summary: 'Quemar USDCprosper' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string' },
        amount: { type: 'number' },
        privateKey: { type: 'string' },
      },
    },
  })
  async burnUSDCprosper(
    @Body('address') address: string,
    @Body('amount') amount: number,
    @Body('privateKey') privateKey: string,
  ) {
    return await this.sorobanService.burnUSDCprosper(
      address,
      amount,
      privateKey,
    );
  }

  @Post('set-pct')
  @ApiOperation({ summary: 'Configurar un porcentaje de rendimiento' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        pct: { type: 'number' },
      },
    },
  })
  async setPct(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('pct') pct: number,
  ) {
    return await this.sorobanService.setPct(sourceSecret, contractId, pct);
  }

  @Post('set-strat')
  @ApiOperation({
    summary: 'Establecer o inicializar una estrategia de staking',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
        amount: { type: 'string' },
        token_id: { type: 'string' },
      },
    },
  })
  async setStrat(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
    @Body('amount') amount: string,
    @Body('token_id') token_id: string,
  ) {
    return await this.sorobanService.setStrat(
      sourceSecret,
      contractId,
      user,
      memo,
      amount,
      token_id,
    );
  }

  @Post('all-strats')
  @ApiOperation({ summary: 'Obtiene todas las estrategias de un usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
      },
    },
  })
  async getAllStrats(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
  ) {
    return await this.sorobanService.getAllStrats(
      sourceSecret,
      contractId,
      user,
    );
  }

  @Post('get-strat')
  @ApiOperation({ summary: 'Obtiene la estrategia de un usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
      },
    },
  })
  async getStrat(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
  ) {
    return await this.sorobanService.getStrat(
      sourceSecret,
      contractId,
      user,
      memo,
    );
  }

  @Post('end-stkg')
  @ApiOperation({ summary: 'Verificar y finaliza la estrategia de staking' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
      },
    },
  })
  async endStkg(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
  ) {
    return await this.sorobanService.endStkg(
      sourceSecret,
      contractId,
      user,
      memo,
    );
  }

  @Post('get-apy')
  @ApiOperation({
    summary: 'Consultar el contrato de distribución para obtener el APY',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
      },
    },
  })
  async getApy(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
  ) {
    return await this.sorobanService.getApy(
      sourceSecret,
      contractId,
      user,
      memo,
    );
  }

  @Post('accrue')
  @ApiOperation({ summary: 'Añadir o acumular rendimiento/fondos' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
        amount: { type: 'string' },
      },
    },
  })
  async accrue(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
    @Body('amount') amount: string,
  ) {
    return await this.sorobanService.accrue(
      sourceSecret,
      contractId,
      user,
      memo,
      amount,
    );
  }

  @Post('set-s-exp')
  @ApiOperation({ summary: 'Cambiar el estado de la estrategia a Expirada' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
      },
    },
  })
  async setSExp(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
  ) {
    return await this.sorobanService.setSExp(
      sourceSecret,
      contractId,
      user,
      memo,
    );
  }

  @Post('set-s-cmp')
  @ApiOperation({ summary: 'Cambiar el estado de la estrategia a Completada' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
      },
    },
  })
  async setSCmp(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
  ) {
    return await this.sorobanService.setSCmp(
      sourceSecret,
      contractId,
      user,
      memo,
    );
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Ejecutar el retiro de fondos o rendimientos' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceSecret: { type: 'string' },
        contractId: { type: 'string' },
        amount: { type: 'string' },
        user: { type: 'string' },
        memo: { type: 'number' },
        token_id: { type: 'string' },
      },
    },
  })
  async withdraw(
    @Body('sourceSecret') sourceSecret: string,
    @Body('contractId') contractId: string,
    @Body('amount') amount: string,
    @Body('user') user: string,
    @Body('memo') memo: number,
    @Body('token_id') token_id: string,
  ) {
    return await this.sorobanService.withdraw(
      sourceSecret,
      contractId,
      amount,
      user,
      memo,
      token_id,
    );
  }
}
