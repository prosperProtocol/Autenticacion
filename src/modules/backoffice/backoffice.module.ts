import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from 'src/common/entities/user.entity';
import { Transacciones } from 'src/common/entities/transacciones.entity';

import { AuthModule } from '../auth/auth.module';
import { TransferModule } from '../transfer/transfer.module';
import { AuthBackOfficeController } from './controllers/auth.controller';
import { BackOfficeController } from './controllers/backoffice.controller';
import { BackOfficeService } from './backoffice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transacciones, User]),
    TransferModule,
    AuthModule,
  ],

  controllers: [AuthBackOfficeController, BackOfficeController],
  providers: [BackOfficeService],
  exports: [BackOfficeService],
})
export class BackOfficeModule {}
