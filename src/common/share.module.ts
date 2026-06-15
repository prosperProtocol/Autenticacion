import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Staking } from 'src/entities/staking.entity';
import { TempLogProsper } from 'src/entities/tempLogProsper.entity';

import { StellarService } from './services/stellar.service';
import { SorobanService } from './services/soroban.service';
import { StakingService } from './services/staking.service';
import { TempLogService } from './services/tempLog.service';
import { ArsaService } from './services/arsa.service';

@Module({
  imports: [TypeOrmModule.forFeature([Staking, TempLogProsper])],
  providers: [StellarService, SorobanService, StakingService, TempLogService, ArsaService],
  exports: [StellarService, SorobanService, StakingService, TempLogService, ArsaService],
})
export class ShareModule {}
