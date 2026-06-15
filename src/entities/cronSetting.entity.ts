import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * cron_setting — Variables de configuración operacional para cron jobs.
 * Permite ajustar parámetros en caliente sin redeploy.
 *
 * Seeds iniciales (ejecutar una sola vez):
 *
 *   INSERT INTO cron_setting (key, value, description) VALUES
 *     ('CRON_ENABLED',              'true',    'Habilitar/deshabilitar todos los cron jobs'),
 *     ('PROSPER_TX_BATCH_SIZE',     '50',      'Registros por lote en cada iteración'),
 *     ('PROSPER_MAX_TX_ATTEMPTS',   '5',       'Reintentos máximos antes de MAX_ATTEMPTS'),
 *     ('STELLAR_NETWORK',           'testnet', 'Red Stellar activa: testnet | mainnet'),
 *     ('STAKING_PAYOUT_ENABLED',    'true',    'Habilitar cron de pagos de staking'),
 *     ('DEPOSIT_SCAN_ENABLED',      'true',    'Habilitar escaneo de depósitos')
 *   ON CONFLICT (key) DO NOTHING;
 */
@Entity({ name: 'cron_setting' })
export class CronSetting {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre único de la variable, ej: 'CRON_ENABLED' */
  @Column({ type: 'varchar', length: 128, unique: true })
  key: string;

  /** Valor almacenado como texto — se parsea en el servicio (bool, int, string) */
  @Column({ type: 'text', nullable: true })
  value: string | null;

  /** Descripción del propósito de esta variable */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
