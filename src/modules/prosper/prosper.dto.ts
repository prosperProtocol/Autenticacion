import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFundDto {
  @ApiProperty({ description: 'Cantidad inicial a emitir' })
  @IsString()
  @IsNotEmpty()
  initialAmount: string;

  @ApiProperty({ description: 'Dominio home para SEP-10 / well-known' })
  @IsString()
  @IsNotEmpty()
  homeDomain: string;
}

export class MintDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prosperTxId: string;
}

export class NewUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userReferenceId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  prosperTxId?: string;
}

export class DepositDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  userReferenceId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  prosperTxId?: string;
}

export class TransferMetadataDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractRef?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transferType?: 'SALE' | 'LOAN' | 'GIFT';
}

export class TransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  prosperTxId?: string;

  @ApiProperty({ type: TransferMetadataDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransferMetadataDto)
  metadata?: TransferMetadataDto;
}

export class AssetInfoDto {
  @ApiProperty()
  @IsString()
  assetCode: string;

  @ApiProperty()
  @IsString()
  issuer: string;
}

export class IssueDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  assetCode: string;
}

export class TreasuryDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  balance: string;
}

export class GetAssetsResponse {
  @ApiProperty({ type: IssueDto })
  @ValidateNested()
  @Type(() => IssueDto)
  issue: IssueDto;

  @ApiProperty({ type: TreasuryDto })
  @ValidateNested()
  @Type(() => TreasuryDto)
  treasury: TreasuryDto;
}

export class GetBalanceResponse {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  balanceProsper: string;

  @ApiProperty()
  @IsString()
  balanceXLM: string;
}

export class CheckUserResponse extends GetBalanceResponse {
  @ApiProperty()
  @IsString()
  secret: string;
}
