import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  ValidateNested,
  IsDate,
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { WalletStatus } from '../../../entities/wallets';

export class BalancesDto {
  @ApiProperty({ type: String, description: 'Asset symbol' })
  @IsString()
  asset: string;

  @ApiProperty({ type: Number, description: 'Balance amount' })
  @IsNumber()
  balance: number;

  @ApiProperty({
    type: String,
    description: 'Last updated timestamp (ISO)',
    required: false,
  })
  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}

export class CreateWalletDto {
  @ApiProperty({ type: String, description: 'Prosper identifier' })
  @IsString()
  prosperId: string;

  @ApiProperty({ type: String, description: 'Wallet address' })
  @IsString()
  address: string;

  @ApiProperty({ type: String, description: 'Wallet secret' })
  @IsString()
  secret: string;

  @ApiProperty({
    type: () => BalancesDto,
    isArray: true,
    description: 'Balances array',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BalancesDto)
  balances?: BalancesDto[];

  @ApiProperty({
    enum: WalletStatus,
    description: 'Wallet status',
    required: false,
  })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;
}

export class UpdateWalletDto {
  @ApiProperty({ type: Number, description: 'Wallet id' })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  id!: number;

  @ApiProperty({
    type: () => BalancesDto,
    isArray: true,
    description: 'Balances array',
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BalancesDto)
  balances?: BalancesDto[];

  @ApiProperty({
    enum: WalletStatus,
    description: 'Wallet status',
    required: false,
  })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;
}

