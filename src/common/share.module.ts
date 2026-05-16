import { Module } from '@nestjs/common';

import { StellarService } from './services/stellar.service';
import { StakingService } from './services/staking.service';
import { SorobanService } from './services/soroban.service';

@Module({
  providers: [StellarService, SorobanService, StakingService],
  exports: [StellarService, SorobanService, StakingService],
})
export class ShareModule {}
