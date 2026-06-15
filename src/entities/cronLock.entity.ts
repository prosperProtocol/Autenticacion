import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * cron_lock — Lock distribuido para cron jobs.
 * Permite que múltiples instancias del proceso no ejecuten el mismo job simultáneamente.
 * Si expiresAt < NOW(), el lock puede ser robado por otra instancia.
 */
@Entity({ name: 'cron_lock' })
export class CronLock {
  /** Identificador único del job, ej: 'cron:prosper:reconciliation' */
  @PrimaryColumn({ type: 'varchar', length: 128 })
  lockKey: string;

  /** HOSTNAME del proceso que adquirió el lock */
  @Column({ type: 'varchar', length: 256 })
  lockedBy: string;

  /** Expiración del lock — si está en el pasado, otra instancia puede tomarlo */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
