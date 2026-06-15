import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Estados del ciclo de vida de una transacción procesada por cron.
 *
 * PENDING      → en cola, esperando procesamiento
 * PROCESSED    → procesado exitosamente (processedAt registrado)
 * ERROR        → falló, se reintentará en el próximo ciclo (errorMsg + attempts)
 * MAX_ATTEMPTS → agotó los reintentos, no se vuelve a procesar automáticamente
 */
export enum CronTxStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
  MAX_ATTEMPTS = 'MAX_ATTEMPTS',
}

/**
 * Tipos de operación manejados por el módulo de cron.
 * Agregar nuevos tipos aquí cuando se creen nuevas sub-tareas.
 */
export enum CronTxType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  STAKING_PAYOUT = 'STAKING_PAYOUT',
}

/**
 * cron_tx — Registro de transacciones Stellar procesadas por cron jobs.
 *
 * Migration SQL (ejecutar una vez):
 *
 *   CREATE TYPE cron_tx_status AS ENUM ('PENDING','PROCESSED','ERROR','MAX_ATTEMPTS');
 *   CREATE TYPE cron_tx_type   AS ENUM ('DEPOSIT','WITHDRAWAL','STAKING_PAYOUT');
 *
 *   CREATE TABLE IF NOT EXISTS cron_tx (
 *     id            SERIAL PRIMARY KEY,
 *     "txHash"      VARCHAR(128) UNIQUE NOT NULL,
 *     "txType"      cron_tx_type   NOT NULL,
 *     status        cron_tx_status NOT NULL DEFAULT 'PENDING',
 *     "fromAddress" VARCHAR(256),
 *     "toAddress"   VARCHAR(256),
 *     amount        FLOAT,
 *     asset         VARCHAR(32),
 *     attempts      INT NOT NULL DEFAULT 0,
 *     "errorMsg"    TEXT,
 *     "processedAt" TIMESTAMPTZ,
 *     meta          JSONB,
 *     "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   CREATE INDEX idx_cron_tx_status  ON cron_tx (status);
 *   CREATE INDEX idx_cron_tx_type    ON cron_tx ("txType");
 *   CREATE INDEX idx_cron_tx_created ON cron_tx ("createdAt" ASC);
 */
@Entity({ name: 'cron_tx' })
export class CronTx {
  @PrimaryGeneratedColumn()
  id: number;

  /** Hash Stellar único — clave de idempotencia, previene doble procesamiento */
  @Column({ type: 'varchar', length: 128, unique: true })
  txHash: string;

  @Column({ type: 'enum', enum: CronTxType })
  txType: CronTxType;

  @Column({ type: 'enum', enum: CronTxStatus, default: CronTxStatus.PENDING })
  status: CronTxStatus;

  @Column({ type: 'varchar', length: 256, nullable: true })
  fromAddress: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  toAddress: string | null;

  @Column({ type: 'float', nullable: true })
  amount: number | null;

  /** Asset Stellar: XLM, USDC, USDCp, etc. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  asset: string | null;

  /** Número de intentos fallidos acumulados */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Detalle del último error (se sobreescribe en cada reintento) */
  @Column({ type: 'text', nullable: true })
  errorMsg: string | null;

  /** Timestamp de procesamiento exitoso */
  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  /**
   * Datos adicionales en JSON libre:
   * - ledger, paging_token (cursor Stellar)
   * - memo, operationId, etc.
   */
  @Column({ type: 'json', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
