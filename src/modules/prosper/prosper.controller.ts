import { Body, Controller, Get, Post, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';

import {
  CreateFundDto,
  MintDto,
  TransferDto,
  DepositDto,
  NewUserDto,
} from './prosper.dto';
import { ProsperService } from './prosper.service';
import { GetTransactionsDto } from '../transacciones/transacciones.dto';

@ApiTags('Prosper')
@Controller('prosper')
export class ProsperController {
  constructor(private readonly service: ProsperService) {}

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
  async retire(@Body() payload: { userId: string }) {
    // return this.service.retireUser(payload.userId);
  }

  @Get('users/:userId/balances')
  async userBalances(@Param('userId') userId: string) {
    return this.service.getBalance(userId);
  }

  @Get('users/:userId/transactions')
  async userTransactions(
    @Param('userId') userId: string,
    @Body() payload: GetTransactionsDto,
  ) {
    payload.userId = userId;
    return this.service.getTransactions(payload);
  }
}
