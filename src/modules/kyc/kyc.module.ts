import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShareModule } from 'src/common/services/share.module';
import { AuthModule } from '../auth/auth.module';
import { KycController } from './kyc.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { OtpToken } from 'src/common/entities/otp-token.entity';
import { User } from 'src/common/entities/user.entity';
import { Wallets } from 'src/common/entities/wallets';

@Module({
  imports: [
    AuthModule,
    JwtModule.register({}),
    ShareModule,
    TypeOrmModule.forFeature([OtpToken, User, Wallets]),
  ],
  controllers: [KycController],
  providers: [AuthService],
  exports: [AuthService],
})
export class KycModule {}
