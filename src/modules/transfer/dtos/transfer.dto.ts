import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Transacciones } from 'src/common/entities/transacciones.entity';

import { UserStatus } from 'src/common/entities/user.entity';

export class MemoDto {
  @ApiProperty({
    description: 'Memo de la cuenta',
    example: 'Saldo actualizado',
  })
  @IsString()
  @IsNotEmpty()
  memo: string;
}

export class DepositRequestResponseDto extends MemoDto {
  @ApiProperty({
    description: 'Dirección de la cuenta de recolección',
    example: 'GABCD1234567890',
  })
  @IsString()
  @IsNotEmpty()
  collectingWallet: string;
}

export class WithdrawResponseDto extends MemoDto {
  @ApiProperty({
    description: 'Balance del usuario con hasta dos decimales',
    example: 150.75,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsNotEmpty()
  balance: number;

  @ApiProperty({
    description: 'Estado del usuario',
    enum: UserStatus,
  })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}

export class CheckBalanceResponseDto extends WithdrawResponseDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 123,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  id: number;
}

export class MakeWithdrawRequestDto {
  @ApiProperty({
    example: 50.0,
    description: 'Cantidad a retirar',
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}

export class checkStellarOperationDto extends MakeWithdrawRequestDto {
  @ApiProperty({
    description: 'Hash de la transacción en la red Stellar',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({
    description: 'Memo incluido en la transacción',
  })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiProperty({
    description: 'Fecha de creación de la transacción',
  })
  @IsISO8601()
  @IsNotEmpty()
  createdAt: string;

  @ApiProperty({
    description: 'Cuenta de origen',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    description: 'Cuenta de destino',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Asset transferido',
  })
  @IsString()
  @IsNotEmpty()
  asset: string;
}

export class MovementReportRequestDto {
  @ApiProperty({
    description: 'Numero de Reportes por pagina',
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  limit: number;

  @ApiProperty({
    description: 'Pagina del reporte',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  page: number;
}

export class MovementReportResponseDto {
  @ApiProperty({
    description: 'Lista de Transacciones',
  })
  data: Transacciones[];

  @ApiProperty({
    description: 'Total de transacciones',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  total: number;
}
