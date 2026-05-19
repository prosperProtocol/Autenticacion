import { Body, Controller, Get, Post, Query, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Keypair } from '@stellar/stellar-sdk';

import { StellarService } from '../../common/services/stellar.service';
import {
  GetAccountBalancesDto,
  IssueProsperToTreasuryDto,
  MakeProsperTransactionDto,
} from '../../common/dto/stellar.dto';

@ApiBearerAuth()
@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(private readonly stellarService: StellarService) {}

  @Get('server')
  @ApiOperation({ summary: 'Obtener la URL del servidor Horizon' })
  getServer(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const server = this.stellarService.getServer(isTestnet);
    return { serverUrl: server.serverURL.toString() };
  }

  @Get('network-passphrase')
  @ApiOperation({ summary: 'Obtener el passphrase de la red' })
  getNetworkPassphrase(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    return { passphrase: this.stellarService.getNetworkPassphrase(isTestnet) };
  }

  @Get('usdc-asset')
  @ApiOperation({ summary: 'Obtener el Asset USDC configurado' })
  getUSDCAsset(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const asset = this.stellarService.getUSDCAsset(isTestnet);
    return { code: asset.getCode(), issuer: asset.getIssuer() };
  }

  @Get('prosper-asset')
  @ApiOperation({ summary: 'Obtener el Asset PROSPER configurado' })
  getProsperAsset(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const asset = this.stellarService.getProsperAsset(isTestnet);
    return { code: asset.getCode(), issuer: asset.getIssuer() };
  }

  @Get('prosper-issuer')
  @ApiOperation({ summary: 'Obtener la llave pública del issuer de PROSPER' })
  getProsperIssuer(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const keypair = this.stellarService.getProsperIssuer(isTestnet);
    return { publicKey: keypair.publicKey() };
  }

  @Get('prosper-treasury')
  @ApiOperation({ summary: 'Obtener la llave pública del treasury de PROSPER' })
  getProsperTeasury(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const keypair = this.stellarService.getProsperTeasury(isTestnet);
    return keypair ? { publicKey: keypair.publicKey() } : null;
  }

  @Post('create-account-with-balance')
  @ApiOperation({ summary: 'Crear una cuenta con balance inicial' })
  async createAccountWithBalance(
    @Body('secretKey') secretKey: string,
    @Body('isTestnet') isTestnet: boolean,
  ) {
    const keypair = Keypair.fromSecret(secretKey);
    return await this.stellarService.createAccountWithBalance(
      keypair,
      isTestnet,
    );
  }

  @Post('add-usdc-trustline')
  @ApiOperation({ summary: 'Añadir trustline de USDC a una cuenta' })
  async addUSDCTrustLine(
    @Body('secretKey') secretKey: string,
    @Body('isTestnet') isTestnet: boolean,
  ) {
    const keypair = Keypair.fromSecret(secretKey);
    return await this.stellarService.addUSDCTrustLine(keypair, isTestnet);
  }

  @Post('add-home-domain-to-issuer')
  @ApiOperation({ summary: 'Añadir un home domain al issuer' })
  async addHomeDomainToIssuer(
    @Body('issuerSecret') issuerSecret: string,
    @Body('homeDomain') homeDomain: string,
    @Body('isTestnet') isTestnet: boolean,
  ) {
    return await this.stellarService.addHomeDomainToIssuer(
      issuerSecret,
      homeDomain,
      isTestnet,
    );
  }

  @Get('is-testnet')
  @ApiOperation({
    summary: 'Verificar si el entorno está configurado para testnet',
  })
  async getIsTestnet() {
    const isTestnet = await this.stellarService.getIsTestnet();
    return { isTestnet };
  }

  @Post('create-user-wallet')
  @ApiOperation({ summary: 'Crear una nueva billetera de usuario' })
  async createUserWallet(@Body('isTestnet') isTestnet: boolean) {
    return await this.stellarService.createUserWallet(isTestnet);
  }

  @Post('create-prosper-treasury')
  @ApiOperation({ summary: 'Crear la cuenta treasury de PROSPER' })
  async createProsperTreasury(@Body('isTestnet') isTestnet: boolean) {
    return await this.stellarService.createProsperTreasury(isTestnet);
  }

  @Post('issue-prosper-to-treasury')
  @ApiOperation({ summary: 'Emitir PROSPER al treasury' })
  async issueProsperToTreasury(@Body() payload: IssueProsperToTreasuryDto) {
    return await this.stellarService.issueProsperToTreasury(payload);
  }

  @Post('account-balances')
  @ApiOperation({ summary: 'Obtener los balances de una cuenta' })
  async getAccountBalances(@Body() payload: GetAccountBalancesDto) {
    return await this.stellarService.getAccountBalances(payload);
  }

  @Post('make-usdc-transaction')
  @ApiOperation({ summary: 'Realizar una transacción de USDC/PROSPER' })
  async makeUSDCTransaction(@Body() payload: MakeProsperTransactionDto) {
    return await this.stellarService.makeUSDCTransaction(payload);
  }
}
