import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StellarService } from './services/stellar.service';
import { StakingService } from './services/staking.service';
import { SorobanService } from './services/soroban.service';
import { Staking } from 'src/entities/staking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staking])],
  providers: [StellarService, SorobanService, StakingService],
  exports: [StellarService, SorobanService, StakingService],
})
export class ShareModule {}
