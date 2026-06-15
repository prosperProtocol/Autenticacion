import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { InteresCada24Horas, ProximaFechaMonto } from 'src/entities/staking.entity';

export class CreateStakingDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Wallet o cuenta de Stellar del usuario' })
  @IsString()
  @IsNotEmpty()
  wallet!: string;

  @ApiProperty({ description: 'Hash del depósito' })
  @IsString()
  @IsNotEmpty()
  hashDeposito!: string;

  @ApiProperty({ description: 'Hash de la transacción de staking' })
  @IsString()
  @IsNotEmpty()
  hashStaking!: string;

  @ApiProperty({ description: 'Memo de la transacción de staking' })
  @IsNumber()
  @IsPositive()
  memoStaking!: number;

  @ApiProperty({ description: 'Monto de capital inicial bloqueado' })
  @IsNumber()
  @IsPositive()
  principalAmount!: number;

  @ApiProperty({ description: 'Fecha y hora de inicio de la posición', format: 'date-time' })
  @IsDateString()
  start!: string;

  @ApiProperty({ description: 'Fecha de vencimiento del capital principal', format: 'date-time' })
  @IsDateString()
  maturityPrincipal!: string;

  @ApiPropertyOptional({ description: 'Cronograma de pagos de la renta/interés' })
  @IsOptional()
  @IsArray()
  scheduleInterest?: any[];

  @ApiProperty({ description: 'Porcentaje anual' })
  @IsNumber()
  porcentajeAnual!: number;

  @ApiProperty({ description: 'Identificador del activo en el que se devolverá el capital' })
  @IsString()
  @IsNotEmpty()
  payoutAssetPrincipal!: string;

  @ApiProperty({ description: 'Identificador del activo en el que se pagará el interés' })
  @IsString()
  @IsNotEmpty()
  payoutAssetInterest!: string;

  @ApiProperty({ description: 'Identificador del token de interés' })
  @IsString()
  @IsNotEmpty()
  tokenInteres!: string;

  @ApiPropertyOptional({ description: 'Cantidad total de intereses reclamados', default: 0 })
  @IsOptional()
  @IsNumber()
  claimedInterest?: number;

  @ApiPropertyOptional({ description: 'Intereses acumulados', default: 0 })
  @IsOptional()
  @IsNumber()
  interesesAcumulados?: number;

  @ApiPropertyOptional({ description: 'Monto proyectado', default: 0 })
  @IsOptional()
  @IsNumber()
  proyectado?: number;

  @ApiProperty({ description: 'ID del contrato' })
  @IsString()
  @IsNotEmpty()
  contractoId!: string;

  @ApiPropertyOptional({ description: 'Monto del capital principal devuelto', default: 0 })
  @IsOptional()
  @IsNumber()
  principalRedeemed?: number;

  @ApiPropertyOptional({ description: 'Próxima fecha y monto' })
  @IsOptional()
  proximaFechaMonto?: ProximaFechaMonto;

  @ApiPropertyOptional({ description: 'Interés cada 24 horas' })
  @IsOptional()
  @IsArray()
  interesCada24Horas?: InteresCada24Horas[];
}
