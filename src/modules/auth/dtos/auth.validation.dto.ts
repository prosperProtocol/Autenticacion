import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthLoginRequest {
  @ApiProperty({ example: 'name@company.domain' })
  @IsNotEmpty()
  @IsString()
  email: string;
}

export class AuthLoginResponse {
  @ApiProperty({ example: 'some-token-request' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class AuthTokenRequest {
  @ApiProperty({ example: 'some-token-request' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: '1111' })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class AuthTokenResponse {
  @ApiProperty({ example: 'jwt-token-format' })
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}
