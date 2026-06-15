import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CronLock } from 'src/entities/cronLock.entity';
import { CronSetting } from 'src/entities/cronSetting.entity';
import { CronTx } from 'src/entities/cronTx.entity';
import { ShareModule } from 'src/common/share.module';

import { CronLockService } from './services/cron-lock.service';
import { CronSettingService } from './services/cron-setting.service';
import { CronTxService } from './services/cron-tx.service';
import { StellarReconciliationService } from './services/stellar-reconciliation.service';
import { DepositProcessorService } from './services/deposit-processor.service';
import { StakingPayoutService } from './services/staking-payout.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronLock, CronSetting, CronTx]),
    ShareModule,
  ],
  providers: [
    // Infraestructura
    CronLockService,
    CronSettingService,
    CronTxService,
    // Orquestador
    StellarReconciliationService,
    // Sub-tareas
    DepositProcessorService,
    StakingPayoutService,
  ],
  // Exportar solo los servicios que otros módulos necesiten consultar
  exports: [CronTxService, CronSettingService],
})
export class CronJobsModule {}
