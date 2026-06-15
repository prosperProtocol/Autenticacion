import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CronTx, CronTxStatus, CronTxType } from 'src/entities/cronTx.entity';

/**
 * CronTxService — Gestión del ciclo de vida de transacciones procesadas por cron.
 *
 * Equivalente al ScanTxService de qInterface:
 *   - findPending: obtiene registros PENDING por tipo en orden FIFO.
 *   - markProcessed: transición a PROCESSED con timestamp.
 *   - markError: acumula attempts; al llegar al máximo → MAX_ATTEMPTS.
 *   - upsertByHash: registra una tx nueva solo si no existe (idempotencia).
 */
@Injectable()
export class CronTxService {
  private readonly logger = new Logger(CronTxService.name);

  constructor(
    @InjectRepository(CronTx)
    private readonly repo: Repository<CronTx>,
  ) {}

  /**
   * Retorna hasta `limit` transacciones PENDING del tipo indicado,
   * ordenadas por fecha de creación (FIFO).
   */
  async findPending(txType: CronTxType, limit: number): Promise<CronTx[]> {
    return this.repo.find({
      where: { txType, status: CronTxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Marca una transacción como procesada exitosamente.
   */
  async markProcessed(id: number): Promise<void> {
    await this.repo.update(id, {
      status: CronTxStatus.PROCESSED,
      processedAt: new Date(),
      errorMsg: null,
    });
  }

  /**
   * Registra un error en la transacción e incrementa `attempts`.
   * Si `attempts` alcanza `maxAttempts`, cambia a MAX_ATTEMPTS (no se reintenta más).
   */
  async markError(id: number, errorMsg: string, maxAttempts: number): Promise<void> {
    const tx = await this.repo.findOne({ where: { id } });
    if (!tx) {
      this.logger.warn(`CronTxService.markError: id=${id} no encontrado`);
      return;
    }
    const newAttempts = (tx.attempts ?? 0) + 1;
    const newStatus =
      newAttempts >= maxAttempts ? CronTxStatus.MAX_ATTEMPTS : CronTxStatus.ERROR;

    await this.repo.update(id, {
      status: newStatus,
      attempts: newAttempts,
      errorMsg,
    });

    if (newStatus === CronTxStatus.MAX_ATTEMPTS) {
      this.logger.warn(
        `CronTx id=${id} txHash=${tx.txHash} alcanzó MAX_ATTEMPTS=${maxAttempts}, ` +
          `se detiene el reintento automático.`,
      );
    }
  }

  /**
   * Registra una nueva transacción si no existe por txHash (idempotencia).
   * Si ya existe, retorna el registro existente sin modificarlo.
   */
  async upsertByHash(data: Partial<CronTx> & { txHash: string }): Promise<CronTx> {
    const existing = await this.repo.findOne({ where: { txHash: data.txHash } });
    if (existing) {
      this.logger.debug(`CronTx ya existe: txHash=${data.txHash} id=${existing.id}`);
      return existing;
    }
    const newTx = this.repo.create(data);
    return this.repo.save(newTx);
  }

  /**
   * Retorna un resumen de conteos por status y tipo (para monitoreo).
   */
  async getSummary(): Promise<{ txType: string; status: string; count: string }[]> {
    return this.repo
      .createQueryBuilder('t')
      .select('t.txType', 'txType')
      .addSelect('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.txType')
      .addGroupBy('t.status')
      .orderBy('t.txType')
      .addOrderBy('t.status')
      .getRawMany();
  }
}
