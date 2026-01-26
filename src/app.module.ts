import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import config from 'src/common/config/config';
import stellarConfig from 'src/common/config/stellar.config';
import { DatabaseModule } from 'src/common/database.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { JwtGuard } from 'src/modules/auth/auth-jwt.guard';
import { ProsperModule } from 'src/modules/prosper/prosper.module';
import { TransaccionesModule } from 'src/modules/transacciones/transacciones.module';
import { WalletsModule } from 'src/modules/wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config, stellarConfig],
      isGlobal: true,
    }),
    AuthModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    TransaccionesModule,
    WalletsModule,
    ProsperModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
  ],
})
export class AppModule {}
