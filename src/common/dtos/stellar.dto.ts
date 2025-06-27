import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class StellarTransactionsDto {
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
  @IsNotEmpty()
  memo: string;

  @ApiProperty({
    description: 'Fecha de creación de la transacción',
  })
  @IsISO8601()
  @IsNotEmpty()
  createdAt: string;
}

export class StellarOperationDto {
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
    example: 50.0,
    description: 'Cantidad a retirar',
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Asset transferido',
  })
  @IsString()
  @IsNotEmpty()
  asset: string;
}

export class CheckStellarOperationsDto extends IntersectionType(
  StellarTransactionsDto,
  StellarOperationDto,
) {}

export class SendStellarTransactionDto {
  @ApiProperty({
    description: 'hash de transacción en la red Stellar',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({
    description: 'Si fue exitoso o no',
  })
  @IsBoolean()
  @IsNotEmpty()
  successful: boolean;
}

export class CreateAccountWithUSDCDto {
  @ApiProperty({
    description: 'Dirección de la cuenta creada',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({
    description: 'Secret key de la cuenta creada',
  })
  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @ApiProperty({
    description: 'Si fue exitoso o no',
  })
  @IsBoolean()
  @IsNotEmpty()
  successful: boolean;
}

export class VerifyAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({required: false})
  @IsBoolean()
  @IsOptional()
  prod?: boolean;
}

export class MakeTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourcePrivateKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverPublicKey: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({required: false, description: 'Optional, Memo' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class MakeCircleTransactionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  apiSecret: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({required: false, description: 'Optional, Memo' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class MakeDistributionTxDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourcePrivateKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverPublicKey: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CheckAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  memo: string;

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  network?: string = 'test';
}

export class checkAccountDetailsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({
    minimum: 10,
    default: 10,
    maximum: 100,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(10)
  @Max(100)
  limit: number;

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  network?: string = 'test';
}

export class CheckStellarNetworkDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  network?: string = 'test';
}

export class CheckStellarOperationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({required: false})
  @IsString()
  @IsOptional()
  network?: string = 'test';
}

export class GetSep10ChallengeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientAccountID: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientDomain: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  homeDomain: string;
}

export class SignSep10ChallengeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tx: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  secret: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientDomain: string;
}
export class ReadChallengeTxDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transaction: string;
}
