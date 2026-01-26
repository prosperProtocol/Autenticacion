import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtInterceptor } from './auth-jwt.interceptor';
import { JwtGuard } from './auth-jwt.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth } from '../../entities/auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auth])],
  controllers: [AuthController],
  providers: [AuthService, JwtInterceptor, JwtGuard],
  exports: [AuthService, JwtInterceptor, JwtGuard],
})
export class AuthModule {}
