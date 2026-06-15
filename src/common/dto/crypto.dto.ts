import { LoggerService } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export type DecryptPrivateKeyOptions = {
  throwOnError?: boolean;
  logger?: Pick<LoggerService, 'warn' | 'error'>;
};

export class EncryptPrivateKeyDto {
  @ApiProperty({
    description: 'Clave privada de la cuenta Stellar',
    example:
      'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  privateKey!: string;
}

