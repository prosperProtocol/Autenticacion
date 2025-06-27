import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Sep10AuthPostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transaction: string;
}

export class Sep10AuthGetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_domain: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  home_domain: string;
}

export class WalletBalancesDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  USDC: number;
}

export class ExchangeRateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fiatCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rate: string;
}

export class GetWidgetUrlDto {
  @ApiProperty()
  @Type(() => WalletBalancesDto)
  @ValidateNested({ each: true })
  walletBalances: WalletBalancesDto;

  @ApiProperty()
  @Type(() => ExchangeRateDto)
  @ValidateNested({ each: true })
  exchangeRate: ExchangeRateDto;
}

export class VessoWebhookKYCDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userWallet: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  failReason?: string;
}

export class VessoWebhookPrismaTDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  idTx: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  failReason?: string;
}
