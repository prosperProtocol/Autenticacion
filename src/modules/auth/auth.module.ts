import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

import { OtpToken } from 'src/common/entities/otp-token.entity';
import { User } from 'src/common/entities/user.entity';
import { Wallets } from 'src/common/entities/wallets';

import { ShareModule } from 'src/common/services/share.module';
import { JwtStrategy } from 'src/modules/auth/strategies/jwt.strategy';
import { AuthService } from 'src/modules/auth/auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpToken, User, Wallets]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get('config.jwt');
        return {
          secret: jwtConfig.secret,
          signOptions: {
            expiresIn: '1d',
            issuer: 'prosper.stellar',
          },
        };
      },
    }),
    ShareModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
