import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transacciones } from 'src/common/entities/transacciones.entity';
import { User } from 'src/common/entities/user.entity';
import { Wallets } from 'src/common/entities/wallets';

import { StellarService } from 'src/common/services/stellar.service';
import { TransferController } from 'src/modules/transfer/transfer.controller';
import { TransferService } from 'src/modules/transfer/transfer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transacciones, User, Wallets])],
  controllers: [TransferController],
  providers: [TransferService, StellarService],
  exports: [TransferService],
})
export class TransferModule {}
