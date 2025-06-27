import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import config from 'src/common/config/config';
import stellarConfig from 'src/common/config/stellar.config';
import { validationSchema } from 'src/common/config/validation.schema';
import { DatabaseModule } from 'src/common/database.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { InternalModule } from 'src/internal/internal.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BackOfficeModule } from 'src/modules/backoffice/backoffice.module';
import { KycModule } from 'src/modules/kyc/kyc.module';
import { TransferModule } from 'src/modules/transfer/transfer.module';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';

@Module({
  imports: [
    AuthModule,
    BackOfficeModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config, stellarConfig],
      validationSchema,
      isGlobal: true,
    }),
    DatabaseModule,
    KycModule,
    InternalModule,
    ScheduleModule.forRoot(),
    TransferModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
