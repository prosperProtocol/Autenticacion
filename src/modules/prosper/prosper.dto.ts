import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFundDto {
  @ApiProperty({ description: 'Cantidad inicial a emitir', required: false })
  @IsString()
  @IsOptional()
  initialAmount?: string;

  @ApiProperty({
    description: 'Dominio home para SEP-10 / well-known',
    required: false,
  })
  @IsString()
  @IsOptional()
  homeDomain?: string;

  @ApiProperty({
    description: 'Identificador de la transacción en Prosper',
    required: false,
  })
  @IsString()
  @IsOptional()
  prosperTxId?: string;
}

export class CreateFundResponse {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secretKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  homeDomain?: string;

  @ApiProperty({
    description: 'Hash de la transacción en la red Stellar',
    required: false,
  })
  @IsString()
  @IsOptional()
  txHash?: string;

  @ApiProperty({
    description: 'Si la transacción fue exitosa',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  successful?: boolean;

  @ApiProperty({
    description: 'Número de ledger donde quedó incluida la tx',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  ledger?: number;
}

export class MintDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ required: false })
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

  @ApiProperty({
    description: 'Identificador de la transacción en Prosper',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  prosperTxId: string;
}

export class DepositDto {
  @ApiProperty({
    description: 'Identificador de la transacción en Prosper',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  prosperTxId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    description:
      'Identificador de referencia del usuario en el sistema externo, OPCIONAL',
  })
  @IsString()
  @IsOptional()
  userReferenceId?: string;

  @ApiProperty({
    required: false,
    description:
      'Dirección de la wallet del usuario, valor interno del protocolo, OPCIONAL',
  })
  @IsString()
  @IsOptional()
  address?: string;
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

  @ApiProperty({
    description: 'Identificador de la transacción en Prosper',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  prosperTxId: string;

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
  prosperId: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  balanceUSDC: string;
}

export class TreasuryDto {
  @ApiProperty()
  @IsString()
  prosperId: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  balanceUSDC: string;
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
  balanceUSDC: string;

  @ApiProperty()
  @IsString()
  balanceXLM: string;
}

export class CheckUserResponse extends GetBalanceResponse {
  @ApiProperty()
  @IsString()
  secret: string;
}
