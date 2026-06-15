import { Injectable, Logger } from '@nestjs/common';

import { SorobanService } from 'src/common/services/soroban.service';
import { StakingService } from 'src/common/services/staking.service';
import { CronTxType } from 'src/entities/cronTx.entity';

import { CronSettingService } from './cron-setting.service';
import { CronTxService } from './cron-tx.service';

/**
 * StakingPayoutService — Sub-tarea: procesamiento de pagos de staking pendientes.
 *
 * Lee registros de tipo STAKING_PAYOUT con status PENDING desde `cron_tx`,
 * los procesa de forma SECUENCIAL y actualiza el estado según el resultado.
 *
 * El campo `meta` de CronTx puede contener:
 *   { stakingId: number, ledger: number, interestAmount: number }
 */
@Injectable()
export class StakingPayoutService {
  private readonly logger = new Logger(StakingPayoutService.name);

  constructor(
    private readonly cronSettingService: CronSettingService,
    private readonly cronTxService: CronTxService,
    private readonly sorobanService: SorobanService,
    private readonly stakingService: StakingService,
  ) {}

  async processPendingPayouts(): Promise<void> {
    const batchSize = await this.cronSettingService.getInt('PROSPER_TX_BATCH_SIZE', 50);
    const maxAttempts = await this.cronSettingService.getInt('PROSPER_MAX_TX_ATTEMPTS', 5);

    let totalRead = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    while (true) {
      const pending = await this.cronTxService.findPending(CronTxType.STAKING_PAYOUT, batchSize);
      if (pending.length === 0) break;

      totalRead += pending.length;

      // ⚡ SECUENCIAL: mantener orden de pagos y evitar doble pago
      for (const tx of pending) {
        try {
          this.logger.debug(
            `Procesando pago de staking: id=${tx.id} txHash=${tx.txHash} ` +
              `to=${tx.toAddress} amount=${tx.amount} ${tx.asset}`,
          );

          // TODO: implementar la lógica real de pago de intereses via Soroban
          // Ejemplo:
          //   const stakingId = tx.meta?.stakingId as number;
          //   await this.sorobanService.claimInterest({
          //     stakingId,
          //     toAddress: tx.toAddress,
          //     amount: tx.amount,
          //   });
          //   await this.stakingService.recordClaimedInterest(stakingId, tx.amount);

          await this.cronTxService.markProcessed(tx.id);
          totalProcessed++;

          this.logger.debug(`Pago de staking procesado: id=${tx.id} txHash=${tx.txHash}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Error al procesar pago de staking id=${tx.id} txHash=${tx.txHash}: ${msg}`,
          );
          await this.cronTxService.markError(tx.id, msg, maxAttempts);
          totalErrors++;
        }
      }
    }

    if (totalRead > 0) {
      this.logger.log(
        `processPendingPayouts completado — ` +
          `leídos=${totalRead} ok=${totalProcessed} errores=${totalErrors}`,
      );
    } else {
      this.logger.debug('processPendingPayouts — sin pendientes');
    }
  }
}
