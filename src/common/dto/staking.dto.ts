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

export class CreateStakingDto {
  @ApiProperty({
    description: 'Identificador único de la posición de staking',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty({
    description: 'La cuenta de Stellar del usuario titular',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({
    description: 'El monto de capital inicial bloqueado',
    type: Number,
  })
  @IsNumber()
  @IsPositive()
  principalAmount: number;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la posición',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  start: string;

  @ApiProperty({
    description: 'Fecha de vencimiento del capital principal',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  maturityPrincipal: string;

  @ApiPropertyOptional({
    description: 'Cronograma de pagos de la renta/interés',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  scheduleInterest?: any[];

  @ApiProperty({ description: 'La tasa de interés pactada', type: Number })
  @IsNumber()
  rate: number;

  @ApiProperty({
    description: 'Identificador del activo en el que se pagará el interés',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  payoutAssetInterest: string;

  @ApiProperty({
    description: 'Identificador del activo en el que se devolverá el capital',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  payoutAssetPrincipal: string;

  @ApiPropertyOptional({
    description: 'Cantidad total de intereses reclamados',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  claimedInterest?: number;

  @ApiPropertyOptional({
    description: 'Monto del capital principal devuelto',
    type: Number,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  principalRedeemed?: number;
}
