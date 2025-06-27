import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserStatus } from 'src/common/entities/user.entity';
import { Transacciones } from 'src/common/entities/transacciones.entity';

import { plainToInstance } from 'class-transformer';
import {
  ActiveUserDto,
  FilteredTransactionDto,
  RejectUserDto,
} from './dto/back.dto';
import { ActiveUsersResponse } from 'src/common/interfaces/backoffice/ActiveUsers.interface';

@Injectable()
export class BackOfficeService {
  public readonly collectingWallet: string;
  public readonly name = this.constructor.name;
  private readonly isLocal: boolean;
  protected logger: Logger;

  constructor(
    @InjectRepository(Transacciones)
    private readonly transRepo: Repository<Transacciones>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    const stellarConfig = this.configService.get('config.stellar');
    this.collectingWallet = stellarConfig?.collectingWallet ?? '';
    this.logger = new Logger(this.name, {
      timestamp: true,
    });
  }

  async getActiveUsers(): Promise<ActiveUserDto[]> {
    const users = await this.usersRepo.find({
      where: { status: UserStatus.active },
    });
    return plainToInstance(ActiveUserDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async getActiveUser(userId: number): Promise<{ user: ActiveUsersResponse }> {
    const query = `
      select
        u.id as "id",
        u."createdAt",
        u."updatedAt",
        w."memo",
        u.status as "status",
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'documentType', u."documentType",
          'documentNumber', u."dni",
          'profilePictureBase64', u."selfieUrl",
          'address', jsonb_build_object(
            'street', u.street,
            'streetNumber', u."streetNumber",
            'zip', u."postalCode",
            'city', u.city,
            'state', u.state,
            'country', u.country
          ),
          'emails', jsonb_build_array(
            jsonb_build_object('address', u.email)
          ),
          'phones', jsonb_build_array(
            jsonb_build_object('number', u."phoneNumber")
          )
        ) as "person"
      from "user" u
      left join lateral (
        select w.memo
        from wallets w
        where w."userId" = u.id
          and w.asset = 'USDC'
          and w.chain = 'stellar'
        limit 1
      ) w on true
      where u."deletedAt" is null
      and u.status::varchar = 'active'
      and u.id = $1;
      `;

    const users = await this.usersRepo.query(query, [userId]);
    return { user: users };
  }

  async getUsersWithRejectedKYC(): Promise<RejectUserDto[]> {
    const users = await this.usersRepo.find({
      where: { status: UserStatus.rejected },
    });
    return plainToInstance(RejectUserDto, users, {
      excludeExtraneousValues: true,
    });
  }

  async getUserAccount(userId: number): Promise<{
    wallet: string;
    memo: string;
    balance: number;
    transactions: FilteredTransactionDto[];
  }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const sql = `
      select
        w.id,
        w.asset,
        w.chain,
        w.wallet,
        w.alias,
        u.email as "ownerAccountName",
        w."createdAt",
        w."updatedAt",
        w.memo,
        cast(w.balance as numeric(10, 2)) as balance,
        w.status
      from wallets w
      join "user" u on u.id = w."userId"
      where w."deletedAt" is null
      and w."userId" = $1;
    `;

    return await this.transRepo.query(sql, [userId]);
  }

  async getAllTransactions(
    page = 1,
    limit = 20,
  ): Promise<{ transactions: FilteredTransactionDto[]; total: number }> {
    const offset = (page - 1) * limit;

    const [txs, total] = await this.transRepo.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['user'],
      skip: offset,
      take: limit,
    });

    const transactions = plainToInstance(FilteredTransactionDto, txs, {
      excludeExtraneousValues: true,
    });

    return { transactions, total };
  }

  async getCollectingWalletBalance(): Promise<
    Array<{
      userId: number;
      asset: string;
      chain: string;
      total: number;
    }>
  > {
    const result = await this.transRepo
      .createQueryBuilder('tx')
      .innerJoin('tx.user', 'user') // Relación con la entidad User
      .select('tx."userId"', 'userId')
      .addSelect('tx.asset', 'asset')
      .addSelect('tx.chain', 'chain')
      .addSelect('SUM(tx.amount)', 'total')
      .where('user.status = :status', { status: 'active' })
      // .andWhere('tx.to = :wallet', { wallet: this.collectingWallet })
      .groupBy('tx."userId"')
      .addGroupBy('tx.asset')
      .addGroupBy('tx.chain')
      .getRawMany();

    return result.map((r) => ({
      userId: parseInt(r.userId),
      asset: r.asset,
      chain: r.chain,
      total: r.total,
    }));
  }
}
