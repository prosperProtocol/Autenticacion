import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Auth } from 'src/entities/auth.entity';
import { ShareModule } from 'src/common/share.module';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { CMSController } from './cms.controller';
import { CMSService } from './cms.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auth]),
    ShareModule,
    TransaccionesModule,
    WalletsModule,
    CommonModule,
    AuthModule,
  ],
  controllers: [CMSController],
  providers: [CMSService],
  exports: [CMSService],
})
export class CMSModule { }
