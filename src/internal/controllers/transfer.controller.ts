import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';

import { SkipJwtAuth } from 'src/common/decorators/skip-guard.decorator';
import { MakeTransactionDto } from 'src/common/dtos/stellar.dto';
import { TransferService } from 'src/modules/transfer/transfer.service';

@ApiTags('Back - Transfer')
@Controller('transfer')
export class BackTransferController {
  constructor(private readonly transferService: TransferService) {}

  @SkipJwtAuth()
  @ApiOperation({
    summary: 'Realizar una Transaction en la red de Stellar con USDC',
  })
  @Post('makeTransaction')
  async makeTransaction(@Body() payload: MakeTransactionDto) {
    try {
      return await this.transferService.makeTransaction(payload);
    } catch (error) {
      Logger.error(error);
      throw new HttpException(error.message, HttpStatus.FORBIDDEN, {
        cause: new Error(error.message),
      });
    }
  }
}
