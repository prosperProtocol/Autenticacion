import { Module } from '@nestjs/common';

import { ShareModule } from 'src/common/share.module';
import { ProsperController } from './prosper.controller';
import { ProsperService } from './prosper.service';
import { TransaccionesModule } from '../transacciones/transacciones.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [ShareModule, TransaccionesModule, WalletsModule],
  controllers: [ProsperController],
  providers: [ProsperService],
  exports: [ProsperService],
})
export class ProsperModule {}
