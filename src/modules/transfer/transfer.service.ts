import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { sub } from 'date-fns';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Transacciones } from 'src/common/entities/transacciones.entity';
import { User } from 'src/common/entities/user.entity';
import { Wallets } from 'src/common/entities/wallets';

import { StellarService } from 'src/common/services/stellar.service';
import {
  CheckBalanceResponseDto,
  DepositRequestResponseDto,
  MakeWithdrawRequestDto,
  MovementReportRequestDto,
  MovementReportResponseDto,
  WithdrawResponseDto,
} from 'src/modules/transfer/dtos/transfer.dto';
import {
  CheckStellarOperationsDto,
  MakeTransactionDto,
  SendStellarTransactionDto,
} from 'src/common/dtos/stellar.dto';
// import { CheckAccountDetailsResponse } from 'src/common/dtos/stellar.responses';

@Injectable()
export class TransferService {
  public readonly collectingWallet: string;
  public readonly name = this.constructor.name;
  private readonly isLocal: boolean;
  protected logger: Logger;

  constructor(
    @InjectRepository(Transacciones)
    private readonly transRepo: Repository<Transacciones>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Wallets)
    private walletsRepo: Repository<Wallets>,
    private readonly configService: ConfigService,
    private readonly stellarService: StellarService,
  ) {
    const dbUrl = this.configService.get<string>('config.database.url');
    this.isLocal = dbUrl?.includes('localhost') ?? false;

    const stellarConfig = this.configService.get('config.stellar');
    this.collectingWallet = stellarConfig?.collectingWallet ?? '';
    this.logger = new Logger(this.name, {
      timestamp: true,
    });
  }

  /**
   * Validar balance del usuario logueado
   */
  async checkBalance(userId: number): Promise<CheckBalanceResponseDto> {
    const sql = `
      select
        w.id,
        w.memo,
        w.balance,
        w.status
      from wallets w
      join users u on u.id = w."userId"
      where u.id = $1 and u.status = 'active'
      and w."deletedAt" is null and w.asset = 'USDC'
      limit 1;
    `;

    const user = await this.usersRepo.query(sql, [userId]);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado o no está activo');
    }

    return {
      id: user.id,
      memo: user.memo,
      balance: Number(user.balance),
      status: user.status,
    };
  }

  /**
   * Realizar retiro si hay balance suficiente
   */
  async makeWithdraw(
    userId: number,
    payload: MakeWithdrawRequestDto,
  ): Promise<WithdrawResponseDto> {
    const balance = await this.checkBalance(userId);

    if (!balance) {
      throw new NotFoundException('Usuario no encontrado o no está activo');
    }

    const currentBalance = balance.balance;
    const withdrawAmount = Number(payload.amount);

    if (withdrawAmount > currentBalance) {
      throw new BadRequestException('Fondos insuficientes');
    }
    const updateQuery = `
      update wallets
      set balance = $1
      where asset = $2
      and chain = $3
      and userId = $4;
    `;
    const newBalance = currentBalance - withdrawAmount;
    await this.walletsRepo.query(updateQuery, [
      newBalance,
      'USDC',
      'stellar',
      userId,
    ]);

    return {
      memo: balance.memo,
      balance: newBalance,
      status: balance.status,
    };
  }

  /**
   * Solicitar depósito: devolver memo y dirección collecting wallet
   */
  async requestDeposit(userId: number): Promise<DepositRequestResponseDto> {
    const balance = await this.checkBalance(userId);

    if (!balance) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      memo: balance.memo,
      collectingWallet: this.collectingWallet,
    };
  }

  /**
   * Reporte de movimientos (paginated)
   */
  async movementReport(
    userId: number,
    payload: MovementReportRequestDto,
  ): Promise<MovementReportResponseDto> {
    const [data, total] = await this.transRepo.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: (payload.page - 1) * payload.limit,
      take: payload.limit,
    });

    return { data, total };
  }

  private async saveStellarOperations(
    payload: CheckStellarOperationsDto[],
  ): Promise<Transacciones[]> {
    const txType = 'payment';
    const chain = 'stellar';
    const txStatus = 'pending';

    let paramIndex = 1;
    const params: any[] = [];

    const values = payload
      .filter((tx) => tx.asset === 'USDC')
      .map((tx) => {
        const createdAt = new Date(tx.createdAt).toISOString();

        params.push(tx.memo, tx.memo, tx.memo);
        const baseIndex = paramIndex;
        paramIndex += 3;

        return (
          `('${txType}', '${tx.asset}', '${tx.from}', '${tx.to}', '${txStatus}', ` +
          `$${baseIndex}, ${tx.amount}, '${chain}', '${tx.txHash}', '${uuidv4()}', ` +
          `(SELECT NOT EXISTS (SELECT 1 FROM "user" u WHERE u.memo = $${baseIndex + 1})), ` +
          `(SELECT u.id FROM "user" u WHERE u.memo = $${baseIndex + 2} LIMIT 1), ` +
          `'${createdAt}', '${createdAt}')`
        );
      })
      .join(', ');

    const sql =
      `INSERT INTO "transacciones" ` +
      `("txType", "asset", "from", "to", "status", "memo", "amount", ` +
      `"chain", "txHash", "txUUID", "reject", "userId", "createdAt", "updatedAt") ` +
      `VALUES ${values};`;

    return await this.transRepo.query(sql, params);
  }

  // @Cron('0 0 * * *', { name: 'Reject Old Memo Pending' })
  async rejectOldMemoPending() {
    if (!this.isLocal) return;
    const oldDate = sub(new Date(), { days: 1 });
    try {
      await this.transRepo
        .createQueryBuilder()
        .update(Transacciones)
        .set({ reject: true })
        .where('status = false')
        .andWhere('reject = false')
        .andWhere('createdAt <= :oldDate', { oldDate })
        .execute();
    } catch (error) {
      this.logger.error('Error en rejectOldMemoPending:', error);
      throw error;
    }
  }

  // @Cron('*/3 * * * *', { name: 'Check Stellar Balance' })
  async checkStellarOperations() {
    if (!this.isLocal) return;
    try {
      // const _txs: CheckAccountDetailsResponse[] =
      await this.stellarService.checkAccountDetails({
        account: this.collectingWallet,
        limit: 50,
        // 'GDDFTQVEMJ3LG3FA5VINLRZUIFGASNRT4LRDJ3SGFUYUYWTEPWEVMFJE',
      });
      // const newTxs = await this.saveStellarOperations(txs);
      // this.logger.log(`Stellar newTxs: ${JSON.stringify(newTxs)}`);
    } catch (error) {
      this.logger.error('Error en checkStellarBalance:', error);
      throw error;
    }
  }

  async makeTransaction(
    payload: MakeTransactionDto,
  ): Promise<SendStellarTransactionDto> {
    try {
      return await this.stellarService.makeTransaction(payload);
    } catch (error) {
      this.logger.error('Error en makeTransaction:', error);
      throw error;
    }
  }
}
