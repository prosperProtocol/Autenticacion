import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';

import {
  Transacciones,
  TransferStatus,
  TxType,
  WebhookStatus,
} from 'src/entities/transacciones.entity';

import { MakeProsperTransactionResponse } from 'src/common/dto/stellar.dto';
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
  CreateFundResponse,
} from './prosper.dto';

@Injectable()
export class ProsperService {
  private readonly logger = new Logger(ProsperService.name);

  constructor(
    private readonly stellarService: StellarService,
    private readonly transaccionesService: TransaccionesService,
    private readonly walletsService: WalletsService,
  ) {}

  private async checkUser(prosperId: string): Promise<CheckUserResponse> {
    this.logger.debug('llamando checkUser');
    try {
      const wallets = await this.walletsService.findByFields({
        prosperId: prosperId,
      });
      const wallet = wallets && wallets.length ? wallets[0] : null;
      if (!wallet)
        throw new NotFoundException(
          `Wallet para prosperId ${prosperId} no encontrada`,
        );
      const isTestnet = await this.stellarService.getIsTestnet();
      const balances = await this.stellarService.getAccountBalances({
        address: wallet.address,
        isTestnet,
      });
      return {
        address: balances.address,
        secret: wallet.secret,
        balanceUSDC: balances.balanceUSDC,
        balanceXLM: balances.balanceXLM,
      };
    } catch (error) {
      this.logger.error(
        `Error en checkUser: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error verificando la wallet del usuario',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async checkUserAddress(address: string): Promise<CheckUserResponse> {
    this.logger.debug('llamando checkUserAddress');
    try {
      const [wallet] = await this.walletsService.findByFields({ address });
      if (!wallet) {
        this.logger.error(`Wallet para address ${address} no encontrada`);
        throw new NotFoundException(
          `Wallet para address ${address} no encontrada`,
        );
      }
      return this.checkUser(wallet.prosperId);
    } catch (error) {
      this.logger.error(
        `Error en checkUserAddress: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error verificando la wallet por address',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async makeTreasury() {
    this.logger.debug('makeTreasury called');
    try {
      const isTestnet = await this.stellarService.getIsTestnet();
      const newTreasury =
        await this.stellarService.createProsperTreasury(isTestnet);
      const treasury = Keypair.fromSecret(newTreasury.secretKey);
      const newWallet = await this.walletsService.create({
        prosperId: 'treasury',
        address: treasury.publicKey(),
        secret: 'N/A',
      });
      return { secret: newTreasury.secretKey, walletId: newWallet.id };
    } catch (error) {
      this.logger.error(
        `Error en makeTreasury: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error creando la treasury de Prosper',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async createFund(payload: CreateFundDto): Promise<CreateFundResponse> {
    this.logger.debug('createFund called');
    try {
      const { initialAmount, homeDomain, prosperTxId } = payload;
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      const isTestnet = await this.stellarService.getIsTestnet();
      let issuer = this.stellarService.getProsperIssuer(isTestnet);
      let response: CreateFundResponse;
      try {
        const account = await this.stellarService
          .getServer(isTestnet)
          .loadAccount(issuer.publicKey());
        if (!account) {
          throw new BadRequestException(
            'Error PROSPER issuer account does not exist on Stellar network',
          );
        }
        if (homeDomain && account.home_domain !== homeDomain) {
          await this.stellarService.addHomeDomainToIssuer(
            issuer.secret(),
            homeDomain,
            isTestnet,
          );
        }
        response = {
          publicKey: issuer.publicKey(),
          secretKey: undefined,
          homeDomain: account.home_domain,
        };
        const [fromWallet] = await this.walletsService.findByFields({
          address: issuer.publicKey(),
        });
        if (initialAmount && Number(initialAmount) > 0) {
          const treasury = this.stellarService.getProsperTeasury(isTestnet);
          const asset = this.stellarService.getUSDCAsset(isTestnet).code;
          const [newWallet] = await this.walletsService.findByFields({
            address: treasury.publicKey(),
          });
          if (!newWallet) {
            throw new BadRequestException(
              'Treasury wallet no encontrada en la base de datos',
            );
          }
          // const tx = await this.stellarService.makeProsperTransaction({
          //   sourcePrivateKey: issuer.secret(),
          //   receiverPublicKey: treasury.publicKey(),
          //   amount: initialAmount,
          //   isTestnet,
          //   memo: prosperTxId,
          // });
          // response.ledger = tx && tx.ledger ? tx.ledger : undefined;
          // response.txHash = tx && tx.txHash ? tx.txHash : undefined;
          // response.successful = tx && tx.successful ? tx.successful : undefined;
          // const data = new Transacciones();
          // data.amount = parseFloat(initialAmount);
          // data.asset = asset;
          // data.from = issuer.publicKey();
          // data.to = treasury.publicKey();
          // data.memo = prosperTxId;
          // data.status = tx.successful
          //   ? TransferStatus.Completada
          //   : TransferStatus.Pendiente;
          // data.txType = TxType.Mint;
          // data.txHash = tx.successful ? tx.txHash : null;
          // data.webhookStatus = WebhookStatus.Pendiente;
          // data.walletFromId = fromWallet.id;
          // data.walletToId = newWallet.id;
          // await this.transaccionesService.create(data);
        }
        return response;
      } catch (error) {
        this.logger.error(`Error createProsperIssuer failed, error: `, error);
        throw new BadRequestException('Error creating Prosper issuer account');
      }
    } catch (error) {
      this.logger.error(
        `Error en createFund: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error creando el fondo Prosper',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async mintTokens(
    payload: MintDto,
  ): Promise<MakeProsperTransactionResponse> {
    this.logger.debug('mintTokens called');
    try {
      const { amount, reason, prosperTxId } = payload;
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      try {
        const isTestnet = await this.stellarService.getIsTestnet();
        const issuer = this.stellarService.getProsperIssuer(isTestnet);
        const treasury = this.stellarService.getProsperTeasury(isTestnet);
        if (!issuer || !treasury) {
          throw new BadRequestException(
            'Falta configurar issuer o treasury de PROSPER',
          );
        }
        const [toWallet] = await this.walletsService.findByFields({
          address: issuer.publicKey(),
        });
        const [fromWallet] = await this.walletsService.findByFields({
          address: treasury.publicKey(),
        });
        if (!fromWallet || !toWallet) {
          throw new BadRequestException(
            'Issuer o Treasury wallet no encontrados en la base de datos',
          );
        }
        // const asset = this.stellarService.getUSDCAsset(isTestnet).code;
        // const tx = await this.stellarService.makeProsperTransaction({
        //   sourcePrivateKey: issuer.secret(),
        //   receiverPublicKey: treasury.publicKey(),
        //   amount,
        //   isTestnet,
        //   memo: prosperTxId,
        // });
        // const data = new Transacciones();
        // data.amount = parseFloat(amount);
        // data.asset = asset;
        // data.from = issuer.publicKey();
        // data.to = treasury.publicKey();
        // data.memo = prosperTxId;
        // data.status = tx.successful
        //   ? TransferStatus.Completada
        //   : TransferStatus.Pendiente;
        // data.txType = TxType.Mint;
        // data.txHash = tx.successful ? tx.txHash : null;
        // data.webhookStatus = WebhookStatus.Pendiente;
        // data.walletFromId = toWallet.id;
        // data.walletToId = fromWallet.id;
        // if (reason) {
        //   data.extra = { reason };
        // }
        // await this.transaccionesService.create(data);
        // return tx;
        return {
          txHash: null,
          ledger: null,
          successful: false,
        };
      } catch (error) {
        this.logger.error(`Error mintTokens failed, error: `, error);
        throw new BadRequestException('Error minting Prosper tokens');
      }
    } catch (error) {
      this.logger.error(
        `Error en mintTokens: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error minting Prosper tokens',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async getAssets(): Promise<GetAssetsResponse> {
    this.logger.debug('getAssets called');
    try {
      const isTestnet = await this.stellarService.getIsTestnet();
      const assetCode = this.stellarService.getUSDCAsset(isTestnet);
      const issuer = this.stellarService.getProsperIssuer(isTestnet);
      const [issuerWallet] = await this.walletsService.findByFields({
        address: issuer.publicKey(),
      });
      if (!issuerWallet) {
        throw new NotFoundException('Issuer wallet no encontrada en la DB');
      }
      const treasury = this.stellarService.getProsperTeasury(isTestnet);
      const [treasuryWallet] = await this.walletsService.findByFields({
        address: treasury.publicKey(),
      });
      if (!treasuryWallet) {
        throw new NotFoundException('Treasury wallet no encontrada en la DB');
      }
      const balance = await this.stellarService.getAccountBalances({
        address: treasury.publicKey(),
        isTestnet,
      });
      return {
        issue: {
          prosperId: issuerWallet.prosperId,
          address: issuer.publicKey(),
          assetCode: assetCode.code,
        },
        treasury: {
          prosperId: treasuryWallet.prosperId,
          address: treasury.publicKey(),
          balance: balance.balanceUSDC,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en getAssets: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo los activos de Prosper');
    }
  }

  public async createOrEnsureUser(
    payload: NewUserDto,
  ): Promise<GetBalanceResponse> {
    this.logger.debug('createOrEnsureUser called');
    try {
      const { userReferenceId, prosperTxId } = payload;
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      const isTestnet = await this.stellarService.getIsTestnet();
      const wallets = await this.walletsService.findByFields({
        prosperId: userReferenceId,
      });
      const wallet = wallets && wallets.length ? wallets[0] : null;
      if (!wallet) {
        const newWallet = Keypair.random();
        await this.stellarService.createAccountWithBalance(
          newWallet,
          isTestnet,
        );
        await this.stellarService.addUSDCTrustLine(newWallet, isTestnet);
        await this.walletsService.create({
          prosperId: userReferenceId,
          address: newWallet.publicKey(),
          secret: newWallet.secret(),
        });
        this.logger.debug(
          `New wallet created for userReferenceId ${userReferenceId}: ` +
            `address ${newWallet.publicKey()}`,
        );
        if (isTestnet) {
          this.logger.debug(`secret: ${newWallet.secret()}`);
        }
      }
      return this.getBalance(userReferenceId);
    } catch (error) {
      this.logger.error(
        `Error en createOrEnsureUser: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error creando o verificando la wallet del usuario',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async deposit(payload: DepositDto): Promise<Partial<Transacciones>> {
    this.logger.debug('llamando deposit');
    try {
      const { userReferenceId, address, amount, prosperTxId } = payload;
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      if (!userReferenceId && !address) {
        throw new BadRequestException('userReferenceId o address es requerido');
      }
      if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequestException('amount debe ser un número positivo');
      }
      const user = userReferenceId
        ? await this.checkUser(userReferenceId)
        : await this.checkUserAddress(address);
      const isTestnet = await this.stellarService.getIsTestnet();
      const teasureKey = this.stellarService.getProsperTeasury(isTestnet);
      const [fromWallet] = await this.walletsService.findByFields({
        address: user.address,
      });
      const [toWallet] = await this.walletsService.findByFields({
        address: teasureKey.publicKey(),
      });
      if (!fromWallet || !toWallet) {
        throw new BadRequestException(
          'Error: fromWallet o toWallet no encontrado en la base de datos',
        );
      }
      const tx = await this.stellarService.makeUSDCTransaction({
        sourcePrivateKey: teasureKey.secret(),
        receiverPublicKey: user.address,
        amount,
        isTestnet,
        memo: prosperTxId || ' ',
      });
      const data = new Transacciones();
      data.amount = parseFloat(amount);
      data.asset = this.stellarService.getUSDCAsset(
        await this.stellarService.getIsTestnet(),
      ).code;
      data.from = teasureKey.publicKey();
      data.to = user.address;
      data.memo = prosperTxId;
      data.status = tx.successful
        ? TransferStatus.Completada
        : TransferStatus.Pendiente;
      data.txType = TxType.Depósito;
      data.txHash = tx.successful ? tx.txHash : null;
      data.webhookStatus = WebhookStatus.Pendiente;
      data.walletFromId = fromWallet.id;
      data.walletToId = toWallet.id;
      await this.transaccionesService.create(data);
      return tx;
    } catch (error) {
      this.logger.error(
        `Error en deposit: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error procesando depósito',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async retire(payload: DepositDto): Promise<Partial<Transacciones>> {
    this.logger.debug('llamando retire');
    try {
      const { userReferenceId, address, amount, prosperTxId } = payload;
      if (!userReferenceId && !address) {
        throw new BadRequestException('userReferenceId o address es requerido');
      }
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequestException('amount debe ser un número positivo');
      }
      const user = userReferenceId
        ? await this.checkUser(userReferenceId)
        : await this.checkUserAddress(address);
      const isTestnet = await this.stellarService.getIsTestnet();
      const teasureKey = this.stellarService.getProsperTeasury(isTestnet);
      const balance = await this.stellarService.getAccountBalances({
        address: user.address,
        isTestnet,
      });
      if (Number(balance.balanceUSDC) < Number(amount)) {
        this.logger.error('Saldo insuficiente para retiro');
        throw new BadRequestException('Saldo insuficiente para retiro');
      }
      const [fromWallet] = await this.walletsService.findByFields({
        address: user.address,
      });
      const [toWallet] = await this.walletsService.findByFields({
        address: teasureKey.publicKey(),
      });
      if (!fromWallet || !toWallet) {
        throw new BadRequestException(
          'Error No encontrado fromWallet o toWallet en la DB',
        );
      }
      const tx = await this.stellarService.makeUSDCTransaction({
        sourcePrivateKey: user.secret,
        receiverPublicKey: teasureKey.publicKey(),
        amount,
        isTestnet,
        memo: prosperTxId || ' ',
      });
      const data = new Transacciones();
      data.amount = parseFloat(amount);
      data.asset = this.stellarService.getUSDCAsset(isTestnet).code;
      data.from = user.address;
      data.to = teasureKey.publicKey();
      data.memo = prosperTxId;
      data.status = tx.successful
        ? TransferStatus.Completada
        : TransferStatus.Pendiente;
      data.txType = TxType.Retiro;
      data.txHash = tx.successful ? tx.txHash : null;
      data.webhookStatus = WebhookStatus.Pendiente;
      data.walletFromId = fromWallet.id;
      data.walletToId = toWallet.id;
      await this.transaccionesService.create(data);
      return tx;
    } catch (error) {
      this.logger.error(
        `Error en retiro: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error procesando retiro');
    }
  }

  public async transfer(payload: TransferDto): Promise<Partial<Transacciones>> {
    this.logger.debug('llamando transfer');
    try {
      const { fromUserId, toUserId, amount, prosperTxId, metadata } = payload;
      if (!prosperTxId || prosperTxId.trim() === '') {
        throw new BadRequestException('prosperTxId es requerido');
      }
      const fromUser = await this.checkUser(fromUserId);
      const toUser = await this.checkUser(toUserId);
      if (Number(fromUser.balanceUSDC) < Number(amount)) {
        this.logger.error('Saldo insuficiente para transferencia');
        throw new BadRequestException('Saldo insuficiente para transferencia');
      }
      const tx = await this.stellarService.makeUSDCTransaction({
        sourcePrivateKey: fromUser.secret,
        receiverPublicKey: toUser.address,
        amount,
        isTestnet: await this.stellarService.getIsTestnet(),
        memo: prosperTxId || ' ',
      });
      const [fromWallet] = await this.walletsService.findByFields({
        address: fromUser.address,
      });
      const [toWallet] = await this.walletsService.findByFields({
        address: toUser.address,
      });
      if (!fromWallet || !toWallet) {
        throw new BadRequestException(
          'Error No encontrado fromWallet o toWallet en la DB',
        );
      }
      const data = new Transacciones();
      data.amount = parseFloat(amount);
      data.asset = this.stellarService.getUSDCAsset(
        await this.stellarService.getIsTestnet(),
      ).code;
      data.from = fromUser.address;
      data.to = toUser.address;
      data.memo = prosperTxId;
      data.status = tx.successful
        ? TransferStatus.Completada
        : TransferStatus.Pendiente;
      data.txType = TxType.Transferencia;
      data.txHash = tx.successful ? tx.txHash : null;
      data.webhookStatus = WebhookStatus.Pendiente;
      data.walletFromId = fromWallet.id;
      data.walletToId = toWallet.id;
      if (metadata) {
        data.extra = { metadata };
      }
      await this.transaccionesService.create(data);
      return tx;
    } catch (error) {
      this.logger.error(
        `Error en transfer: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error procesando transferencia',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async getBalance(prosperId: string): Promise<GetBalanceResponse> {
    this.logger.debug('getBalance called');
    try {
      const user = await this.checkUser(prosperId);
      const { secret, ...balanceInfo } = user;
      const _secret = secret;
      return balanceInfo;
    } catch (error) {
      this.logger.error(
        `Error en getBalance: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error obteniendo balance',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async getTransactions(
    payload: GetTransactionsDto,
  ): Promise<FindByFieldsResponse> {
    this.logger.debug('llamando getUserTransactions');
    try {
      return this.transaccionesService.findByFields(payload);
    } catch (error) {
      this.logger.error(
        `Error en getUserTransactions: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error obteniendo transacciones del usuario',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
