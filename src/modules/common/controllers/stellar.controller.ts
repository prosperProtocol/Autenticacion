import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Keypair } from '@stellar/stellar-sdk';

import { StellarService } from '../../../common/services/stellar.service';
import {
  GetAccountBalancesDto,
  IssueProsperToTreasuryDto,
  MakeProsperTransactionDto,
  PublicKeyDto,
} from '../../../common/dto/stellar.dto';
import { EncryptPrivateKeyDto } from 'src/common/dto/crypto.dto';

@ApiBearerAuth()
@ApiTags('Stellar')
@Controller('common/stellar')
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

  @Get('prosper-treasury')
  @ApiOperation({ summary: 'Obtener la llave pública del treasury de PROSPER' })
  getProsperTeasury(@Query('isTestnet', ParseBoolPipe) isTestnet: boolean) {
    const treasury = this.stellarService.getProsperTeasury(isTestnet);
    return treasury.publicKey || null;
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
  async addIssuersTrustLine(
    @Body('secretKey') secretKey: string,
    @Body('isTestnet') isTestnet: boolean,
  ) {
    const keypair = Keypair.fromSecret(secretKey);
    return await this.stellarService.addIssuersTrustLine(keypair, isTestnet);
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

  @Post('account-balances')
  @ApiOperation({ summary: 'Obtener los balances de una cuenta' })
  async getAccountBalances(@Body() payload: GetAccountBalancesDto) {
    return await this.stellarService.getAccountBalances(payload);
  }

  @Post('make-usdc-transaction')
  @ApiOperation({ summary: 'Realizar una transacción de USDC/PROSPER' })
  async makeTransaction(@Body() payload: MakeProsperTransactionDto) {
    return await this.stellarService.makeTransaction(payload);
  }

  @Post('encrypt-stellar-private-key')
  @ApiOperation({ summary: 'Encriptar una llave privada de stellar' })
  async encryptStellarPrivateKey(@Body() payload: EncryptPrivateKeyDto) {
    return await this.stellarService.encryptStellarPrivateKey(payload);
  }

  @Post('last-asset-payment')
  @ApiBody({ type: PublicKeyDto })
  @ApiOperation({ summary: 'Obtener el último pago de un activo' })
  async getLastAssetPayment(@Body() payload: PublicKeyDto) {
    return await this.stellarService.getLastAssetPayment(payload.publicKey);
  }
}
