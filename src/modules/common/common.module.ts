import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auth } from 'src/entities/auth.entity';

import { ShareModule } from 'src/common/share.module';
import { AuthModule } from '../auth/auth.module';
import { WalletsModule } from '../wallets/wallets.module';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { ArsaController } from './controllers/arsa.controller';
import { CronController } from './controllers/cron.controller';
import { ProsperCommonController } from './controllers/prosper.controller';
import { SorobanController } from './controllers/soroban.controller';
import { StellarController } from './controllers/stellar.controller';
import { CronService } from './services/cron.service';
import { ProsperCommonService } from './services/prosper.service';

@Module({
  imports: [ShareModule, AuthModule, WalletsModule, TransaccionesModule, TypeOrmModule.forFeature([Auth])],
  controllers: [CronController, StellarController, SorobanController, ArsaController, ProsperCommonController],
  providers: [CronService, ProsperCommonService],
  exports: [CronService, ProsperCommonService],
})
export class CommonModule { }
