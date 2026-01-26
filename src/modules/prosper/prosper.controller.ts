import { Body, Controller, Get, Post, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import {
  CreateFundDto,
  MintDto,
  TransferDto,
  DepositDto,
  NewUserDto,
} from './prosper.dto';
import { ProsperService } from './prosper.service';
import { GetTransactionsDto } from '../transacciones/transacciones.dto';

@ApiBearerAuth()
@ApiTags('Prosper')
@Controller('prosper')
export class ProsperController {
  constructor(private readonly service: ProsperService) {}

  // @Post('makeTreasury')
  // async makeTreasury() {
  //   return this.service.makeTreasury();
  // }

  @Post('funds')
  async createFund(@Body() payload: CreateFundDto) {
    return this.service.createFund(payload);
  }

  @Post('tokens/mint')
  async mint(@Body() payload: MintDto) {
    return this.service.mintTokens(payload);
  }

  @Get('assets')
  async assets() {
    return this.service.getAssets();
  }

  @Post('users/new')
  async createUser(@Body() payload: NewUserDto) {
    return this.service.createOrEnsureUser(payload);
  }

  @Post('users/deposit')
  async deposit(@Body() payload: DepositDto) {
    return this.service.deposit(payload);
  }

  @Post('users/transfer')
  async transfer(@Body() payload: TransferDto) {
    return this.service.transfer(payload);
  }

  @Delete('users/retire')
  async retire(@Body() payload: DepositDto) {
    return this.service.retire(payload);
  }

  @Get('users/:prosperId/balances')
  async userBalances(@Param('prosperId') prosperId: string) {
    return this.service.getBalance(prosperId);
  }

  @Get('users/:prosperId/transactions')
  async userTransactions(
    @Param('prosperId') prosperId: string,
    @Query() payload: GetTransactionsDto,
  ) {
    payload.prosperId = prosperId;
    return this.service.getTransactions(payload);
  }
}
