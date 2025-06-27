import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { TransferService } from 'src/modules/transfer/transfer.service';
import {
  CheckBalanceResponseDto,
  DepositRequestResponseDto,
  MakeWithdrawRequestDto,
  MovementReportRequestDto,
  MovementReportResponseDto,
  WithdrawResponseDto,
} from 'src/modules/transfer/dtos/transfer.dto';

@ApiTags('transfer')
@ApiBearerAuth()
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * Check balance
   */
  @Get('balance')
  async checkBalance(@Request() req): Promise<CheckBalanceResponseDto> {
    const userId = req.user.id;
    return this.transferService.checkBalance(userId);
  }

  /**
   * Withdraw funds
   */
  @Post('withdraw')
  async makeWithdraw(
    @Request() req,
    @Body() payload: MakeWithdrawRequestDto,
  ): Promise<WithdrawResponseDto> {
    const userId = req.user.id;
    return this.transferService.makeWithdraw(userId, payload);
  }

  /**
   * Deposit request
   */
  @Get('deposit')
  async requestDeposit(@Request() req): Promise<DepositRequestResponseDto> {
    const userId = req.user.id;
    return this.transferService.requestDeposit(userId);
  }

  /**
   * Movement report with pagination
   */
  @Get('report')
  @ApiQuery({ name: 'page', required: true, type: Number })
  @ApiQuery({ name: 'limit', required: true, type: Number })
  async movementReport(
    @Request() req,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 10,
  ): Promise<MovementReportResponseDto> {
    const userId = req.user.id;
    const payload: MovementReportRequestDto = {
      page,
      limit,
    };
    return this.transferService.movementReport(userId, payload);
  }
}
