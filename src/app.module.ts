import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import config from 'src/common/config/config';
import stellarConfig from 'src/common/config/stellar.config';
import arsaConfig from 'src/common/config/arsa.config';
import { DatabaseModule } from 'src/common/database.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CommonModule } from 'src/modules/common/common.module';
import { JwtGuard } from 'src/modules/auth/auth-jwt.guard';
import { TransaccionesModule } from 'src/modules/transacciones/transacciones.module';
import { WalletsModule } from 'src/modules/wallets/wallets.module';
import { CronJobsModule } from './modules/cron-jobs/cron-jobs.module';
import { CMSModule } from './modules/cms/cms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config, stellarConfig, arsaConfig],
      isGlobal: true,
    }),
    AuthModule,
    CMSModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    TransaccionesModule,
    WalletsModule,
    // CronJobsModule,
    CommonModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule { }
