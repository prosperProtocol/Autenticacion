import { Module } from '@nestjs/common';

import { ShareModule } from 'src/common/share.module';
import { StellarController } from './stellar.controller';
import { SorobanController } from './soroban.controller';

@Module({
  imports: [ShareModule],
  controllers: [StellarController, SorobanController],
  providers: [],
  exports: [],
})
export class CommonModule {}
