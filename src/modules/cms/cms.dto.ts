import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateUserEmailDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CashinDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prosperId: string;

  @ApiProperty({
    enum: ['end', 'month'],
    description:
      'selecciona la forma de liquidación de la ganancia (a) al final del periodo `end` (b) liquidación de ganancia mes a mes `month`',
    example: 'end',
  })
  @IsEnum(['end', 'month'])
  @IsNotEmpty()
  cashin: 'end' | 'month';
}

export class CMSTreasuryDto {
  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  balanceUSDC: string;

  @ApiProperty()
  @IsString()
  balanceARSA: string;
}

export class CheckTreasuryBalanceResponse {
  @ApiProperty({ type: CMSTreasuryDto })
  @ValidateNested()
  @Type(() => CMSTreasuryDto)
  treasury: CMSTreasuryDto;
}
