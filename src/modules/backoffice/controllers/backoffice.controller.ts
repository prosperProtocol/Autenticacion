import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Logger,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BackOfficeService } from '../backoffice.service';
import {
  ActiveUserDto,
  FilteredTransactionDto,
  RejectUserDto,
} from '../dto/back.dto';
import { ActiveUsersResponse } from 'src/common/interfaces/backoffice/ActiveUsers.interface';

@ApiTags('backoffice')
@ApiBearerAuth()
@Controller('backoffice')
export class BackOfficeController {
  public readonly name = this.constructor.name;
  protected logger: Logger;
  constructor(private readonly backOfficeService: BackOfficeService) {
    this.logger = new Logger(this.name, {
      timestamp: true,
    });
  }

  /**
   * 1. Listado de usuarios activos
   */
  @Get('users/active')
  @ApiQuery({ name: 'userId', type: Number, required: false })
  async getActiveUsers(
    @Query('userId') userId?: number,
  ): Promise<ActiveUserDto[] | { user: ActiveUsersResponse }> {
    return userId !== undefined
      ? await this.backOfficeService.getActiveUser(userId)
      : await this.backOfficeService.getActiveUsers();
  }

  /**
   * 2. Usuarios con KYC rechazado
   */
  @Get('users/kyc-rejected')
  async getUsersWithRejectedKYC(): Promise<RejectUserDto[]> {
    return await this.backOfficeService.getUsersWithRejectedKYC();
  }

  /**
   * 3. Balance total en la wallet receptora por usuario, asset y chain
   */
  @Get('wallet/balance')
  async getCollectingWalletBalance(): Promise<
    Array<{ userId: number; asset: string; chain: string; total: number }>
  > {
    return this.backOfficeService.getCollectingWalletBalance();
  }

  /**
   * 4. Datos de cuenta por usuario
   */
  @Get('account/:userId')
  async getUserAccount(@Param('userId', ParseIntPipe) userId: number): Promise<{
    wallet: string;
    memo: string;
    balance: number;
    transactions: FilteredTransactionDto[];
  }> {
    return this.backOfficeService.getUserAccount(userId);
  }

  /**
   * 5. Listado de todas las transacciones
   */
  @Get('transactions')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getAllTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<{ transactions: FilteredTransactionDto[]; total: number }> {
    return this.backOfficeService.getAllTransactions(page, limit);
  }
}
