import {
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { User } from 'src/common/entities/user.entity';

import { SkipJwtAuth } from 'src/common/decorators/skip-guard.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthTokenRequest,
  AuthTokenResponse,
} from 'src/modules/auth/dtos/auth.validation.dto';
import {
  ConfirmDetailsDto,
  UpdateAddressDto,
  UploadedDocDto,
} from 'src/modules/auth/dtos/kyc.dto';
import { AuthService } from 'src/modules/auth/auth.service';

@ApiTags('KYC')
@Controller('auth')
export class KycController {
  public className = this.constructor.name;
  private readonly logger = new Logger(this.className);
  constructor(private readonly authService: AuthService) {}

  @SkipJwtAuth()
  @Post('/passwordless-login')
  @ApiOkResponse({
    description: 'Request login code',
    type: AuthLoginResponse,
  })
  async passwordlessLogin(@Body() body: AuthLoginRequest) {
    return this.authService.passwordlessLogin(body.email);
  }

  @SkipJwtAuth()
  @Post('/passwordless-token')
  @ApiOkResponse({
    description: 'Request access token',
    type: AuthTokenResponse,
  })
  async passwordlessToken(@Body() body: AuthTokenRequest) {
    return this.authService.passwordlessToken(body.code, body.token);
  }

  @SkipJwtAuth()
  @Post('/signup')
  @ApiOkResponse({
    description: 'signup',
    type: AuthLoginResponse,
  })
  async signup(@Body() payload: AuthLoginRequest) {
    return this.authService.signup(payload);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cargar documentos KYC' })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        doc: {
          type: 'string',
          format: 'binary',
        },
        docType: {
          type: 'string',
          enum: ['idCardFront', 'idCardBack'],
          description: 'ENUM: idCardFront, idCardBack',
        },
      },
      required: ['doc', 'docType'],
    },
  })
  @UseInterceptors(FileInterceptor('doc'))
  @Put('register/uploadDocument')
  async updateUserkycidcard(
    @Request() req,
    @Body() payload: UploadedDocDto,
    @UploadedFile() doc: Express.Multer.File,
  ) {
    try {
      return await this.authService.uploadDocument(
        req.user.id,
        doc,
        payload.docType,
      );
    } catch (error) {
      this.logger.error(
        `Error uploading KYC document for user ${req.user.id}`,
        error.stack,
      );
      throw new ForbiddenException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm user personal details (KYC)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: ConfirmDetailsDto })
  @ApiResponse({
    status: 200,
    description: 'User details updated successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Put('confirmDetails')
  async confirmDetails(
    @Request() req,
    @Body() dto: ConfirmDetailsDto,
  ): Promise<User> {
    try {
      return this.authService.confirmDetails(req.user.id, dto);
    } catch (error) {
      this.logger.error(
        `Failed to confirm details for user ${req.user.id}`,
        error.stack,
      );
      throw new ForbiddenException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('updateAddress')
  @ApiOperation({ summary: 'Update user address' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: User,
  })
  @ApiResponse({ status: 403, description: 'Forbidden: update failed' })
  async updateAddress(
    @Request() req,
    @Body() dto: UpdateAddressDto,
  ): Promise<User> {
    try {
      return await this.authService.updateAddress(req.user.id, dto);
    } catch (error) {
      this.logger.error(
        `Failed to update address for user ${req.user.id}`,
        error.stack,
      );
      throw new ForbiddenException(error.message);
    }
  }
}
