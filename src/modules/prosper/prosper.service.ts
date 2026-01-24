import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { StellarService } from 'src/common/services/stellar.service';
import {
  FindByFieldsResponse,
  GetTransactionsDto,
} from '../transacciones/transacciones.dto';
import { TransaccionesService } from '../transacciones/transacciones.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  CreateFundDto,
  DepositDto,
  MintDto,
  NewUserDto,
  TransferDto,
  GetAssetsResponse,
  GetBalanceResponse,
  CheckUserResponse,
} from './prosper.dto';

@Injectable()
export class ProsperService {
  private readonly logger = new Logger(ProsperService.name);

  constructor(
    private readonly stellarService: StellarService,
    private readonly transaccionesService: TransaccionesService,
    private readonly walletsService: WalletsService,
  ) {}

  private async checkUser(userId: string): Promise<CheckUserResponse> {
    this.logger.debug('checkUser called');
    const wallets = await this.walletsService.findByFields({
      prosperId: userId,
    });
    const wallet = wallets && wallets.length ? wallets[0] : null;
    if (!wallet)
      throw new NotFoundException(`Wallet for userId ${userId} not found`);
    const isTestnet = await this.stellarService.getIsTestnet();
    const balances = await this.stellarService.getAccountBalances({
      address: wallet.address,
      isTestnet,
    });
    return {
      address: balances.address,
      secret: wallet.secret,
      balanceProsper: balances.balanceProsper,
      balanceXLM: balances.balanceXLM,
    };
  }

  private async checkUserAddress(address: string): Promise<CheckUserResponse> {
    this.logger.debug('checkUserAddress called');
    const [wallet] = await this.walletsService.findByFields({ address });
    if (!wallet)
      throw new NotFoundException(`Wallet for address ${address} not found`);
    return this.checkUser(wallet.prosperId);
  }

  public async createFund(payload: CreateFundDto): Promise<any> {
    this.logger.debug('createFund called');
    const { initialAmount, homeDomain } = payload;
    // TODO: crear Issue, crear Treasury y emitir initialAmount
    throw new Error('createFund: Not implemented');
  }

  public async mintTokens(payload: MintDto): Promise<any> {
    this.logger.debug('mintTokens called');
    const { amount, reason, prosperTxId } = payload;
    // TODO: emitir tokens adicionales hacia treasury. Memo = prosperTxId
    throw new Error('mintTokens: Not implemented');
  }

  public async getAssets(isTestnet = true): Promise<GetAssetsResponse> {
    this.logger.debug('getAssets called');
    // TODO: devolver Issue y Treasury info, balances agregados
    return {
      issue: { address: 'TODO_ISSUER_ADDRESS', assetCode: 'PROSPER' },
      treasury: { address: 'TODO_TREASURY_ADDRESS', balance: '0' },
    };
  }

  public async createOrEnsureUser(payload: NewUserDto): Promise<any> {
    this.logger.debug('createOrEnsureUser called');
    const { userReferenceId, prosperTxId } = payload;
    // TODO: crear wallet si no existe, fondear con XLM y agregar trustline al Issue
    throw new Error('createOrEnsureUser: Not implemented');
  }

  public async deposit(payload: DepositDto): Promise<any> {
    this.logger.debug('deposit called');
    const { userReferenceId, address, amount, prosperTxId } = payload;
    if (!userReferenceId && !address) {
      throw new BadRequestException('userReferenceId or address is required');
    }
    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    const user = userReferenceId
    ? await this.checkUser(userReferenceId)
    : await this.checkUserAddress(address);
    const isTestnet = await this.stellarService.getIsTestnet();
    const teasureKey = await this.stellarService.getProsperTeasury(isTestnet);
    const tx = await this.stellarService.makeProsperTransaction({
      sourcePrivateKey: teasureKey.secret(),
      receiverPublicKey: user.address,
      amount,
      isTestnet,
      memo: prosperTxId || ' ',
    });
    // TODO Guardar en la base de datos
    return tx;
  }

  public async transfer(payload: TransferDto): Promise<any> {
    this.logger.debug('transfer called');
    const { fromUserId, toUserId, amount, prosperTxId, metadata } = payload;
    const fromUser = await this.checkUser(fromUserId);
    const toUser = await this.checkUser(toUserId);
    if (fromUser.balanceProsper < amount) {
      throw new BadRequestException('Insufficient balance for transfer');
    }
    const tx = await this.stellarService.makeProsperTransaction({
      sourcePrivateKey: fromUser.secret,
      receiverPublicKey: toUser.address,
      amount,
      isTestnet: await this.stellarService.getIsTestnet(),
      memo: prosperTxId || ' ',
    });
    // TODO Guardar en la base de datos
    return tx;
  }

  public async getBalance(userId: string): Promise<GetBalanceResponse> {
    this.logger.debug('getBalance called');
    const user = await this.checkUser(userId);
    const { secret, ...balanceInfo } = user;
    return balanceInfo;
  }

  public async getTransactions(
    payload: GetTransactionsDto,
  ): Promise<FindByFieldsResponse> {
    this.logger.debug('getUserTransactions called');
    return this.transaccionesService.findByFields(payload);
  }
}
