import { Injectable, Logger } from '@nestjs/common';

import { StellarService } from 'src/common/services/stellar.service';
import { CronTxType } from 'src/entities/cronTx.entity';

import { CronSettingService } from './cron-setting.service';
import { CronTxService } from './cron-tx.service';

/**
 * DepositProcessorService — Sub-tarea: procesamiento de depósitos Stellar pendientes.
 *
 * Lee registros de tipo DEPOSIT con status PENDING desde `cron_tx`,
 * los procesa de forma SECUENCIAL (no paralela) para evitar condiciones de carrera,
 * y actualiza el estado según el resultado.
 *
 * Para registrar depósitos en la tabla, usar CronTxService.upsertByHash()
 * desde el proceso que detecta eventos on-chain (webhook, scanner, etc.).
 */
@Injectable()
export class DepositProcessorService {
  private readonly logger = new Logger(DepositProcessorService.name);

  constructor(
    private readonly cronSettingService: CronSettingService,
    private readonly cronTxService: CronTxService,
    private readonly stellarService: StellarService,
  ) {}

  async processPendingDeposits(): Promise<void> {
    const batchSize = await this.cronSettingService.getInt('PROSPER_TX_BATCH_SIZE', 50);
    const maxAttempts = await this.cronSettingService.getInt('PROSPER_MAX_TX_ATTEMPTS', 5);

    let totalRead = 0;
    let totalProcessed = 0;
    let totalErrors = 0;

    // Loop hasta agotar pendientes en esta ejecución
    while (true) {
      const pending = await this.cronTxService.findPending(CronTxType.DEPOSIT, batchSize);
      if (pending.length === 0) break;

      totalRead += pending.length;

      // ⚡ SECUENCIAL: no usar Promise.all() aquí.
      // El procesamiento paralelo podría causar doble crédito o inconsistencias.
      for (const tx of pending) {
        try {
          this.logger.debug(
            `Procesando depósito: id=${tx.id} txHash=${tx.txHash} ` +
              `from=${tx.fromAddress} amount=${tx.amount} ${tx.asset}`,
          );

          // TODO: implementar la lógica real de acreditación en Stellar/Soroban
          // Ejemplo:
          //   await this.stellarService.creditDeposit({
          //     toAddress: tx.toAddress,
          //     amount: tx.amount,
          //     asset: tx.asset,
          //     memo: tx.meta?.memo,
          //   });

          await this.cronTxService.markProcessed(tx.id);
          totalProcessed++;

          this.logger.debug(`Depósito procesado: id=${tx.id} txHash=${tx.txHash}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Error al procesar depósito id=${tx.id} txHash=${tx.txHash}: ${msg}`,
          );
          await this.cronTxService.markError(tx.id, msg, maxAttempts);
          totalErrors++;
        }
      }
    }

    if (totalRead > 0) {
      this.logger.log(
        `processPendingDeposits completado — ` +
          `leídos=${totalRead} ok=${totalProcessed} errores=${totalErrors}`,
      );
    } else {
      this.logger.debug('processPendingDeposits — sin pendientes');
    }
  }
}
