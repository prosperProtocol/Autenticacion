import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';

import { CronLock } from 'src/entities/cronLock.entity';

import { CronLockService } from './cron-lock.service';
import { CronSettingService } from './cron-setting.service';
import { DepositProcessorService } from './deposit-processor.service';
import { StakingPayoutService } from './staking-payout.service';

/**
 * Intervalo de ejecución: cada 5 minutos.
 * Ajustar según la frecuencia de eventos on-chain esperada.
 */
const CRON_INTERVAL_MS = 5 * 60 * 1000;

/** Clave única del job — usada para el lock distribuido y los logs */
const CRON_KEY = 'cron:prosper:reconciliation';

/**
 * StellarReconciliationService — Orquestador principal de cron jobs.
 *
 * Ejecuta sub-tareas en orden SECUENCIAL cada `CRON_INTERVAL_MS`.
 * Implementa 3 guardianes para evitar solapamiento:
 *
 *   1. `running` flag     — evita solapamiento en la misma instancia (en memoria)
 *   2. CRON_ENABLED (env) — primer corte sin consultar BD
 *   3. cron_setting       — control en caliente desde BD
 *   4. cron_lock          — lock distribuido entre múltiples instancias
 *
 * Para agregar una nueva sub-tarea:
 *   1. Crear el servicio en services/mi-tarea.service.ts
 *   2. Inyectarlo aquí en el constructor
 *   3. Agregar una key en cron_setting: 'MI_TAREA_ENABLED'
 *   4. Llamarlo en el bloque try con la verificación correspondiente
 */
@Injectable()
export class StellarReconciliationService {
  private readonly logger = new Logger(StellarReconciliationService.name);

  /** Anti-overlap local: impide que el mismo proceso ejecute dos instancias del cron */
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly cronLockService: CronLockService,
    private readonly cronSettingService: CronSettingService,
    private readonly depositProcessor: DepositProcessorService,
    private readonly stakingPayout: StakingPayoutService,
  ) {}

  @Interval(CRON_KEY, CRON_INTERVAL_MS)
  async cronReconciliation(): Promise<void> {
    // Guardián 1: anti-overlap en la misma instancia
    if (this.running) {
      this.logger.warn(`${CRON_KEY} ya en ejecución — omitiendo este ciclo`);
      return;
    }

    // Guardián 2: variable de entorno (sin consultar BD)
    const envEnabled = this.configService.get<string>('CRON_ENABLED');
    if (envEnabled === 'false') {
      this.logger.debug(`${CRON_KEY} deshabilitado por CRON_ENABLED=false en .env`);
      return;
    }

    // Guardián 3: flag desde BD (ajustable en caliente sin redeploy)
    const dbEnabled = await this.cronSettingService.getBoolean('CRON_ENABLED', true);
    if (!dbEnabled) {
      this.logger.debug(`${CRON_KEY} deshabilitado por cron_setting.CRON_ENABLED=false`);
      return;
    }

    // Guardián 4: lock distribuido (anti-overlap entre múltiples instancias)
    const ttlMs = CRON_INTERVAL_MS * 2; // TTL = 2x el intervalo para absorber ejecuciones lentas
    const lock: CronLock | null = await this.cronLockService.tryAcquire(
      CRON_KEY,
      ttlMs,
      process.env.HOSTNAME ?? 'prosper-back',
    );
    if (!lock) {
      this.logger.debug(`${CRON_KEY} lock distribuido no adquirido — otra instancia activa`);
      return;
    }

    this.running = true;
    const startTime = Date.now();
    this.logger.log(`${CRON_KEY} iniciando`);

    try {
      // ── Sub-tarea 1: Depósitos ────────────────────────────────────────────
      const depositEnabled = await this.cronSettingService.getBoolean('DEPOSIT_SCAN_ENABLED', true);
      if (depositEnabled) {
        await this.depositProcessor.processPendingDeposits();
      } else {
        this.logger.debug('processPendingDeposits omitido por DEPOSIT_SCAN_ENABLED=false');
      }

      // ── Sub-tarea 2: Pagos de staking ─────────────────────────────────────
      const stakingEnabled = await this.cronSettingService.getBoolean('STAKING_PAYOUT_ENABLED', true);
      if (stakingEnabled) {
        await this.stakingPayout.processPendingPayouts();
      } else {
        this.logger.debug('processPendingPayouts omitido por STAKING_PAYOUT_ENABLED=false');
      }

      // ── Agregar nuevas sub-tareas aquí ────────────────────────────────────
      // if (await this.cronSettingService.getBoolean('MI_TAREA_ENABLED', true)) {
      //   await this.miTarea.processPending();
      // }

    } catch (err) {
      this.logger.error(`${CRON_KEY} error en ejecución`, err instanceof Error ? err.stack : err);
    } finally {
      this.running = false;
      const elapsed = Date.now() - startTime;
      this.logger.log(`${CRON_KEY} finalizado en ${elapsed}ms`);

      try {
        await this.cronLockService.release(lock);
      } catch (e) {
        this.logger.warn(`${CRON_KEY} error al liberar lock distribuido`, e);
      }
    }
  }
}
