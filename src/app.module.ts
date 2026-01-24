import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import config from 'src/common/config/config';
import stellarConfig from 'src/common/config/stellar.config';
import { DatabaseModule } from 'src/common/database.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TransaccionesModule } from './modules/transacciones/transacciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config, stellarConfig],
      isGlobal: true,
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    TransaccionesModule,
    WalletsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
