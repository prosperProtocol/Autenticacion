import { IsString, IsNotEmpty, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DocType {
  idCardFront = 'idCardFront',
  idCardBack = 'idCardBack',
}

export class UploadedDocDto {
  @ApiProperty({
    enum: DocType,
    description: 'Document type',
  })
  @IsEnum(DocType)
  docType: DocType;
}

export class ConfirmDetailsDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'male', description: 'Gender identity of the user' })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Birthdate in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'birthdate must be in YYYY-MM-DD format',
  })
  birthdate: string;
}

export class UpdateAddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Springfield' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Illinois' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '62704' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}
