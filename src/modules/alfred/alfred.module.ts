import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareModule } from 'src/common/share.module';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ProsperService } from '../prosper/prosper.service';
import { AlfredController } from './alfred.controller';
import { AlfredService } from './alfred.service';
import { Auth } from '../../entities/auth.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ShareModule,
    TransaccionesModule,
    WalletsModule,
    TypeOrmModule.forFeature([Auth]),
    AuthModule,
  ],
  controllers: [AlfredController],
  providers: [ProsperService, AlfredService],
  exports: [ProsperService, AlfredService],
})
export class AlfredModule {}
