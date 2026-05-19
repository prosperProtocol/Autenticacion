import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserEmailDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CashinDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  alfredEmail: string;

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
