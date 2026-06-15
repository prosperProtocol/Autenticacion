import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { CronLock } from 'src/entities/cronLock.entity';

/**
 * CronLockService — Lock distribuido en base de datos para cron jobs.
 *
 * Garantiza que solo una instancia del proceso ejecute un job a la vez.
 * Basado en el patrón de JobLockService de qInterface:
 *   - tryAcquire: inserta un registro con TTL. Si ya existe uno vigente → retorna null.
 *   - release: elimina el registro al finalizar.
 *
 * El campo `expiresAt` actúa como TTL: si el proceso muere sin liberar,
 * otra instancia puede robar el lock cuando expiresAt < NOW().
 */
@Injectable()
export class CronLockService {
  private readonly logger = new Logger(CronLockService.name);

  constructor(
    @InjectRepository(CronLock)
    private readonly repo: Repository<CronLock>,
  ) {}

  /**
   * Intenta adquirir un lock exclusivo para `lockKey`.
   *
   * @param lockKey   Identificador del job, ej: 'cron:prosper:reconciliation'
   * @param ttlMs     TTL del lock en milisegundos (recomendado: 2x el intervalo del cron)
   * @param lockedBy  Identificador de la instancia (HOSTNAME)
   * @returns         El lock adquirido, o null si ya está tomado
   */
  async tryAcquire(lockKey: string, ttlMs: number, lockedBy: string): Promise<CronLock | null> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    try {
      // Limpiar locks expirados de esta misma key antes de intentar insertar
      await this.repo.delete({ lockKey, expiresAt: LessThan(now) });

      const lock = this.repo.create({ lockKey, lockedBy, expiresAt });
      await this.repo.insert(lock);
      this.logger.debug(`Lock adquirido: key=${lockKey} by=${lockedBy} expires=${expiresAt.toISOString()}`);
      return lock;
    } catch {
      // INSERT falla si ya existe un registro vigente con el mismo PK
      this.logger.debug(`Lock ya tomado para key=${lockKey}`);
      return null;
    }
  }

  /**
   * Libera el lock. Debe llamarse siempre en un bloque `finally`.
   */
  async release(lock: CronLock): Promise<void> {
    await this.repo.delete({ lockKey: lock.lockKey });
    this.logger.debug(`Lock liberado: key=${lock.lockKey}`);
  }
}
