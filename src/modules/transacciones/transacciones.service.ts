import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Transacciones,
  TransferStatus,
  WebhookStatus,
} from '../../entities/transacciones.entity';
import { Wallets } from '../../entities/wallets';

import {
  CreateTransaccionDto,
  GetTransactionsDto,
  UpdateTransaccionDto,
  FindByFieldsResponse,
} from './transacciones.dto';

@Injectable()
export class TransaccionesService {
  private readonly logger = new Logger(TransaccionesService.name);
  constructor(
    @InjectRepository(Transacciones)
    private readonly repo: Repository<Transacciones>,
    @InjectRepository(Wallets)
    private readonly walletsRepo: Repository<Wallets>,
  ) {}

  async create(dto: CreateTransaccionDto): Promise<Transacciones> {
    this.logger.debug('llamando create');
    try {
      const walletFrom = await this.walletsRepo.findOne({
        where: { id: dto.walletFromId },
      });
      const walletTo = await this.walletsRepo.findOne({
        where: { id: dto.walletToId },
      });
      const tx = this.repo.create({
        amount: dto.amount,
        asset: dto.asset,
        from: dto.from,
        to: dto.to,
        memo: dto.memo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (TransferStatus as any).PENDING,
        txType: dto.txType,
        txHash: dto?.txHash ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webhookStatus: (WebhookStatus as any).PENDING,
        walletFrom,
        walletTo,
      });
      return this.repo.save(tx);
    } catch (error) {
      this.logger.error(
        `Error en create: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error creando la transaccion');
    }
  }

  findAll(): Promise<Transacciones[]> {
    this.logger.debug('llamando findAll');
    try {
      return this.repo.find({ relations: ['walletFrom', 'walletTo'] });
    } catch (error) {
      this.logger.error(
        `Error en findAll: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo las transacciones');
    }
  }

  async findOne(id: number): Promise<Transacciones> {
    this.logger.debug('llamando findOne');
    try {
      const tx = await this.repo.findOne({
        where: { id },
        relations: ['walletFrom', 'walletTo'],
      });
      if (!tx) throw new NotFoundException(`Transaccion ${id} not found`);
      return tx;
    } catch (error) {
      this.logger.error(
        `Error en findOne: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo la transaccion');
    }
  }

  async findByFields(
    payload: GetTransactionsDto,
  ): Promise<FindByFieldsResponse> {
    this.logger.debug('llamando findByFields');
    try {
      const {
        userId,
        limit = 10,
        page = 1,
        createdAt,
        status,
        txType,
      } = payload;
      const offset = (page - 1) * limit;
      // buscar wallet por prosperId
      const wallets = await this.walletsRepo.find({
        where: { prosperId: userId },
      });
      const wallet = wallets && wallets.length ? wallets[0] : null;
      if (!wallet)
        throw new NotFoundException(`Wallet for userId ${userId} not found`);
      // Construir cláusula WHERE y parámetros
      const whereClauses: string[] = [
        '(t."walletFromId" = $1 OR t."walletToId" = $1)',
      ];
      const params = new Array(wallet.id);

      if (status) {
        params.push(status);
        whereClauses.push(`t.status = $${params.length}`);
      }

      if (txType) {
        params.push(txType);
        whereClauses.push(`t."txType" = $${params.length}`);
      }

      if (createdAt) {
        const dateOnly = new Date(createdAt).toISOString().slice(0, 10);
        params.push(dateOnly);
        whereClauses.push(`DATE(t."createdAt") = $${params.length}`);
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

      // Query para total
      const countSql = `
      SELECT COUNT(1) as total
      FROM transacciones t
      ${whereSql}
    `;

      // Query para items (con joins para obtener prosperId/address)
      const itemsSql = `
      SELECT
        t.id,
        t.amount,
        t.from,
        t.to,
        t.memo,
        t.status,
        t."txType",
        t."txHash",
        t."createdAt",
        t."updatedAt",
        wf.prosperId AS "walletFrom_prosperId",
        wf.address AS "walletFrom_address",
        wt.prosperId AS "walletTo_prosperId",
        wt.address AS "walletTo_address"
      FROM transacciones t
      LEFT JOIN wallets wf ON t."walletFromId" = wf.id
      LEFT JOIN wallets wt ON t."walletToId" = wt.id
      ${whereSql}
      ORDER BY t."createdAt" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

      // Ejecutar queries
      const countResult = await this.repo.query(countSql, params);
      const total = Number(
        countResult && countResult[0] ? countResult[0].total : 0,
      );

      const itemsParams = params.concat([limit, offset]);
      const rows = await this.repo.query(itemsSql, itemsParams);

      return {
        items: rows,
        total,
        limit,
        page,
      };
    } catch (error) {
      this.logger.error(
        `Error en findByFields: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo las transacciones');
    }
  }

  async update(id: number, dto: UpdateTransaccionDto): Promise<Transacciones> {
    this.logger.debug('llamando update');
    try {
      const tx = await this.findOne(id);
      Object.assign(tx, dto);
      return this.repo.save(tx);
    } catch (error) {
      this.logger.error(
        `Error en update: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error actualizando la transaccion');
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.debug('llamando remove');
    try {
      const tx = await this.findOne(id);
      await this.repo.remove(tx);
    } catch (error) {
      this.logger.error(
        `Error en remove: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error eliminando la transaccion');
    }
  }
}
