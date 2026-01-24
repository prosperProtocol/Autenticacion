import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsPositive,
  IsNotEmpty,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  TransferStatus,
  TxType,
  WebhookStatus,
} from 'src/entities/transacciones.entity';

export class CreateTransaccionDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ type: String })
  @IsString()
  asset: string;

  @ApiProperty({ type: String })
  @IsString()
  from: string;

  @ApiProperty({ type: String })
  @IsString()
  to: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({ enum: TransferStatus, required: false })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @ApiProperty({ enum: TxType })
  @IsEnum(TxType)
  txType!: TxType;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiProperty({ enum: WebhookStatus })
  @IsEnum(WebhookStatus)
  webhookStatus!: WebhookStatus;

  @ApiProperty({ type: Number })
  @IsOptional()
  @IsNumber()
  walletFromId!: number;

  @ApiProperty({ type: Number })
  @IsOptional()
  @IsNumber()
  walletToId?: number;

  @IsOptional()
  @IsObject()
  extra?: any;
}

export class UpdateTransaccionDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @IsNotEmpty()
  id!: number;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({ enum: TransferStatus, required: false })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @ApiProperty({ enum: TxType, required: false })
  @IsOptional()
  @IsEnum(TxType)
  txType?: TxType;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiProperty({ enum: WebhookStatus, required: false })
  @IsOptional()
  @IsEnum(WebhookStatus)
  webhookStatus?: WebhookStatus;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  walletFromId?: number;

  @ApiProperty({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  walletToId?: number;

  @IsOptional()
  @IsObject()
  extra?: any;
}

export class PaginationRequestDto {
  @ApiProperty({
    description: 'Numero de Reportes por pagina',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  limit?: number;

  @ApiProperty({
    description: 'Pagina del reporte',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page?: number;
}

export class GetTransactionsDto extends PaginationRequestDto {
  @ApiProperty({ description: 'User id (prosperId) que filtra transacciones' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false, description: 'Fecha de creación (ISO)' })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiProperty({ required: false, description: 'Estado de la transacción' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Tipo de transacción' })
  @IsOptional()
  @IsString()
  txType?: string;
}

export class TransactionWalletDto {
  @ApiProperty()
  @IsString()
  prosperId: string;

  @ApiProperty()
  @IsString()
  address: string;
}

export class TransactionItemDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  from: string;

  @ApiProperty()
  @IsString()
  to: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiProperty()
  @IsString()
  txType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  txHash?: string;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiProperty()
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ type: TransactionWalletDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionWalletDto)
  walletFrom?: TransactionWalletDto;

  @ApiProperty({ type: TransactionWalletDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionWalletDto)
  walletTo?: TransactionWalletDto;
}

export class FindByFieldsResponse {
  @ApiProperty({ type: [TransactionItemDto] })
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  page?: number;
}
