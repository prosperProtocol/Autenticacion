import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWalletResponse {
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

export class CreateProsperIssuerResponse {
  @ApiProperty({
    description: 'Dirección pública del issuer creado',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({
    description: 'Secret key del issuer creado',
    required: false,
  })
  @IsString()
  @IsOptional()
  secretKey?: string;

  @ApiProperty({
    description: 'Indica si el issuer ya estaba configurado en configuración',
  })
  @IsBoolean()
  @IsNotEmpty()
  alreadyConfigured: boolean;

  @ApiProperty({
    description: 'Dominio asociado al issuer',
    required: false,
  })
  @IsString()
  @IsOptional()
  homeDomain?: string;
}

export class SubmitTxResponse {
  @ApiProperty({
    description: 'Hash de la transacción en la red Stellar',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({
    description: 'Número de ledger donde quedó incluida la tx',
  })
  @IsNumber()
  @IsNotEmpty()
  ledger: number;

  @ApiProperty({
    description: 'Si la transacción fue exitosa',
  })
  @IsBoolean()
  @IsNotEmpty()
  successful: boolean;
}

export class IssueProsperToTreasuryDto {
  @ApiProperty({
    description: 'Secret del issuer que emite PROSPER',
  })
  @IsString()
  @IsNotEmpty()
  issuerSecret: string;

  @ApiProperty({
    description: 'Dirección pública del treasury destino',
  })
  @IsString()
  @IsNotEmpty()
  treasuryPublic: string;

  @ApiProperty({
    description: 'Cantidad a emitir (string)',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsBoolean()
  @IsNotEmpty()
  isTestnet: boolean;
}

export class GetAccountBalancesDto {
  @ApiProperty({
    description: 'Dirección/de cuenta a consultar',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Si la consulta es sobre testnet (opcional, por defecto true)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isTestnet?: boolean = true;
}

export class GetAccountBalancesResponse {
  @ApiProperty({
    description: 'Dirección consultada',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Balance en XLM (native) como string',
  })
  @IsString()
  @IsNotEmpty()
  balanceXLM: string;

  @ApiProperty({
    description: 'Balance en USDC como string',
  })
  @IsString()
  @IsNotEmpty()
  balanceUSDC: string;
}

export class MakeProsperTransactionDto {
  @ApiProperty({
    description: 'Secret key del emisor (source) que firma la transacción',
  })
  @IsString()
  @IsNotEmpty()
  sourcePrivateKey: string;

  @ApiProperty({
    description: 'Public key del receptor',
  })
  @IsString()
  @IsNotEmpty()
  receiverPublicKey: string;

  @ApiProperty({
    description: 'Cantidad a transferir (string o number en cadena)',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Si la operación es sobre testnet',
  })
  @IsBoolean()
  @IsNotEmpty()
  isTestnet: boolean;

  @ApiProperty({ required: false, description: 'Memo opcional' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class MakeProsperTransactionResponse {
  @ApiProperty({
    description: 'Hash de la transacción en la red Stellar',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({
    description: 'Si la transacción fue exitosa',
  })
  @IsBoolean()
  @IsNotEmpty()
  successful: boolean;

  @ApiProperty({
    description: 'Número de ledger donde quedó incluida la tx',
  })
  @IsNumber()
  @IsNotEmpty()
  ledger: number;
}

/*
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

*/
